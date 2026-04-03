// ── Server-Status API ───────────────────────────────────────────────
const VALID_CATEGORIES = [
  'connection','matchmaking','lag','disconnects','login','crash','store','other'
];
const BUCKET_SIZE_MS = 30 * 60 * 1000;
const LOOKBACK_MS   = 24 * 60 * 60 * 1000;
const RATE_LIMIT_TTL = 5 * 60; // seconds

function getBucket(ts) { return Math.floor(ts / BUCKET_SIZE_MS) * BUCKET_SIZE_MS; }

async function hashIP(ip) {
  const data = new TextEncoder().encode(ip + ':marathon-status-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash).slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function handleServerStatus(request, env) {
  const url    = new URL(request.url);
  const origin = request.headers.get('Origin') || '*';

  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const path = url.pathname.replace(/^\/server-status/, '').replace(/\/$/, '');

  // GET /server-status/reports
  if (request.method === 'GET' && path === '/marathon/reports') {
    const now = Date.now();
    const cur = getBucket(now);
    const entries = await Promise.all(
      Array.from({ length: 48 }, (_, i) => cur - ((47 - i) * BUCKET_SIZE_MS)).map(async ts => {
        const val = await env.SERVER_REPORTS.get('report:' + ts, { type: 'json' });
        return { timestamp: ts, time: new Date(ts).toISOString(), counts: val ? val.counts : {}, total: val ? val.total : 0 };
      })
    );
    return json({ buckets: entries, bucketSizeMinutes: 30 }, 200, origin);
  }

  // POST /server-status/reports
  if (request.method === 'POST' && path === '/marathon/reports') {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const ipHash     = await hashIP(ip);
    const rateBucket = Math.floor(Date.now() / (RATE_LIMIT_TTL * 1000));
    const rateKey    = 'rate:' + ipHash + ':' + rateBucket;

    if (await env.SERVER_REPORTS.get(rateKey))
      return json({ error: 'Rate limited — you can report again in a few minutes' }, 429, origin);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, origin); }

    const category = body.category;
    if (!category || !VALID_CATEGORIES.includes(category))
      return json({ error: 'Invalid category. Must be one of: ' + VALID_CATEGORIES.join(', ') }, 400, origin);

    await env.SERVER_REPORTS.put(rateKey, '1', { expirationTtl: RATE_LIMIT_TTL });

    const now       = Date.now();
    const bucketTs  = getBucket(now);
    const bucketKey = 'report:' + bucketTs;
    let data = await env.SERVER_REPORTS.get(bucketKey, { type: 'json' }) || { counts: {}, total: 0 };
    data.counts[category] = (data.counts[category] || 0) + 1;
    data.total = (data.total || 0) + 1;
    await env.SERVER_REPORTS.put(bucketKey, JSON.stringify(data), { expirationTtl: 25 * 60 * 60 });

    return json({ success: true, category, bucket: bucketTs }, 200, origin);
  }

  // GET /server-status/summary
  if (request.method === 'GET' && path === '/marathon/summary') {
    const now = Date.now();
    const cur = getBucket(now);
    let recentTotal = 0, recentCounts = {}, dayTotal = 0;

    for (let i = 0; i < 48; i++) {
      const val = await env.SERVER_REPORTS.get('report:' + (cur - i * BUCKET_SIZE_MS), { type: 'json' });
      if (val) {
        dayTotal += val.total;
        if (i < 4) {
          recentTotal += val.total;
          for (const [c, n] of Object.entries(val.counts)) recentCounts[c] = (recentCounts[c] || 0) + n;
        }
      }
    }
    let status = 'operational';
    if (recentTotal >= 50) status = 'major-outage';
    else if (recentTotal >= 20) status = 'degraded';
    else if (recentTotal >= 5) status = 'minor-issues';

    return json({ status, recentReports: recentTotal, dayReports: dayTotal, recentBreakdown: recentCounts,
      thresholds: { operational: 0, 'minor-issues': 5, degraded: 20, 'major-outage': 50 } }, 200, origin);
  }

  return json({ error: 'Not found' }, 404, origin);
}

function rewriteCanonicalAndOgUrl(html, canonicalUrl) {
  // Replace the canonical href to match the exact incoming query URL.
  const rewritten = html.replace(
    /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}">`
  );

  // Keep social sharing URL consistent with the canonical.
  return rewritten.replace(
    /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}">`
  );
}

async function handleItemCanonicalRewrite(request, env) {
  const url = new URL(request.url);
  const siteUrl = 'https://gdb.gg/marathon';

  if (request.method !== 'GET') return null;

  const pathname = url.pathname;
  const params = url.searchParams;

  // Mods: /mods/?mod=...
  if ((pathname === '/marathon/mods/' || pathname === '/marathon/mods') && params.has('mod')) {
    const mod = params.get('mod');
    if (!mod) return null;

    const canonicalUrl = `${siteUrl}/mods/?mod=${encodeURIComponent(mod)}`;
    const assetUrl = new URL(request.url);
    assetUrl.pathname = '/marathon/mods/index.html';
    assetUrl.search = '';

    const resp = await env.ASSETS.fetch(assetUrl);
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return resp;

    const text = await resp.text();
    const newText = rewriteCanonicalAndOgUrl(text, canonicalUrl);

    const headers = new Headers(resp.headers);
    headers.delete('content-length');
    headers.set('Cache-Control', 'no-store, max-age=0');

    return new Response(newText, { status: resp.status, headers });
  }

  // Implants: /implants/?implant=...
  if ((pathname === '/marathon/implants/' || pathname === '/marathon/implants') && params.has('implant')) {
    const implant = params.get('implant');
    if (!implant) return null;

    const canonicalUrl = `${siteUrl}/implants/?implant=${encodeURIComponent(implant)}`;
    const assetUrl = new URL(request.url);
    assetUrl.pathname = '/marathon/implants/index.html';
    assetUrl.search = '';

    const resp = await env.ASSETS.fetch(assetUrl);
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return resp;

    const text = await resp.text();
    const newText = rewriteCanonicalAndOgUrl(text, canonicalUrl);

    const headers = new Headers(resp.headers);
    headers.delete('content-length');
    headers.set('Cache-Control', 'no-store, max-age=0');

    return new Response(newText, { status: resp.status, headers });
  }

  // Cores: /cores/?core=...
  if ((pathname === '/marathon/cores/' || pathname === '/marathon/cores') && params.has('core')) {
    const core = params.get('core');
    if (!core) return null;

    const canonicalUrl = `${siteUrl}/cores/?core=${encodeURIComponent(core)}`;
    const assetUrl = new URL(request.url);
    assetUrl.pathname = '/marathon/cores/index.html';
    assetUrl.search = '';

    const resp = await env.ASSETS.fetch(assetUrl);
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return resp;

    const text = await resp.text();
    const newText = rewriteCanonicalAndOgUrl(text, canonicalUrl);

    const headers = new Headers(resp.headers);
    headers.delete('content-length');
    headers.set('Cache-Control', 'no-store, max-age=0');

    return new Response(newText, { status: resp.status, headers });
  }

  return null;
}

// ── Main Worker ─────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Server-status API
    if (url.pathname.startsWith('/marathon/server-status/') || url.pathname === '/marathon/server-status') {
      return handleServerStatus(request, env);
    }

    // Option A: canonical rewrite for query-param item URLs (no redirects)
    const canonicalRewriteResp = await handleItemCanonicalRewrite(request, env);
    if (canonicalRewriteResp) return canonicalRewriteResp;

    // Everything else: serve static assets normally
    return env.ASSETS.fetch(request);
  },
};
