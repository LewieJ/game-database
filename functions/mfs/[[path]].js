/**
 * Cloudflare Pages Function — same-origin proxy for MyFortniteStats public JSON.
 *
 * Routes (GET/HEAD only):
 *   /mfs/events-data        → https://myfortnitestats.com/api/events-data
 *   /mfs/cms-data           → https://myfortnitestats.com/api/cms-data
 *   /mfs/event-leaderboard  → …/api/event-leaderboard (query string forwarded)
 *
 * Avoids browser CORS when fortnite/events.html and event.html load calendar + leaderboards.
 * Local `serve` does not run Pages Functions — use `npx wrangler pages dev .` to test /mfs.
 */

const UPSTREAM_BASE = 'https://myfortnitestats.com/api';

const ALLOWED = new Set(['events-data', 'cms-data', 'event-leaderboard']);

function normalizeSegments(paramPath) {
  if (paramPath == null) return '';
  if (Array.isArray(paramPath)) return paramPath.filter(Boolean).join('/');
  return String(paramPath);
}

export async function onRequest(context) {
  const request = context.request;
  const seg = normalizeSegments(context.params.path);

  if (!ALLOWED.has(seg)) {
    return new Response(JSON.stringify({ error: true, message: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json;charset=utf-8' }
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const incoming = new URL(request.url);
  const target = new URL(`${UPSTREAM_BASE}/${seg}`);
  if (seg === 'event-leaderboard') {
    for (const [k, v] of incoming.searchParams) {
      target.searchParams.append(k, v);
    }
  }

  const resp = await fetch(target.toString(), {
    method: request.method,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'gdb.gg-mfs-proxy/1.0'
    }
  });

  const headers = new Headers(resp.headers);
  headers.delete('access-control-allow-origin');
  headers.delete('access-control-allow-credentials');
  if (!headers.has('cache-control')) {
    headers.set('Cache-Control', 'public, max-age=120');
  }

  return new Response(resp.body, {
    status: resp.status,
    headers
  });
}
