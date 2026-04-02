// ─── MarathonDB Auth Module ────────────────────────────────────────
// Shared authentication layer for all pages.
// Exposes window.MDBAuth for login state checks, logout, and API calls.

window.MDBAuth = (function () {
    'use strict';

    const API = 'https://accounts.marathondb.gg';
    const LOGIN_URL = API + '/auth/bungie/login';

    // ── Generic fetch wrapper ──────────────────────────────────────
    async function api(method, path, body = null) {
        const opts = {
            method,
            credentials: 'include',
            headers: {},
        };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(API + path, opts);
        return res.json();
    }

    // ── Cached /user/me result (per page load) ────────────────────
    let _mePromise = null;

    /**
     * Returns the current user object or null if not logged in.
     * Result is cached for the lifetime of the page.
     */
    function getUser(forceRefresh) {
        if (!_mePromise || forceRefresh) {
            _mePromise = api('GET', '/user/me').then(r => {
                if (r.success) return r.data;
                return null;
            }).catch(() => null);
        }
        return _mePromise;
    }

    /** Destroy session and redirect home. */
    async function logout() {
        await api('POST', '/auth/logout');
        window.location.href = '/';
    }

    /** Complete registration for a new account. */
    async function completeRegistration(token, username) {
        return api('POST', '/auth/complete-registration', { token, username });
    }

    /** Change username. */
    async function changeUsername(username) {
        return api('POST', '/user/username', { username });
    }

    /** Get linked accounts. */
    async function getLinkedAccounts() {
        return api('GET', '/user/linked-accounts');
    }

    /** Link a platform account. */
    async function linkAccount(provider, providerUserId, displayName) {
        return api('POST', '/link/' + provider, {
            provider_user_id: providerUserId,
            display_name: displayName,
        });
    }

    /** Unlink a platform account. */
    async function unlinkAccount(provider) {
        return api('DELETE', '/link/' + provider);
    }

    /** Delete account permanently. */
    async function deleteAccount() {
        return api('DELETE', '/account');
    }

    /** Get public profile by user ID. */
    async function getPublicProfile(userId) {
        return api('GET', '/user/' + userId);
    }

    /** Resolve profile by MarathonDB username. */
    async function getProfileByUsername(username) {
        return api('GET', '/profile/' + encodeURIComponent(username));
    }

    /** Resolve profile by Bungie.net membership ID. */
    async function getProfileByBungie(bungieNetId) {
        return api('GET', '/profile/bungie/' + encodeURIComponent(bungieNetId));
    }

    /** Fuzzy player search by display name prefix. */
    async function searchPlayers(prefix, page) {
        const body = { display_name_prefix: prefix };
        if (page) body.page = page;
        return api('POST', '/search/players', body);
    }

    /** Exact Bungie Name lookup (name + discriminator code). */
    async function searchPlayersExact(displayName, displayNameCode) {
        return api('POST', '/search/players/exact', {
            display_name: displayName,
            display_name_code: displayNameCode,
        });
    }

    // ── Helpers ───────────────────────────────────────────────────

    /**
     * Convert a bungie_avatar_path to a full URL.
     * /user/me returns relative paths; profile endpoints return full URLs.
     */
    function bungieAvatarUrl(avatarPath) {
        if (!avatarPath) return null;
        if (avatarPath.startsWith('http')) return avatarPath;
        return 'https://www.bungie.net' + avatarPath;
    }

    /**
     * Parse "Name#1234" into { display_name, display_name_code }.
     * Returns null if input doesn't match the pattern.
     */
    function parseBungieName(input) {
        if (!input) return null;
        const match = input.match(/^(.+)#(\d+)$/);
        if (match) {
            return { display_name: match[1], display_name_code: parseInt(match[2]) };
        }
        return null;
    }

    /** Membership type mapping. */
    const MEMBERSHIP_TYPES = {
        1: { name: 'Xbox', key: 'xbox' },
        2: { name: 'PlayStation', key: 'psn' },
        3: { name: 'Steam', key: 'steam' },
        254: { name: 'Bungie.net', key: 'bungie' },
    };

    // ── Mobile nav auth injection ─────────────────────────────
    function initMobileAuth(user) {
        const section = document.getElementById('mobileAuthSection');
        if (!section) return;
        if (user) {
            const avatarSrc = bungieAvatarUrl(user.bungie_avatar_path);
            const avatarHtml = avatarSrc
                ? `<img src="${avatarSrc}" alt="" width="24" height="24" style="border-radius:50%;object-fit:cover;">`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            section.innerHTML = `
                <div class="mobile-more-section">
                    <div class="mobile-more-section-title">Account</div>
                    <div class="mobile-more-grid">
                        <a href="/marathon/auth/settings/" class="mobile-more-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            <span>Settings</span>
                        </a>
                        <button class="mobile-more-item" id="mobileLogoutBtn" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>`;
            section.querySelector('#mobileLogoutBtn')?.addEventListener('click', () => logout());
        } else {
            section.innerHTML = '';
        }
    }

    // ── Navbar auth UI injection ──────────────────────────────────
    // Call this once on DOMContentLoaded to add login/profile to the nav.
    function initNavAuth() {
        getUser().then(user => {
            initMobileAuth(user);
            const navRight = document.querySelector('.nav-inner--edge');
            if (!navRight) return;

            // Remove any existing auth element
            const existing = navRight.querySelector('.nav-auth');
            if (existing) existing.remove();

            const el = document.createElement('div');
            el.className = 'nav-auth';

            if (user) {
                const avatarSrc = bungieAvatarUrl(user.bungie_avatar_path);
                const avatarHtml = avatarSrc
                    ? `<img src="${avatarSrc}" alt="" class="nav-auth-avatar" width="22" height="22">`
                    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
                el.innerHTML = `
                    <div class="nav-auth-dropdown">
                        <button class="nav-auth-toggle" type="button">
                            ${avatarHtml}
                            <span class="nav-auth-name">${escapeHtml(user.username)}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        <div class="nav-auth-menu">
                            <a href="/marathon/auth/settings/" class="nav-auth-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                Account Settings
                            </a>
                            <div class="nav-auth-divider"></div>
                            <button class="nav-auth-item nav-auth-item--logout" type="button" id="navLogoutBtn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                Logout
                            </button>
                        </div>
                    </div>`;

                // Dropdown toggle
                const toggle = el.querySelector('.nav-auth-toggle');
                const menu = el.querySelector('.nav-auth-menu');
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.classList.toggle('open');
                });
                document.addEventListener('click', () => menu.classList.remove('open'));

                // Logout handler
                el.querySelector('#navLogoutBtn').addEventListener('click', () => logout());
                navRight.appendChild(el);
            }
        });
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavAuth);
    } else {
        initNavAuth();
    }

    // Public API
    return {
        API,
        LOGIN_URL,
        api,
        getUser,
        logout,
        completeRegistration,
        changeUsername,
        getLinkedAccounts,
        linkAccount,
        unlinkAccount,
        deleteAccount,
        getPublicProfile,
        getProfileByUsername,
        getProfileByBungie,
        searchPlayers,
        searchPlayersExact,
        bungieAvatarUrl,
        parseBungieName,
        MEMBERSHIP_TYPES,
        initNavAuth,
    };
})();
