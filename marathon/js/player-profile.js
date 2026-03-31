/**
 * player-profile.js  –  Client-side URL router + mock renderer for /profile/
 *
 * Supports two URL modes:
 *
 *   PATH mode (production — Cloudflare rewrites /profile/* → profile/index.html):
 *     /profile/bungie/MarathonDB.GG#1580
 *
 *   QUERY mode (local dev — just open profile/index.html with query params):
 *     /profile/?platform=bungie&name=MarathonDB.GG&tag=1580
 *
 * Query params take priority so local testing always works.
 */

(function () {
    'use strict';

    /* ── Platform registry ── */
    const PLATFORMS = {
        bungie: { label: 'Bungie',      icon: '🅱',  expectsTag: true  },
        steam:  { label: 'Steam',       icon: '🎮',  expectsTag: false },
        psn:    { label: 'PlayStation',  icon: '🎮',  expectsTag: false },
        xbl:    { label: 'Xbox',         icon: '🎮',  expectsTag: false },
    };

    /* ── DOM refs ── */
    const root    = document.getElementById('profileRoot');
    const loading = document.getElementById('profileLoading');

    /* ── Parse current URL ── */
    function parseProfileURL() {
        const params = new URLSearchParams(window.location.search);
        const hash   = window.location.hash.replace(/^#/, '') || null;

        // Query-param mode: ?platform=bungie&name=MarathonDB.GG&tag=1580
        if (params.has('platform') || params.has('name')) {
            return {
                platform:   (params.get('platform') || '').toLowerCase() || null,
                playerName: params.get('name') || null,
                tag:        params.get('tag') || hash || null,
                mode:       'query',
            };
        }

        // Path mode: /profile/{platform}/{name}#{tag}
        const segments = window.location.pathname
            .replace(/\/+$/, '')
            .split('/')
            .filter(Boolean);           // ['profile', platform?, name?]

        return {
            platform:   segments[1] ? decodeURIComponent(segments[1]).toLowerCase() : null,
            playerName: segments[2] ? decodeURIComponent(segments[2]) : null,
            tag:        hash,
            mode:       'path',
        };
    }

    /* ── Resolve full display name ── */
    function fullName(parsed) {
        if (!parsed.playerName) return null;
        return parsed.tag ? `${parsed.playerName}#${parsed.tag}` : parsed.playerName;
    }

    /* ── Update page meta ── */
    function setMeta(parsed) {
        const name = fullName(parsed) || 'Unknown';
        const plat = PLATFORMS[parsed.platform]?.label || parsed.platform || 'Unknown';
        const title = `${name} — ${plat} | MarathonDB`;

        document.getElementById('pageTitle').textContent  = title;
        document.title = title;

        const ogTitle = document.getElementById('metaOgTitle');
        const ogDesc  = document.getElementById('metaOgDesc');
        const ogUrl   = document.getElementById('metaOgUrl');
        if (ogTitle) ogTitle.content = title;
        if (ogDesc)  ogDesc.content  = `${plat} player profile for ${name} on MarathonDB.`;
        if (ogUrl)   ogUrl.content   = window.location.href;
    }

    /* ── Error states ── */
    function showError(heading, body) {
        if (loading) loading.remove();
        root.innerHTML = `
            <div class="pp-error">
                <h2>${heading}</h2>
                <p>${body}</p>
                <a href="/player-profiles/" style="color:#00c8ff;text-decoration:underline;font-size:.85rem">Search for a player →</a>
            </div>`;
    }

    /* ── Debug / route-info view (temporary — replaced by live design later) ── */
    function renderDebugView(parsed) {
        const name = fullName(parsed);
        const plat = PLATFORMS[parsed.platform] || null;

        return `
            <dl class="pp-debug">
                <dt>URL mode</dt>
                <dd>${parsed.mode === 'query' ? 'Query params (local dev)' : 'Path segments (production)'}</dd>

                <dt>Pathname</dt>
                <dd>${window.location.pathname}</dd>

                <dt>Query string</dt>
                <dd>${window.location.search || '(none)'}</dd>

                <dt>Hash fragment</dt>
                <dd>${window.location.hash || '(none)'}</dd>

                <dt>Platform (raw)</dt>
                <dd>${parsed.platform || '–'}</dd>

                <dt>Platform (resolved)</dt>
                <dd>${plat ? plat.label : 'unknown'}</dd>

                <dt>Player name</dt>
                <dd>${parsed.playerName || '–'}</dd>

                <dt>Tag / discriminator</dt>
                <dd>${parsed.tag || '(none)'}</dd>

                <dt>Full display name</dt>
                <dd>${name || '–'}</dd>

                <dt>API lookup key</dt>
                <dd>/api/profile/${parsed.platform}/${name ? encodeURIComponent(name) : '...'}</dd>

                <dt>Production URL</dt>
                <dd>/profile/${parsed.platform}/${parsed.playerName || '...'}${parsed.tag ? '#' + parsed.tag : ''}</dd>
            </dl>`;
    }

    /* ── Mock profile shell (structural placeholder — design TBD) ── */
    function renderMockProfile(parsed) {
        const name = fullName(parsed);
        const plat = PLATFORMS[parsed.platform];

        return `
            <div class="pp-shell">
                <div class="pp-platform-badge">${plat ? plat.icon + ' ' + plat.label : parsed.platform}</div>
                <h1>${escapeHTML(name)}</h1>

                <section class="pp-section">
                    <h3 class="pp-section-title">Overview</h3>
                    <div class="pp-placeholder">Stats and progression data will appear here once the API is live.</div>
                </section>

                <section class="pp-section">
                    <h3 class="pp-section-title">Match History</h3>
                    <div class="pp-placeholder">Recent matches will be listed here.</div>
                </section>

                <section class="pp-section">
                    <h3 class="pp-section-title">Loadouts</h3>
                    <div class="pp-placeholder">Saved and recent loadout configurations.</div>
                </section>

                ${renderDebugView(parsed)}
            </div>`;
    }

    /* ── Escape HTML ── */
    function escapeHTML(str) {
        const el = document.createElement('span');
        el.textContent = str || '';
        return el.innerHTML;
    }

    /* ── Main entry ── */
    function init() {
        const parsed = parseProfileURL();

        // /profile/ with nothing else → show landing with test link
        if (!parsed.platform && !parsed.playerName) {
            if (loading) loading.remove();
            root.innerHTML = `
                <div class="pp-error">
                    <h2>Player Profile</h2>
                    <p>No player specified.</p>
                    <a href="/profile/?platform=bungie&name=MarathonDB.GG&tag=1580" style="color:#00c8ff;text-decoration:underline;font-size:.85rem">
                        Test: MarathonDB.GG#1580 (Bungie) →
                    </a>
                    <br><br>
                    <a href="/player-profiles/" style="color:rgba(255,255,255,.5);text-decoration:underline;font-size:.8rem">Search for a player →</a>
                </div>`;
            return;
        }

        // Missing platform or name
        if (!parsed.platform) {
            showError('Missing platform', 'URL must include a platform identifier — e.g. <code>/profile/bungie/Name#1234</code>');
            return;
        }
        if (!parsed.playerName) {
            showError('Missing player name', `Provide a player name after the platform — e.g. <code>/profile/${parsed.platform}/Name</code>`);
            return;
        }

        // Unknown platform → still show profile (future-proofing), but warn in debug
        if (!PLATFORMS[parsed.platform]) {
            console.warn(`[player-profile] Unknown platform: "${parsed.platform}". Rendering anyway.`);
        }

        // Bungie names require a # tag
        if (parsed.platform === 'bungie' && !parsed.tag) {
            console.warn('[player-profile] Bungie name without #tag — profile may not resolve.');
        }

        // Go
        setMeta(parsed);
        if (loading) loading.remove();
        root.innerHTML = renderMockProfile(parsed);
    }

    /* ── Handle hash changes (user edits #tag in URL bar) ── */
    window.addEventListener('hashchange', () => {
        init();
    });

    /* ── Boot ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
