/**
 * Cloudflare Pages Function — API proxy for /api/*
 *
 * Proxies requests to accounts.marathondb.gg, forwarding headers and cookies.
 * This lets the frontend call /api/... instead of the cross-origin URL,
 * avoiding CORS issues during local development with wrangler pages dev.
 */
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const target = 'https://accounts.marathondb.gg' + url.pathname.replace(/^\/api/, '') + url.search;

    const headers = new Headers(context.request.headers);
    headers.delete('host');

    const resp = await fetch(target, {
        method: context.request.method,
        headers,
        body: context.request.method !== 'GET' && context.request.method !== 'HEAD'
            ? context.request.body
            : undefined,
    });

    const respHeaders = new Headers(resp.headers);
    // Remove CORS headers from upstream — let the browser treat this as same-origin
    respHeaders.delete('access-control-allow-origin');
    respHeaders.delete('access-control-allow-credentials');

    return new Response(resp.body, {
        status: resp.status,
        headers: respHeaders,
    });
}
