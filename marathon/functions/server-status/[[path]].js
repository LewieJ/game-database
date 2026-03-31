/**
 * Cloudflare Pages Function — Marathon Server Status Reports API
 *
 * KV Namespace binding: SERVER_REPORTS
 *
 * Routes:
 *   GET  /server-status/reports   → aggregated report counts (last 24h, bucketed by 30min)
 *   POST /server-status/reports   → submit a new report { category: string }
 *   GET  /server-status/summary   → current status summary
 *
 * KV key scheme:
 *   report:{timestamp_bucket}  → JSON { counts: { category: number }, total: number }
 *   rate:{ip_hash}:{bucket}    → "1" (rate limit flag, TTL 5min)
 */

const VALID_CATEGORIES = [
    'connection',     // Can't connect to servers
    'matchmaking',    // Stuck in matchmaking / long queue
    'lag',            // High latency / rubber-banding
    'disconnects',    // Getting disconnected mid-game
    'login',          // Can't log in / authentication issues
    'crash',          // Game crashes
    'store',          // In-game store not working
    'other'           // Other issues
];

const BUCKET_SIZE_MS = 30 * 60 * 1000;   // 30 minutes
const LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW = 5 * 60;        // 5 min in seconds (KV TTL)

function getBucket(ts) {
    return Math.floor(ts / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
}

// Simple hash of IP to avoid storing raw IPs
async function hashIP(ip) {
    const data = new TextEncoder().encode(ip + ':marathon-status-salt');
    const hash = await crypto.subtle.digest('SHA-256', data);
    const arr = new Uint8Array(hash);
    return Array.from(arr.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
}

function jsonResponse(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
        },
    });
}

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const path = url.pathname.replace(/^\/server-status/, '').replace(/\/$/, '');

    // GET /server-status/reports → aggregated 24h data
    if (request.method === 'GET' && path === '//marathon/reports') {
        return handleGetReports(env, origin);
    }

    // POST /server-status/reports → submit a report
    if (request.method === 'POST' && path === '//marathon/reports') {
        return handlePostReport(request, env, origin);
    }

    // GET /server-status/summary → status summary
    if (request.method === 'GET' && path === '//marathon/summary') {
        return handleGetSummary(env, origin);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
}

async function handleGetReports(env, origin) {
    const now = Date.now();
    const currentBucket = getBucket(now);
    const buckets = [];

    // Collect last 48 buckets (24 hours)
    for (let i = 47; i >= 0; i--) {
        const bucketTs = currentBucket - (i * BUCKET_SIZE_MS);
        buckets.push(bucketTs);
    }

    // Fetch all buckets from KV in parallel
    const entries = await Promise.all(
        buckets.map(async (ts) => {
            const key = 'report:' + ts;
            const val = await env.SERVER_REPORTS.get(key, { type: 'json' });
            return {
                timestamp: ts,
                time: new Date(ts).toISOString(),
                counts: val ? val.counts : {},
                total: val ? val.total : 0,
            };
        })
    );

    return jsonResponse({ buckets: entries, bucketSizeMinutes: 30 }, 200, origin);
}

async function handlePostReport(request, env, origin) {
    // Rate limiting by IP
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const ipHash = await hashIP(ip);
    const rateBucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW * 1000));
    const rateKey = 'rate:' + ipHash + ':' + rateBucket;

    const existing = await env.SERVER_REPORTS.get(rateKey);
    if (existing) {
        return jsonResponse({ error: 'Rate limited — you can report again in a few minutes' }, 429, origin);
    }

    // Parse body
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400, origin);
    }

    const category = body.category;
    if (!category || !VALID_CATEGORIES.includes(category)) {
        return jsonResponse({
            error: 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', ')
        }, 400, origin);
    }

    // Write rate limit flag (5 min TTL)
    await env.SERVER_REPORTS.put(rateKey, '1', { expirationTtl: RATE_LIMIT_WINDOW });

    // Increment the bucket
    const now = Date.now();
    const bucketTs = getBucket(now);
    const bucketKey = 'report:' + bucketTs;

    // Read current bucket data
    let data = await env.SERVER_REPORTS.get(bucketKey, { type: 'json' });
    if (!data) {
        data = { counts: {}, total: 0 };
    }

    data.counts[category] = (data.counts[category] || 0) + 1;
    data.total = (data.total || 0) + 1;

    // Write back with 25h TTL (auto-cleanup)
    await env.SERVER_REPORTS.put(bucketKey, JSON.stringify(data), {
        expirationTtl: 25 * 60 * 60,
    });

    return jsonResponse({ success: true, category: category, bucket: bucketTs }, 200, origin);
}

async function handleGetSummary(env, origin) {
    const now = Date.now();
    const currentBucket = getBucket(now);

    // Last 2 hours = 4 buckets
    let recentTotal = 0;
    let recentCounts = {};
    for (let i = 0; i < 4; i++) {
        const ts = currentBucket - (i * BUCKET_SIZE_MS);
        const val = await env.SERVER_REPORTS.get('report:' + ts, { type: 'json' });
        if (val) {
            recentTotal += val.total;
            for (const [cat, count] of Object.entries(val.counts)) {
                recentCounts[cat] = (recentCounts[cat] || 0) + count;
            }
        }
    }

    // Last 24h total
    let dayTotal = 0;
    for (let i = 0; i < 48; i++) {
        const ts = currentBucket - (i * BUCKET_SIZE_MS);
        const val = await env.SERVER_REPORTS.get('report:' + ts, { type: 'json' });
        if (val) dayTotal += val.total;
    }

    // Determine status level
    let status = 'operational';
    if (recentTotal >= 50) status = 'major-outage';
    else if (recentTotal >= 20) status = 'degraded';
    else if (recentTotal >= 5) status = 'minor-issues';

    return jsonResponse({
        status,
        recentReports: recentTotal,
        dayReports: dayTotal,
        recentBreakdown: recentCounts,
        thresholds: { operational: 0, 'minor-issues': 5, degraded: 20, 'major-outage': 50 },
    }, 200, origin);
}
