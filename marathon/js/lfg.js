/* ─────────────────────────────────────────────
   LFG PAGE — FIND YOUR SQUAD
   Full-featured IIFE with auth, CRUD, polling,
   join/leave, renew, toasts, expand/collapse
   ───────────────────────────────────────────── */
(function () {
    'use strict';

    // ── Config ──
    const LFG_API  = 'https://lfg.marathondb.gg';
    const LOADOUT_API = 'https://helpbot.marathondb.gg/api/loadouts';
    const POLL_INTERVAL = 30_000;
    const PER_PAGE = 20;

    // ── Enum Labels ──
    const ACTIVITY_LABELS = {
        'contract-farming': 'Contract Farming',
        'squad-wipe':       'Squad Wipe / PvP',
        'extraction':       'Extraction Run',
        'exploration':      'Exploration / Chill',
        'any':              'Any Activity'
    };

    const ACTIVITY_ICONS = {
        'contract-farming': '\u{1F4CB}',
        'squad-wipe':       '\u{2694}\uFE0F',
        'extraction':       '\u{1F3C3}',
        'exploration':      '\u{1F30D}',
        'any':              '\u{1F3AE}'
    };

    const REGION_LABELS = {
        'na-east':        'NA East',
        'na-west':        'NA West',
        'eu-west':        'EU West',
        'eu-east':        'EU East',
        'ap-southeast':   'Asia Pacific',
        'sa':             'South America',
        'oce':            'Oceania'
    };

    const TONE_LABELS = {
        'casual':      'Casual',
        'competitive': 'Competitive',
        'any':         'Any'
    };

    const PLATFORM_LABELS = {
        'pc':        'PC',
        'console':   'Console',
        'crossplay': 'Crossplay'
    };

    // ── State ──
    let currentUser    = null;   // { id, username, display_name, avatar_url, has_active_listing }
    let ownListing     = null;   // full listing object or null
    let listings       = [];
    let pagination     = null;
    let currentPage    = 1;
    let pollTimer      = null;
    let editingId      = null;

    // ── DOM Refs ──
    const dom = {
        // Auth
        loginBtn:        document.getElementById('loginBtn'),
        userBar:         document.getElementById('userBar'),
        userAvatar:      document.getElementById('userAvatar'),
        userName:        document.getElementById('userName'),
        logoutBtn:       document.getElementById('logoutBtn'),
        createListingBtn:document.getElementById('createListingBtn'),

        // Auth error
        authErrorBanner: document.getElementById('authErrorBanner'),
        authErrorMsg:    document.getElementById('authErrorMsg'),
        authErrorClose:  document.getElementById('authErrorClose'),

        // Own listing
        ownBanner:       document.getElementById('ownListingBanner'),
        ownIcon:         document.getElementById('ownListingIcon'),
        ownActivity:     document.getElementById('ownListingActivity'),
        ownPips:         document.getElementById('ownListingPips'),
        ownSpots:        document.getElementById('ownListingSpots'),
        ownExpires:      document.getElementById('ownListingExpires'),
        renewBtn:        document.getElementById('renewListingBtn'),
        bumpBtn:         document.getElementById('bumpListingBtn'),
        editBtn:         document.getElementById('editListingBtn'),
        closeBtn:        document.getElementById('closeListingBtn'),

        // Filters
        filterActivity:  document.getElementById('filterActivity'),
        platformChips:   document.getElementById('platformChips'),
        toneChips:       document.getElementById('toneChips'),
        filterRegion:    document.getElementById('filterRegion'),
        filterMic:       document.getElementById('filterMic'),
        filterLanguage:  document.getElementById('filterLanguage'),
        sortListings:    document.getElementById('sortListings'),
        resetFilters:    document.getElementById('resetFilters'),

        // Feed
        listingCount:    document.getElementById('listingCount'),
        browsingCount:   document.getElementById('browsingCount'),
        refreshBtn:      document.getElementById('refreshBtn'),
        loadingState:    document.getElementById('loadingState'),
        listingsContainer: document.getElementById('listingsContainer'),
        emptyState:      document.getElementById('emptyState'),
        emptyReset:      document.getElementById('emptyReset'),
        emptyCreate:     document.getElementById('emptyCreate'),

        // Pagination
        pagination:      document.getElementById('pagination'),
        prevPage:        document.getElementById('prevPage'),
        nextPage:        document.getElementById('nextPage'),
        pageNumbers:     document.getElementById('pageNumbers'),

        // Modal
        modal:           document.getElementById('listingModal'),
        modalTitle:      document.getElementById('modalTitle'),
        modalClose:      document.getElementById('modalClose'),
        modalCancel:     document.getElementById('modalCancel'),
        listingForm:     document.getElementById('listingForm'),
        formSubmit:      document.getElementById('formSubmit'),
        formError:       document.getElementById('formError'),

        // Form fields
        formActivity:    document.getElementById('formActivity'),
        formSquadSize:   document.getElementById('formSquadSize'),
        squadPicker:     document.getElementById('squadPicker'),
        formPlatform:    document.getElementById('formPlatform'),
        formRegion:      document.getElementById('formRegion'),
        formTone:        document.getElementById('formTone'),
        formComms:       document.getElementById('formComms'),
        formLanguage:    document.getElementById('formLanguage'),
        formRunner:      document.getElementById('formRunner'),
        formLoadoutCode: document.getElementById('formLoadoutCode'),
        loadoutStatus:   document.getElementById('loadoutStatus'),
        formBungieId:    document.getElementById('formBungieId'),
        formFaction:     document.getElementById('formFaction'),
        formNotes:       document.getElementById('formNotes'),
        notesCount:      document.getElementById('notesCount'),

        // Toast
        toastContainer:  document.getElementById('toastContainer')
    };

    // ── Init ──
    function init() {
        handleAuthError();
        setupEventListeners();
        checkAuth();
        loadListings();
        startPolling();
    }

    // ── Auth Error from URL params ──
    function handleAuthError() {
        const params = new URLSearchParams(window.location.search);
        const err = params.get('auth_error');
        if (!err) return;

        const msgs = {
            'access_denied': 'Discord login was cancelled.',
            'server_error':  'Something went wrong during login. Please try again.'
        };

        dom.authErrorMsg.textContent = msgs[err] || 'Login failed. Please try again.';
        dom.authErrorBanner.style.display = 'flex';

        // Clean URL
        const url = new URL(window.location);
        url.searchParams.delete('auth_error');
        history.replaceState(null, '', url.pathname + (url.search || ''));

        dom.authErrorClose.addEventListener('click', () => {
            dom.authErrorBanner.style.display = 'none';
        });
    }

    // ── Event Listeners ──
    function setupEventListeners() {
        // Auth
        dom.logoutBtn.addEventListener('click', logout);
        dom.createListingBtn.addEventListener('click', () => openModal());

        // Own listing
        dom.editBtn.addEventListener('click', () => openModal(ownListing));
        dom.closeBtn.addEventListener('click', closeListing);
        dom.renewBtn.addEventListener('click', renewListing);
        dom.bumpBtn.addEventListener('click', bumpListing);

        // Filters — selects
        dom.filterActivity.addEventListener('change', onFilterChange);
        dom.filterRegion.addEventListener('change', onFilterChange);
        dom.filterMic.addEventListener('change', onFilterChange);
        dom.filterLanguage.addEventListener('change', onFilterChange);
        dom.sortListings.addEventListener('change', onFilterChange);
        dom.resetFilters.addEventListener('click', resetAllFilters);
        dom.emptyReset.addEventListener('click', resetAllFilters);
        if (dom.emptyCreate) {
            dom.emptyCreate.addEventListener('click', () => openModal());
        }

        // Filters — chip groups
        setupChipGroup(dom.platformChips, onFilterChange);
        setupChipGroup(dom.toneChips, onFilterChange);

        // Feed
        dom.refreshBtn.addEventListener('click', () => {
            dom.refreshBtn.classList.add('lfg-spin');
            loadListings().then(() => {
                setTimeout(() => dom.refreshBtn.classList.remove('lfg-spin'), 600);
            });
        });

        // Pagination
        dom.prevPage.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; loadListings(); }
        });
        dom.nextPage.addEventListener('click', () => {
            if (pagination && currentPage < pagination.total_pages) { currentPage++; loadListings(); }
        });

        // Modal
        dom.modalClose.addEventListener('click', closeModal);
        dom.modalCancel.addEventListener('click', closeModal);

        dom.modal.addEventListener('click', (e) => {
            if (e.target === dom.modal) closeModal();
        });
        dom.listingForm.addEventListener('submit', handleFormSubmit);

        // Squad picker
        dom.squadPicker.querySelectorAll('.lfg-squad-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                dom.squadPicker.querySelectorAll('.lfg-squad-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                dom.formSquadSize.value = btn.dataset.size;
            });
        });

        // Notes char counter
        dom.formNotes.addEventListener('input', () => {
            dom.notesCount.textContent = dom.formNotes.value.length;
        });

        // Loadout code validation (debounced)
        let loadoutDebounce;
        dom.formLoadoutCode.addEventListener('input', () => {
            clearTimeout(loadoutDebounce);
            const code = dom.formLoadoutCode.value.trim();
            if (!code) { dom.loadoutStatus.textContent = ''; return; }
            dom.loadoutStatus.textContent = '\u23F3';
            loadoutDebounce = setTimeout(() => previewLoadout(code), 500);
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.modal.style.display !== 'none') {
                closeModal();
            }
        });

        // Visibility for polling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopPolling();
            } else {
                loadListings();
                startPolling();
            }
        });
    }

    // ── Chip Group Helper ──
    function setupChipGroup(container, onChange) {
        container.querySelectorAll('.lfg-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.lfg-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                onChange();
            });
        });
    }

    function getChipValue(container) {
        const active = container.querySelector('.lfg-chip.active');
        return active ? active.dataset.value : '';
    }

    // ────────────────────────────────────────
    //  AUTH
    //  API shape: { success: true, data: user|null }
    //  User shape: { id, username, display_name, avatar_url, has_active_listing }
    // ────────────────────────────────────────
    async function checkAuth() {
        try {
            const res = await fetch(`${LFG_API}/auth/me`, { credentials: 'include' });
            if (!res.ok) { renderAuthState(null); return; }
            const json = await res.json();
            currentUser = json.data || null;
            renderAuthState(currentUser);
            if (currentUser) loadOwnListing();
        } catch (e) {
            console.warn('Auth check failed:', e);
            renderAuthState(null);
        }
    }

    function renderAuthState(user) {
        if (user) {
            dom.loginBtn.style.display = 'none';
            dom.userBar.style.display = 'flex';
            // avatar_url is a full CDN URL from the API, or null
            const avatarUrl = user.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
            dom.userAvatar.src = avatarUrl;
            dom.userName.textContent = user.display_name || user.username;
            if (dom.emptyCreate) dom.emptyCreate.style.display = '';
        } else {
            dom.loginBtn.style.display = '';
            dom.userBar.style.display = 'none';
            if (dom.emptyCreate) dom.emptyCreate.style.display = 'none';
        }
    }

    async function logout() {
        try {
            await fetch(`${LFG_API}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (_) {}
        currentUser = null;
        ownListing = null;
        renderAuthState(null);
        dom.ownBanner.style.display = 'none';
        showToast('Logged out', 'info');
    }

    // ────────────────────────────────────────
    //  OWN LISTING
    //  GET /api/lfg/mine → { success, data: listing|null }
    //  Returns 200 with data:null when none (not 404)
    // ────────────────────────────────────────
    async function loadOwnListing() {
        try {
            const res = await fetch(`${LFG_API}/api/lfg/mine`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            const json = await res.json();
            ownListing = json.data || null;
            if (!ownListing) {
                dom.ownBanner.style.display = 'none';
                return;
            }
            renderOwnListing();
        } catch (e) {
            console.warn('Own listing check failed:', e);
            ownListing = null;
            dom.ownBanner.style.display = 'none';
        }
    }

    function renderOwnListing() {
        if (!ownListing) { dom.ownBanner.style.display = 'none'; return; }

        dom.ownBanner.style.display = '';
        dom.ownIcon.textContent = ACTIVITY_ICONS[ownListing.activity] || '\u{1F3AE}';
        dom.ownActivity.textContent = ACTIVITY_LABELS[ownListing.activity] || ownListing.activity;

        // Pips — use spots_filled from the API
        const total  = ownListing.squad_size || 2;
        const filled = ownListing.spots_filled || 1;
        let pipHtml = '';
        for (let i = 0; i < total; i++) {
            pipHtml += '<span class="lfg-pip' + (i < filled ? ' lfg-pip-filled' : '') + '"></span>';
        }
        dom.ownPips.innerHTML = pipHtml;
        dom.ownSpots.textContent = filled + '/' + total;

        updateOwnListingExpiry();

        // Renew button: show when within 15 min of expiry
        // Server enforces the 3-renewal limit and returns RENEW_LIMIT_REACHED
        const expiresAt = new Date(ownListing.expires_at).getTime();
        const minsLeft = (expiresAt - Date.now()) / 60000;
        dom.renewBtn.style.display = minsLeft <= 15 ? '' : 'none';
    }

    function updateOwnListingExpiry() {
        if (!ownListing) return;
        const remaining = formatTimeRemaining(ownListing.expires_at);
        dom.ownExpires.textContent = remaining || 'Expired';
    }

    // ── Renew ──
    async function renewListing() {
        if (!ownListing) return;
        try {
            const res = await fetch(LFG_API + '/api/lfg/' + ownListing.id + '/renew', {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) {
                const json = await res.json().catch(function () { return {}; });
                showToast((json.error && json.error.message) || 'Failed to renew listing', 'error');
                if (json.error && json.error.code === 'RENEW_LIMIT_REACHED') {
                    dom.renewBtn.style.display = 'none';
                }
                return;
            }
            const json = await res.json();
            ownListing = json.data || ownListing;
            renderOwnListing();
            showToast('Listing renewed! +2 hours', 'success');
            loadListings();
        } catch (e) {
            showToast('Failed to renew listing', 'error');
        }
    }

    // ── Bump Own Listing ──
    async function bumpListing() {
        if (!ownListing) return;
        dom.bumpBtn.disabled = true;
        try {
            var res = await fetch(LFG_API + '/api/lfg/' + ownListing.id + '/bump', {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) {
                var json = await res.json().catch(function () { return {}; });
                showToast((json.error && json.error.message) || 'Failed to bump listing', 'error');
                dom.bumpBtn.disabled = false;
                return;
            }
            var json = await res.json();
            ownListing = json.data || ownListing;
            renderOwnListing();
            showToast('Listing bumped to the top!', 'success');
            loadListings();
        } catch (e) {
            showToast('Failed to bump listing', 'error');
        }
        dom.bumpBtn.disabled = false;
    }

    // ── Close Own Listing ──
    async function closeListing() {
        if (!ownListing || !confirm('Close your active listing?')) return;
        try {
            await fetch(LFG_API + '/api/lfg/' + ownListing.id, {
                method: 'DELETE',
                credentials: 'include'
            });
            ownListing = null;
            dom.ownBanner.style.display = 'none';
            showToast('Listing closed', 'info');
            loadListings();
        } catch (e) {
            showToast('Failed to close listing', 'error');
        }
    }

    // ────────────────────────────────────────
    //  LISTINGS FEED
    //  GET /api/lfg → { success, pagination, data: [...listings] }
    //  Listing shape: { id, author:{id,username,avatar_url},
    //    status, activity, squad_size, spots_filled, spots_open,
    //    platform, region, mic_required, session_tone,
    //    runner:{slug,name,icon_url}|null, loadout_code, notes,
    //    bungie_id, faction, expires_at, created_at }
    // ────────────────────────────────────────
    function buildQueryParams() {
        var params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('per_page', PER_PAGE);

        var activity = dom.filterActivity.value;
        var platform = getChipValue(dom.platformChips);
        var region   = dom.filterRegion.value;
        var tone     = getChipValue(dom.toneChips);
        var mic      = dom.filterMic.value;
        var lang     = dom.filterLanguage.value;
        var sort     = dom.sortListings.value;

        if (activity) params.set('activity', activity);
        if (platform) params.set('platform', platform);
        if (region)   params.set('region', region);
        if (tone)     params.set('session_tone', tone);    // API uses session_tone
        if (mic === 'mic')       params.set('mic_required', 'true');
        else if (mic === 'text')  params.set('mic_required', 'false');
        if (lang)     params.set('language', lang);
        if (sort)     params.set('sort', sort);

        return params.toString();
    }

    async function loadListings() {
        try {
            var query = buildQueryParams();
            var res = await fetch(LFG_API + '/api/lfg?' + query);
            if (!res.ok) throw new Error('Failed to load listings');
            var json = await res.json();

            listings   = json.data || [];          // API returns data[], not listings[]
            pagination = json.pagination || null;

            dom.listingCount.textContent = pagination ? pagination.total : listings.length;

            // Update browsing count if the API returns it
            if (json.browsing_count != null) {
                dom.browsingCount.textContent = json.browsing_count + ' browsing';
                dom.browsingCount.style.display = '';
            }

            if (listings.length === 0) {
                showState('empty');
            } else {
                showState('cards');
                renderCards();
            }
            renderPagination();
        } catch (e) {
            console.error('Load listings error:', e);
            showState('empty');
        }
    }

    function showState(state) {
        dom.loadingState.style.display    = state === 'loading' ? '' : 'none';
        dom.listingsContainer.style.display = state === 'cards'   ? '' : 'none';
        dom.emptyState.style.display      = state === 'empty'   ? '' : 'none';
    }

    // ── Render Cards ──
    function renderCards() {
        var userId = currentUser ? currentUser.id : null;
        dom.listingsContainer.innerHTML = listings.map(function (listing, i) {
            var isOwn = userId && listing.author && listing.author.id === userId;
            var isFull = listing.status === 'full';
            var delay = i * 40;
            return renderCard(listing, isOwn, isFull, delay);
        }).join('');

        // Attach copy-discord handlers
        dom.listingsContainer.querySelectorAll('[data-action="copy-discord"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var name = btn.dataset.discordName;
                navigator.clipboard.writeText(name).then(function () {
                    btn.classList.add('lfg-copied');
                    var label = btn.querySelector('.lfg-act-label');
                    if (label) label.textContent = 'Copied!';
                    showToast('Copied ' + name + ' to clipboard', 'success');
                    setTimeout(function () {
                        btn.classList.remove('lfg-copied');
                        if (label) label.textContent = 'Copy';
                    }, 2000);
                }).catch(function () { showToast('Failed to copy', 'error'); });
            });
        });

        // Attach join/leave handlers
        dom.listingsContainer.querySelectorAll('[data-action="join"]').forEach(function (btn) {
            btn.addEventListener('click', function () { joinListing(btn.dataset.listingId); });
        });
        dom.listingsContainer.querySelectorAll('[data-action="leave"]').forEach(function (btn) {
            btn.addEventListener('click', function () { leaveListing(btn.dataset.listingId); });
        });
    }

    function renderCard(listing, isOwn, isFull, delay) {
        var author = listing.author || {};
        var avatarUrl = author.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
        var authorName = author.username || 'Unknown';
        var authorId = author.id || '';
        var discordProfileUrl = authorId ? 'https://discord.com/users/' + authorId : '';

        var activityLabel = ACTIVITY_LABELS[listing.activity] || listing.activity;
        var activityIcon  = ACTIVITY_ICONS[listing.activity] || '\u{1F3AE}';
        var platformLabel = PLATFORM_LABELS[listing.platform] || listing.platform;
        var regionLabel   = REGION_LABELS[listing.region] || listing.region;
        var tone          = listing.session_tone;

        // Squad pips
        var total  = listing.squad_size || 2;
        var filled = listing.spots_filled || 1;
        var pips = '';
        for (var i = 0; i < total; i++) {
            pips += '<span class="lfg-pip' + (i < filled ? ' lfg-pip-filled' : '') + '"></span>';
        }

        // Expiry
        var remaining = formatTimeRemaining(listing.expires_at);
        var expiresMs = new Date(listing.expires_at).getTime() - Date.now();
        var urgentClass = expiresMs < 900000 ? ' lfg-expiry-urgent' : '';

        var ownClass = isOwn ? ' lfg-card-own' : '';
        var fullClass = isFull && !isOwn ? ' lfg-card-full' : '';

        // ── Zone 1: Header stripe — activity + squad/expiry ──
        var headerHtml = '<div class="lfg-card-header">'
            +   '<div class="lfg-card-activity">'
            +     '<span class="lfg-card-activity-icon">' + activityIcon + '</span>'
            +     esc(activityLabel)
            +   '</div>'
            +   '<div class="lfg-card-status">'
            +     '<div class="lfg-card-squad">'
            +       '<div class="lfg-card-pips">' + pips + '</div>'
            +       '<span class="lfg-card-spots-label">' + filled + '/' + total + '</span>'
            +     '</div>'
            +     '<span class="lfg-card-expiry' + urgentClass + '" data-expires="' + listing.expires_at + '">'
            +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
            +       (remaining || 'expired')
            +     '</span>'
            +   '</div>'
            + '</div>';

        // ── Zone 2: Identity — avatar + name + runner ──
        var runnerTag = '';
        if (listing.runner) {
            runnerTag = '<span class="lfg-card-runner-tag">';
            if (listing.runner.icon_url) {
                runnerTag += '<img src="' + esc(listing.runner.icon_url) + '" alt="' + esc(listing.runner.name) + '" width="20" height="20" onerror="this.style.display=\'none\'">';
            }
            runnerTag += '<span class="lfg-card-runner-name">' + esc(listing.runner.name || listing.runner.slug) + '</span>';
            runnerTag += '</span>';
        }

        var identityHtml = '<div class="lfg-card-identity">'
            +   '<img class="lfg-card-avatar" src="' + esc(avatarUrl) + '" alt="" width="36" height="36" loading="lazy">'
            +   '<span class="lfg-card-author">'
            +     '<svg class="lfg-card-discord-mark" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
            +     esc(authorName)
            +   '</span>'
            +   runnerTag
            + '</div>';

        // ── Zone 3: Tags — platform, region, mic, vibe, language, faction ──
        var tags = '';
        tags += '<span class="lfg-tag lfg-tag-platform">' + esc(platformLabel) + '</span>';
        tags += '<span class="lfg-tag lfg-tag-region">' + esc(regionLabel) + '</span>';
        if (listing.mic_required) {
            tags += '<span class="lfg-tag lfg-tag-mic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Mic</span>';
        } else {
            tags += '<span class="lfg-tag lfg-tag-text"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Text</span>';
        }
        if (tone && tone !== 'any') {
            var toneClass = tone === 'casual' ? 'lfg-tag-casual' : 'lfg-tag-comp';
            tags += '<span class="lfg-tag ' + toneClass + '">' + esc(TONE_LABELS[tone] || tone) + '</span>';
        }
        if (listing.language) {
            var langNames = {en:'EN',es:'ES',fr:'FR',de:'DE',pt:'PT',it:'IT',ja:'JA',ko:'KO',zh:'ZH',ru:'RU',ar:'AR',pl:'PL',nl:'NL',tr:'TR',sv:'SV'};
            tags += '<span class="lfg-tag lfg-tag-lang">' + esc(langNames[listing.language] || listing.language) + '</span>';
        }
        if (listing.faction) {
            var factionNames = { arachne:'Arachne', cyberacme:'CyberAcme', mida:'MIDA', nucaloric:'Nucaloric', sekiguchi:'Sekiguchi', traxus:'Traxus' };
            tags += '<span class="lfg-tag lfg-tag-faction">' + esc(factionNames[listing.faction] || listing.faction) + '</span>';
        }
        var tagsHtml = '<div class="lfg-card-tags">' + tags + '</div>';

        // ── Zone 4: Notes (if present) ──
        var notesHtml = '';
        if (listing.notes) {
            notesHtml = '<div class="lfg-card-notes"><p>' + esc(listing.notes) + '</p></div>';
        }

        // ── Zone 5: Actions — contact + join/leave ──
        var actionsHtml = '<div class="lfg-card-actions">';

        // Contact buttons (left)
        actionsHtml += '<div class="lfg-card-contact">';
        if (discordProfileUrl) {
            actionsHtml += '<a href="' + discordProfileUrl + '" class="lfg-act-btn lfg-act-msg" target="_blank" rel="noopener noreferrer" title="Open Discord profile">'
                +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419s.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419s.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
                +   '<span class="lfg-act-label">Message</span>'
                + '</a>';
        }
        actionsHtml += '<button class="lfg-act-btn lfg-act-copy" data-action="copy-discord" data-discord-name="' + esc(authorName) + '" title="Copy Discord username">'
            +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
            +   '<span class="lfg-act-label">Copy</span>'
            + '</button>';
        actionsHtml += '</div>';

        // Join / Leave (right)
        if (currentUser && !isOwn) {
            actionsHtml += '<div class="lfg-card-join">';
            if (isFull) {
                actionsHtml += '<button class="lfg-btn lfg-btn-full" disabled>Full</button>';
            } else {
                actionsHtml += '<button class="lfg-btn lfg-btn-join" data-action="join" data-listing-id="' + listing.id + '">Join</button>';
            }
            actionsHtml += '<button class="lfg-btn lfg-btn-leave" data-action="leave" data-listing-id="' + listing.id + '">Leave</button>';
            actionsHtml += '</div>';
        }
        actionsHtml += '</div>';

        return '<article class="lfg-card' + ownClass + fullClass + '" data-id="' + listing.id + '" style="animation-delay:' + delay + 'ms">'
            + headerHtml
            + identityHtml
            + tagsHtml
            + notesHtml
            + actionsHtml
            + '</article>';
    }

    // ── Join / Leave ──
    async function joinListing(id) {
        if (!currentUser) { showToast('Login with Discord to join', 'info'); return; }
        try {
            var res = await fetch(LFG_API + '/api/lfg/' + id + '/join', {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) {
                var json = await res.json().catch(function () { return {}; });
                showToast((json.error && json.error.message) || 'Failed to join', 'error');
                return;
            }
            showToast('Joined squad!', 'success');
            loadListings();
        } catch (e) {
            showToast('Failed to join', 'error');
        }
    }

    async function leaveListing(id) {
        if (!currentUser) return;
        try {
            var res = await fetch(LFG_API + '/api/lfg/' + id + '/leave', {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) {
                var json = await res.json().catch(function () { return {}; });
                showToast((json.error && json.error.message) || 'Failed to leave', 'error');
                return;
            }
            showToast('Left squad', 'info');
            loadListings();
        } catch (e) {
            showToast('Failed to leave', 'error');
        }
    }

    // ── Pagination ──
    function renderPagination() {
        if (!pagination || pagination.total_pages <= 1) {
            dom.pagination.style.display = 'none';
            return;
        }

        dom.pagination.style.display = '';
        dom.prevPage.disabled = currentPage <= 1;
        dom.nextPage.disabled = currentPage >= pagination.total_pages;

        var html = '';
        var total = pagination.total_pages;
        for (var i = 1; i <= total; i++) {
            if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - currentPage) > 1) {
                if (html.slice(-3) !== '...') html += '<span style="color:var(--text-dim);padding:0 4px">...</span>';
                continue;
            }
            html += '<button class="lfg-page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
        }
        dom.pageNumbers.innerHTML = html;

        dom.pageNumbers.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                currentPage = parseInt(btn.dataset.page);
                loadListings();
            });
        });
    }

    // ── Filters ──
    function onFilterChange() {
        currentPage = 1;
        updateResetVisibility();
        loadListings();
    }

    function updateResetVisibility() {
        var hasFilters = dom.filterActivity.value ||
            getChipValue(dom.platformChips) ||
            dom.filterRegion.value ||
            getChipValue(dom.toneChips) ||
            dom.filterMic.value ||
            dom.filterLanguage.value;
        dom.resetFilters.style.display = hasFilters ? '' : 'none';
    }

    function resetAllFilters() {
        dom.filterActivity.value = '';
        dom.filterRegion.value   = '';
        dom.filterMic.value      = '';
        dom.filterLanguage.value = '';
        dom.sortListings.value   = 'recent';

        setChipValue(dom.platformChips, '');
        setChipValue(dom.toneChips, '');

        dom.resetFilters.style.display = 'none';
        currentPage = 1;
        loadListings();
    }

    function setChipValue(container, val) {
        container.querySelectorAll('.lfg-chip').forEach(function (c) {
            c.classList.toggle('active', c.dataset.value === val);
        });
    }

    // ── Polling & Heartbeat ──
    var heartbeatTimer = null;

    function startPolling() {
        stopPolling();
        pollTimer = setInterval(function () {
            loadListings();
            if (currentUser) loadOwnListing();
        }, POLL_INTERVAL);

        // Heartbeat every 30s so backend can track browsing users
        sendHeartbeat();
        heartbeatTimer = setInterval(sendHeartbeat, POLL_INTERVAL);
    }

    function stopPolling() {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    }

    function sendHeartbeat() {
        fetch(LFG_API + '/api/lfg/heartbeat', {
            method: 'POST',
            credentials: 'include'
        }).then(function (res) {
            if (res.ok) return res.json();
        }).then(function (json) {
            if (json && json.browsing_count != null) {
                dom.browsingCount.textContent = json.browsing_count + ' browsing';
                dom.browsingCount.style.display = '';
            }
        }).catch(function () { /* silent */ });
    }

    // ────────────────────────────────────────
    //  MODAL — Create / Edit
    // ────────────────────────────────────────
    function openModal(listing) {
        if (!currentUser) {
            showToast('Login with Discord first', 'info');
            return;
        }

        editingId = listing ? listing.id : null;
        dom.modalTitle.textContent = listing ? 'Edit Listing' : 'Post a Squad';
        dom.formSubmit.innerHTML = listing
            ? 'Save Changes'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Post Squad';

        if (listing) {
            dom.formActivity.value  = listing.activity || '';
            dom.formSquadSize.value = listing.squad_size || 2;
            setSquadPickerValue(listing.squad_size || 2);
            dom.formPlatform.value  = listing.platform || 'crossplay';
            dom.formRegion.value    = listing.region || '';
            dom.formTone.value      = listing.session_tone || 'any';     // API field: session_tone
            dom.formComms.value     = listing.mic_required ? 'mic' : 'any';
            dom.formLanguage.value  = listing.language || '';
            dom.formRunner.value    = (listing.runner && listing.runner.slug) || '';  // runner is object
            dom.formLoadoutCode.value = listing.loadout_code || '';
            dom.formBungieId.value  = listing.bungie_id || '';
            dom.formFaction.value   = listing.faction || '';
            dom.formNotes.value     = listing.notes || '';
            dom.notesCount.textContent = (listing.notes || '').length;
        } else {
            resetForm();
        }

        dom.formError.style.display = 'none';
        dom.modal.style.display = '';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        dom.modal.style.display = 'none';
        document.body.style.overflow = '';
        editingId = null;
    }

    function resetForm() {
        dom.listingForm.reset();
        dom.formSquadSize.value = '2';
        setSquadPickerValue(2);
        dom.notesCount.textContent = '0';
        dom.loadoutStatus.textContent = '';
        dom.formError.style.display = 'none';
    }

    function setSquadPickerValue(val) {
        dom.squadPicker.querySelectorAll('.lfg-squad-opt').forEach(function (b) {
            b.classList.toggle('active', b.dataset.size === String(val));
        });
    }

    // ────────────────────────────────────────
    //  FORM SUBMIT
    //  POST /api/lfg → { success, data: listing }
    //  PATCH /api/lfg/:id → { success, data: listing }
    //  Body uses session_tone (not tone)
    // ────────────────────────────────────────
    async function handleFormSubmit(e) {
        e.preventDefault();

        var commsVal = dom.formComms.value;   // 'mic' | 'text' | 'any'
        var body = {
            activity:     dom.formActivity.value,
            squad_size:   parseInt(dom.formSquadSize.value),
            platform:     dom.formPlatform.value,
            region:       dom.formRegion.value,
            mic_required: commsVal === 'mic',       // API field: boolean
            comms:        commsVal,                  // API field: 'mic' | 'text' | 'any'
            session_tone: dom.formTone.value        // API field: session_tone
        };

        // Optional fields
        var runner      = dom.formRunner.value;
        var loadoutCode = dom.formLoadoutCode.value.trim();
        var bungieId    = dom.formBungieId.value.trim();
        var faction     = dom.formFaction.value;
        var notes       = dom.formNotes.value.trim();

        if (runner)      body.runner_slug  = runner;
        if (loadoutCode) body.loadout_code = loadoutCode;
        if (bungieId)    body.bungie_id    = bungieId;
        if (faction)     body.faction      = faction;
        if (notes)       body.notes        = notes;

        var language = dom.formLanguage.value;
        if (language)    body.language     = language;

        dom.formSubmit.disabled = true;

        try {
            var url    = editingId ? (LFG_API + '/api/lfg/' + editingId) : (LFG_API + '/api/lfg');
            var method = editingId ? 'PATCH' : 'POST';

            var res = await fetch(url, {
                method: method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.status === 409) {
                var conflict = await res.json().catch(function () { return {}; });
                showFormError('You already have an active listing. Close it first or edit it.');
                return;
            }
            if (res.status === 429) {
                showFormError('Slow down \u2014 please wait a moment before trying again.');
                return;
            }
            if (!res.ok) {
                var errData = await res.json().catch(function () { return {}; });
                showFormError((errData.error && errData.error.message) || 'Something went wrong.');
                return;
            }

            var json = await res.json();
            ownListing = json.data || null;     // Response: { success, data: listing }
            renderOwnListing();

            closeModal();
            showToast(editingId ? 'Listing updated!' : 'Squad posted!', 'success');
            loadListings();
        } catch (err) {
            showFormError('Network error. Please try again.');
        } finally {
            dom.formSubmit.disabled = false;
        }
    }

    function showFormError(msg) {
        dom.formError.textContent = msg;
        dom.formError.style.display = '';
    }

    // ── Loadout Preview ──
    async function previewLoadout(code) {
        try {
            var res = await fetch(LOADOUT_API + '/' + code);
            dom.loadoutStatus.textContent = res.ok ? '\u2705' : '\u274C';
        } catch (_) {
            dom.loadoutStatus.textContent = '\u26A0\uFE0F';
        }
    }

    // ── Toast System ──
    function showToast(message, type) {
        type = type || 'info';
        var toast = document.createElement('div');
        toast.className = 'lfg-toast lfg-toast-' + type;
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('lfg-toast-out');
            toast.addEventListener('animationend', function () { toast.remove(); });
        }, 3500);
    }

    // ── Expiry Timer Updates (every 30s) ──
    setInterval(function () {
        updateOwnListingExpiry();

        document.querySelectorAll('.lfg-card-expiry[data-expires]').forEach(function (el) {
            var remaining = formatTimeRemaining(el.dataset.expires);
            var svg = el.querySelector('svg');
            var svgHtml = svg ? svg.outerHTML + ' ' : '';
            el.innerHTML = svgHtml + (remaining || 'expired');

            var ms = new Date(el.dataset.expires).getTime() - Date.now();
            el.classList.toggle('lfg-expiry-urgent', ms < 900000 && ms > 0);
        });

        // Update renew button visibility
        if (ownListing) {
            var expiresAt = new Date(ownListing.expires_at).getTime();
            var minsLeft  = (expiresAt - Date.now()) / 60000;
            dom.renewBtn.style.display = minsLeft <= 15 ? '' : 'none';
        }
    }, 30000);

    // ── Utilities ──
    function formatTimeRemaining(expiresAt) {
        var ms = new Date(expiresAt).getTime() - Date.now();
        if (ms <= 0) return null;
        var mins    = Math.floor(ms / 60000);
        var hrs     = Math.floor(mins / 60);
        var remMins = mins % 60;
        if (hrs > 0) return hrs + 'h ' + remMins + 'm';
        return mins + 'm';
    }

    function esc(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Populate Runners from API ──
    async function populateRunners() {
        try {
            var res = await fetch('https://helpbot.marathondb.gg/api/runners');
            if (!res.ok) return;
            var json = await res.json();
            var runners = json.runners || json.data || json || [];
            if (!Array.isArray(runners)) return;
            runners.forEach(function (r) {
                var opt = document.createElement('option');
                opt.value = r.slug || r.id;
                opt.textContent = r.name || r.slug;
                dom.formRunner.appendChild(opt);
            });
        } catch (_) {
            // Runner population is optional, fail silently
        }
    }

    // ── Bootstrap ──
    populateRunners();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
