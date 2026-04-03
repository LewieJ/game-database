'use strict';

/**
 * Opt-in AdSense for gdb.gg builds. Default client matches the shared ca-pub used across gdb.gg / partner properties.
 *
 * Enable when you have an approved AdSense client ID:
 *   RNK_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX node build/ssg.js ...
 *
 * Then re-introduce <ins class="adsbygoogle">…</ins> units in templates using
 * adUnitHead(), adUnitBlock(), etc., or restore slots from git history.
 */

const client = (process.env.RNK_ADSENSE_CLIENT || '').trim();
const enabled = /^ca-pub-\d{16}$/.test(client);

function headLoaderScript() {
    if (!enabled) return '';
    return `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`;
}

/** Standard responsive unit (returns empty when disabled). */
function adUnitResponsive(slot) {
    if (!enabled || !slot) return '';
    return `
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="${client}"
                 data-ad-slot="${slot}"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <script>try{(adsbygoogle = window.adsbygoogle || []).push({})}catch(e){}</script>`;
}

module.exports = {
    enabled,
    client,
    headLoaderScript,
    adUnitResponsive,
};
