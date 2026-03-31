/**
 * Cloudflare Pages Function — catch-all for /player-profiles/bungie/*
 * Serves the profile page HTML while keeping the clean URL in the browser.
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
