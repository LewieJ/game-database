/**
 * Cloudflare Pages Function — SPA catch-all for /profile/*
 *
 * Serves /profile/index.html for any /profile/* path
 * while keeping the original URL intact in the browser.
 */
export async function onRequest(context) {
    const assetUrl = new URL(context.request.url);
    assetUrl.pathname = '//marathon/profile/index.html';
    const resp = await context.env.ASSETS.fetch(assetUrl.toString(), { redirect: 'follow' });
    return new Response(resp.body, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
