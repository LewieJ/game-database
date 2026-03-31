/**
 * Background Detail Page — JS
 * 
 * Fetches a single background from the dedicated backgrounds API,
 * populates the detail page, and initialises the community rating widget.
 *
 * API:  https://backgrounds.marathondb.gg/api/backgrounds/:slug
 * CDN:  https://helpbot.marathondb.gg/
 *
 * Depends on: cosmetic-ratings.js (EmojiRatingWidget, CosmeticRatingsAPI)
 */

(function () {
    'use strict';

    // ─── Config ───
    const BG_API = 'https://backgrounds.marathondb.gg';
    const BG_CDN = 'https://helpbot.marathondb.gg/';

    // Derive slug from URL: /backgrounds/{slug}/ → slug
    const PATH_PARTS = window.location.pathname.replace(/\/+$/,'').split('/');
    const SLUG = PATH_PARTS[PATH_PARTS.length - 1];

    // ─── Colour Maps ───
    const RARITY_COLOURS = {
        common:    '#95a5a6',
        uncommon:  '#2ecc71',
        rare:      '#3498db',
        epic:      '#9b59b6',
        legendary: '#f39c12'
    };

    const SOURCE_LABELS = {
        free:       'Free',
        codex:      'Codex Reward',
        battlepass: 'Battle Pass',
        store:      'Store',
        event:      'Limited Event',
        unknown:    'Unknown'
    };

    const SOURCE_COLOURS = {
        free:       '#2ecc71',
        codex:      '#00d4ff',
        battlepass: '#f39c12',
        event:      '#9b59b6',
        store:      '#3498db',
        unknown:    '#6b6b75'
    };

    const FACTION_COLOURS = {
        cyberacme: '#01d838',
        nucaloric: '#ff125d',
        traxus:    '#ff7300',
        vesper:    '#a855f7',
        arachne:   '#00d4ff',
        volantis:  '#facc15'
    };

    // ─── DOM refs ───
    const $ = id => document.getElementById(id);

    // ─── Helpers ───
    function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

    function formatDate(str) {
        if (!str) return null;
        const d = new Date(str);
        return isNaN(d) ? str : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function makeRow(label, valueHtml) {
        const row = document.createElement('div');
        row.className = 'bd-row';
        row.innerHTML = '<span class="bd-row-label">' + label + '</span><span class="bd-row-value">' + valueHtml + '</span>';
        return row;
    }

    function resolveImage(path, fallback) {
        if (!path) return fallback || '';
        if (path.startsWith('http')) return path;
        return BG_CDN + path;
    }

    // ─── Page states ───
    function showLoading() {
        $('loadingState').style.display = '';
        $('errorState').style.display = 'none';
        $('heroSection').style.display = 'none';
        $('infoBody').style.display = 'none';
    }

    function showError() {
        $('loadingState').style.display = 'none';
        $('errorState').style.display = '';
        $('heroSection').style.display = 'none';
        $('infoBody').style.display = 'none';
    }

    function showContent() {
        $('loadingState').style.display = 'none';
        $('errorState').style.display = 'none';
        $('heroSection').style.display = '';
        $('infoBody').style.display = '';
    }

    // ─── Meta updater ───
    function updateMeta(bg) {
        const desc = bg.acquisition_summary
            ? bg.rarity.charAt(0).toUpperCase() + bg.rarity.slice(1) + ' background · ' + bg.acquisition_summary
            : bg.description || bg.name + ' background in Marathon';

        document.title = bg.name + ' — Background | MarathonDB';

        const setMeta = (attr, key, val) => {
            const el = document.querySelector('meta[' + attr + '="' + key + '"]');
            if (el) el.setAttribute('content', val);
        };

        setMeta('name', 'description', desc);
        setMeta('property', 'og:title', bg.name + ' — Background | MarathonDB');
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', window.location.href);
        setMeta('name', 'twitter:title', bg.name + ' — Background | MarathonDB');
        setMeta('name', 'twitter:description', desc);

        // OG image
        const ogImg = bg.image_preview_url ? resolveImage(bg.image_preview_url) : '';
        if (ogImg) {
            setMeta('property', 'og:image', ogImg);
            setMeta('name', 'twitter:image', ogImg);
        }

        // Canonical
        const canon = document.querySelector('link[rel="canonical"]');
        if (canon) canon.href = 'https://marathondb.gg/backgrounds/' + SLUG + '/';

        // Structured data
        const sd = $('structuredDataProduct');
        if (sd) {
            try {
                const obj = JSON.parse(sd.textContent);
                obj.name = bg.name + ' — Marathon Background';
                obj.description = desc;
                obj.url = 'https://marathondb.gg/backgrounds/' + SLUG + '/';
                if (ogImg) obj.image = ogImg;
                if (bg.ratings && bg.ratings.total_votes > 0) {
                    obj.aggregateRating = {
                        '@type': 'AggregateRating',
                        ratingValue: (bg.ratings.score_percent / 20).toFixed(1),
                        bestRating: '5',
                        worstRating: '1',
                        ratingCount: bg.ratings.total_votes
                    };
                }
                sd.textContent = JSON.stringify(obj, null, 2);
            } catch (e) { /* ignore */ }
        }
    }

    // ─── Share buttons ───
    function initShareButtons(bg) {
        const pageUrl = window.location.href;
        const toastEl = $('rsdShareToast');

        function showToast(msg, cls) {
            if (!toastEl) return;
            toastEl.textContent = msg;
            toastEl.className = 'bd-share-toast ' + (cls || '') + ' active';
            setTimeout(() => { toastEl.classList.remove('active'); }, 2500);
        }

        $('shareTwitter')?.addEventListener('click', () => {
            const text = encodeURIComponent(bg.name + ' — ' + capitalize(bg.rarity) + ' Background on MarathonDB');
            window.open('https://x.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(pageUrl), '_blank', 'width=550,height=420');
        });

        $('shareDiscord')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText('**' + bg.name + '** — ' + capitalize(bg.rarity) + ' Profile Background\n' + pageUrl);
                showToast('Discord text copied!', 'toast-discord');
            } catch (e) { console.error('Copy failed', e); }
        });

        $('shareCopy')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(pageUrl);
                showToast('Link copied to clipboard!', 'toast-copy');
            } catch (e) { console.error('Copy failed', e); }
        });
    }

    // ─── Lightbox ───
    function openLightbox(src) {
        const overlay = document.createElement('div');
        overlay.className = 'ws-lightbox-overlay';
        overlay.innerHTML = '<div class="ws-lightbox-content">' +
            '<img src="' + src + '" alt="Full size preview">' +
            '<button class="ws-lightbox-close">&times;</button></div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
        overlay.addEventListener('click', ev => {
            if (ev.target === overlay || ev.target.classList.contains('ws-lightbox-close')) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 200);
            }
        });
    }

    function initLightbox() {
        const img = $('cosmeticImage');
        const fsBtn = $('fullscreenBtn');
        const previewBox = $('previewBox');

        if (fsBtn && img) {
            fsBtn.addEventListener('click', e => {
                e.stopPropagation();
                openLightbox(img.dataset.full || img.src);
            });
        }
        if (previewBox && img) {
            previewBox.addEventListener('click', e => {
                if (e.target.closest('.bd-preview-expand')) return;
                openLightbox(img.dataset.full || img.src);
            });
        }
    }

    // ─── Build page sections ───
    function populateHero(bg) {
        // Set rarity on hero section for CSS gradients
        const heroEl = document.querySelector('.bd-hero');
        if (heroEl && bg.rarity) heroEl.setAttribute('data-rarity', bg.rarity);

        const previewEl = $('previewBox');
        if (previewEl && bg.rarity) previewEl.setAttribute('data-rarity', bg.rarity);

        // Image
        const fullSrc = resolveImage(bg.image_url);
        const previewSrc = resolveImage(bg.image_preview_url, fullSrc);
        const img = $('cosmeticImage');
        if (img) {
            img.src = previewSrc;
            img.alt = bg.name;
            img.dataset.full = fullSrc;
        }

        // Name & breadcrumb
        $('bgName').textContent = bg.name;
        $('breadcrumbName').textContent = bg.name;

        // Rarity badge
        const rarityBadge = $('rarityBadge');
        if (rarityBadge && bg.rarity) {
            rarityBadge.textContent = capitalize(bg.rarity);
            rarityBadge.style.background = RARITY_COLOURS[bg.rarity] || '#6b6b75';
            rarityBadge.style.display = '';
        }

        // Source badge
        const sourceBadge = $('sourceBadge');
        if (sourceBadge && bg.source_type && bg.source_type !== 'unknown') {
            sourceBadge.textContent = SOURCE_LABELS[bg.source_type] || capitalize(bg.source_type);
            sourceBadge.style.background = SOURCE_COLOURS[bg.source_type] || '#6b6b75';
            sourceBadge.style.display = '';
        }

        // Faction badge
        const factionBadge = $('factionBadge');
        if (factionBadge && bg.faction_name && bg.faction_slug) {
            factionBadge.textContent = bg.faction_name;
            factionBadge.style.background = FACTION_COLOURS[bg.faction_slug] || '#6b6b75';
            factionBadge.style.display = '';
        }

        // Legacy badge
        if (!bg.is_obtainable) {
            const legacy = $('legacyBadge');
            if (legacy) legacy.style.display = '';
        }

        // Acquisition — show the short summary in the hero
        const acqText = bg.acquisition_summary;
        if (acqText) {
            const block = $('acquisitionBlock');
            const textEl = $('acquisitionText');
            if (block && textEl) {
                textEl.textContent = acqText;
                block.style.display = '';
            }
        }
    }

    function populateDetails(bg) {
        const rows = $('detailRows');
        if (!rows) return;

        rows.appendChild(makeRow('Type', 'Profile Background'));
        if (bg.rarity) rows.appendChild(makeRow('Rarity', '<span style="color:' + (RARITY_COLOURS[bg.rarity]||'#fff') + '">' + capitalize(bg.rarity) + '</span>'));
        if (bg.source_type && bg.source_type !== 'unknown') rows.appendChild(makeRow('Source', SOURCE_LABELS[bg.source_type] || capitalize(bg.source_type)));
        if (bg.season_name) rows.appendChild(makeRow('Season', bg.season_name));
        if (bg.faction_name) {
            const fColor = FACTION_COLOURS[bg.faction_slug] || '#fff';
            rows.appendChild(makeRow('Faction', '<a href="/factions/' + bg.faction_slug + '/" style="color:' + fColor + '">' + bg.faction_name + '</a>'));
        }
        rows.appendChild(makeRow('Obtainable', bg.is_obtainable ? '<span style="color:#2ecc71">Yes</span>' : '<span style="color:#e74c3c">No (Legacy)</span>'));

        // Description & flavor text in the details card
        if (bg.description) rows.appendChild(makeRow('Description', bg.description));
        if (bg.flavor_text) rows.appendChild(makeRow('Flavor Text', '<em>&ldquo;' + bg.flavor_text + '&rdquo;</em>'));
    }

    function populateStoreInfo(bg) {
        const card = $('storeInfoCard');
        const rows = $('storeRows');
        if (!card || !rows) return;

        let hasData = false;

        if (bg.acquisition_summary) {
            rows.appendChild(makeRow('Summary', bg.acquisition_summary));
            hasData = true;
        }
        if (bg.acquisition_detail && bg.acquisition_detail !== bg.acquisition_summary) {
            rows.appendChild(makeRow('Details', bg.acquisition_detail));
            hasData = true;
        }

        // Store specific
        if (bg.source_type === 'store') {
            if (bg.price) {
                rows.appendChild(makeRow('Price', bg.price.toLocaleString() + ' ' + (bg.currency || 'Credits')));
                hasData = true;
            }
            if (bg.available_from) {
                rows.appendChild(makeRow('Available From', formatDate(bg.available_from)));
                hasData = true;
            }
            if (bg.available_until) {
                rows.appendChild(makeRow('Available Until', formatDate(bg.available_until)));
                hasData = true;
            }
        }

        // Battle Pass specific
        if (bg.source_type === 'battlepass') {
            if (bg.battlepass_tier) {
                rows.appendChild(makeRow('Battle Pass Tier', 'Tier ' + bg.battlepass_tier));
                hasData = true;
            }
        }

        if (hasData) card.style.display = '';
    }

    // ─── Related Backgrounds ───
    async function loadRelated(bg) {
        const section = $('relatedSection');
        const grid = $('relatedGrid');
        if (!section || !grid) return;

        try {
            // Get backgrounds from same rarity or faction
            const params = new URLSearchParams();
            if (bg.faction_id) params.set('faction_id', bg.faction_id);
            else if (bg.rarity) params.set('rarity', bg.rarity);

            const res = await fetch(BG_API + '/api/backgrounds?' + params);
            const json = await res.json();
            if (!json.data || !json.data.length) return;

            // Filter out self, limit to 4
            const related = json.data
                .filter(r => r.slug !== SLUG)
                .slice(0, 4);

            if (!related.length) return;

            grid.innerHTML = related.map(r => {
                const imgSrc = resolveImage(r.image_preview_url, resolveImage(r.image_url));
                const thumbHtml = imgSrc
                    ? '<img src="' + imgSrc + '" alt="' + (r.name || '') + '" loading="lazy" width="36" height="36">'
                    : '';
                return '<a href="/backgrounds/' + r.slug + '/" class="bd-related-card">' +
                    '<div class="bd-related-card-thumb">' + thumbHtml + '</div>' +
                    '<span class="bd-related-card-name">' + (r.name || r.slug) + '</span>' +
                '</a>';
            }).join('');

            section.style.display = '';
        } catch (err) {
            console.warn('Related backgrounds failed:', err);
        }
    }

    // ─── Quick Nav (prev / next) ───
    async function loadQuickNav(bg) {
        const nav = $('quickNav');
        if (!nav) return;

        try {
            const res = await fetch(BG_API + '/api/backgrounds');
            const json = await res.json();
            if (!json.data || json.data.length < 2) return;

            const list = json.data;
            const idx = list.findIndex(b => b.slug === SLUG);
            if (idx === -1) return;

            const prev = idx > 0 ? list[idx - 1] : list[list.length - 1];
            const next = idx < list.length - 1 ? list[idx + 1] : list[0];

            nav.innerHTML =
                '<a href="/backgrounds/' + prev.slug + '/" class="bd-quick-link bd-quick-link--prev">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>' +
                    '<span>' + prev.name + '</span></a>' +
                '<a href="/backgrounds/" class="bd-quick-link bd-quick-link--all">All Backgrounds</a>' +
                '<a href="/backgrounds/' + next.slug + '/" class="bd-quick-link bd-quick-link--next">' +
                    '<span>' + next.name + '</span>' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></a>';

            nav.style.display = 'grid';
        } catch (err) {
            console.warn('Quick nav failed:', err);
        }
    }

    // ─── Rating Widget ───
    function initRatingWidget(bg) {
        const widgetEl = $('cosmeticHeatWidget');
        if (!widgetEl || typeof EmojiRatingWidget === 'undefined') return;

        widgetEl.dataset.cosmeticSlug = SLUG;
        widgetEl.dataset.cosmeticName = bg.name;

        new EmojiRatingWidget(widgetEl, SLUG, {
            cosmeticType: 'background',
            skinName: bg.name
        });
    }

    // ─── Main ───
    async function init() {
        if (!SLUG) { showError(); return; }

        showLoading();

        try {
            const res = await fetch(BG_API + '/api/backgrounds/' + SLUG);
            if (!res.ok) { showError(); return; }

            const json = await res.json();
            const bg = json.data;
            if (!bg) { showError(); return; }

            // Build page
            populateHero(bg);
            populateDetails(bg);
            populateStoreInfo(bg);
            updateMeta(bg);
            initShareButtons(bg);
            initLightbox();
            initRatingWidget(bg);
            showContent();

            // Lazy-load secondary sections
            loadRelated(bg);

        } catch (err) {
            console.error('Background detail load failed:', err);
            showError();
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
