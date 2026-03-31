// Runner Detail Page JavaScript

const RUNNER_API_BASE = 'https://runners.marathondb.gg/api/runners';
const RUNNER_SKINS_API = 'https://runnerskins.marathondb.gg/api/skins';
const RUNNER_SKINS_CDN = 'https://runnerskins.marathondb.gg';
const RUNNER_ASSET_BASE = 'https://helpbot.marathondb.gg/assets/runners';

let runner = null;
let selectedStatVersion = 'current'; // 'current' or a specific history index
let runnerSkins = [];
let skinsLoaded = false;
let runnerCores = [];
let coresLoaded = false;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const slug = getRunnerSlug();
    
    if (!slug) {
        showError();
        return;
    }
    
    // Check if page already has SSG-rendered content
    const runnerDetail = document.getElementById('runnerDetail');
    const isSSGRendered = runnerDetail && runnerDetail.style.display !== 'none' && document.getElementById('runnerName')?.textContent;
    
    if (isSSGRendered) {
        // Page was pre-rendered by SSG - just hydrate interactive features
        console.log('Using SSG-rendered content for:', slug);
        
        // Extract runner data from the page
        runner = {
            slug: slug,
            name: document.getElementById('runnerName')?.textContent || '',
            description: document.querySelector('.runner-desc-badge')?.textContent || '',
            background: document.getElementById('runnerBackground')?.textContent || '',
            prior_name: document.getElementById('runnerPriorName')?.textContent?.replace('Previously: ', '') || null
        };
        
        // Setup tab navigation
        setupTabNavigation();
        
        // Setup core detail modal events
        setupCoreModalEvents();
        
        // Setup share buttons
        setupShareButtons();

        // Setup image lightbox
        setupImageLightbox();

        // Pre-fetch skins/cores counts so badges appear before tab click
        prefetchTabCounts();

        // Fetch fresh data from new Runner API for abilities + stats
        try {
            const runnerRes = await fetch(`${RUNNER_API_BASE}/${slug}`).then(r => r.json());
            if (runnerRes?.success && runnerRes.data) {
                const fresh = runnerRes.data;
                // Merge abilities from new API
                runner.abilities = fresh.abilities || [];
                runner.role = fresh.role || '';
                runner.tech = fresh.tech || '';
                runner.lore_excerpt = fresh.lore_excerpt || '';
                runner.description = fresh.description || runner.description;
                // Re-render abilities with new API data + icons
                renderAbilities();

                // Map new stats format to history for stat rendering
                if (fresh.stats && fresh.stats.length > 0) {
                    runner.history = fresh.stats;
                    // Default to latest season (last entry)
                    selectedStatVersion = runner.history.length - 1;
                    renderStats();
                    renderStatHistoryChart();
                }
            }
        } catch (e) {
            console.log('New Runner API not available, keeping SSG content');
        }

        // Initialize rating widget AFTER renderAbilities (which creates #ratingWidgetInline)
        initRatingWidget();

        // Render community rating timeline chart
        renderRatingTimeline();

        // Try to load patch notes from old API (still needed until migrated)
        try {
            const historyResponse = await MarathonAPI.getRunnerHistory(slug);
            if (historyResponse?.data) {
                if (!runner.history) runner.history = historyResponse.data;
                renderPatchHistory();
            }
        } catch (e) {
            console.log('History data not available (expected for SSG pages)');
        }
        
        return;
    }
    
    // Fallback: Load from API (for non-SSG pages)
    await loadRunner(slug);
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Setup core detail modal events
    setupCoreModalEvents();
    
    // On mobile, start with no tab selected to save space
    if (window.innerWidth <= 600) {
        document.querySelectorAll('.runner-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.runner-tab-content').forEach(content => content.classList.remove('active'));
    }
});

// Get runner slug from URL
function getRunnerSlug() {
    // Support clean URL: /runners/[slug]/
    const pathMatch = window.location.pathname.match(/\/runners\/([^\/]+)/);
    if (pathMatch) return decodeURIComponent(pathMatch[1]);
    // Fallback to query parameter
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || params.get('id');
}

// Load runner data from new Runner API
async function loadRunner(slug) {
    try {
        const response = await fetch(`${RUNNER_API_BASE}/${slug}`).then(r => r.json());
        
        if (response?.success && response.data) {
            runner = response.data;
            runner.slug = slug;
            
            // Map new API stats to history format for existing stat rendering
            if (runner.stats && runner.stats.length > 0) {
                runner.history = runner.stats;
                // Default to latest season (last entry)
                selectedStatVersion = runner.history.length - 1;
            }
            
            renderRunner();
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error loading runner:', error);
        showError();
    }
}

// Render runner details
function renderRunner() {
    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('runnerDetail').style.display = 'block';
    
    // Update page title and SEO meta tags
    updateMetaTags();
    
    // Add structured data for rich search results
    addStructuredData();
    
    // Update breadcrumb
    updateBreadcrumb();
    
    // Image — use new Runner API hero image (1:2 aspect ratio)
    const heroUrl = `${RUNNER_ASSET_BASE}/${runner.slug}/hero.webp`;
    const imgEl = document.getElementById('runnerImage');
    imgEl.src = heroUrl;
    imgEl.alt = runner.name;
    imgEl.onerror = function() {
        this.src = `${RUNNER_ASSET_BASE}/${runner.slug}/hero.png`;
        this.onerror = function() {
            // Final fallback to portrait
            this.src = `${RUNNER_ASSET_BASE}/${runner.slug}/portrait.webp`;
            this.onerror = function() {
                this.src = `${RUNNER_ASSET_BASE}/${runner.slug}-300x460.png`;
                this.onerror = () => { this.style.display = 'none'; };
            };
        };
    };
    
    // Name and description badge inline
    const nameEl = document.getElementById('runnerName');
    nameEl.innerHTML = '';
    nameEl.appendChild(document.createTextNode(runner.name));
    if (runner.description) {
        const badge = document.createElement('span');
        badge.className = 'runner-desc-badge';
        badge.textContent = runner.description;
        nameEl.appendChild(badge);
    }
    
    // Show prior name if exists
    const priorNameEl = document.getElementById('runnerPriorName');
    if (runner.prior_name) {
        priorNameEl.textContent = `Previously: ${runner.prior_name}`;
        priorNameEl.style.display = 'block';
    } else {
        priorNameEl.style.display = 'none';
    }
    
    // Background
    const bgEl = document.getElementById('runnerBackground');
    if (runner.background) {
        bgEl.textContent = runner.background;
        bgEl.style.display = 'block';
    } else {
        bgEl.style.display = 'none';
    }
    
    // Season badge - show the season the runner launched in
    const seasonBadge = document.getElementById('seasonBadge');
    if (runner.launch_season || runner.season) {
        seasonBadge.textContent = runner.launch_season || runner.season;
        seasonBadge.style.display = 'inline-flex';
    } else {
        seasonBadge.style.display = 'none';
    }
    
    // Render abilities
    renderAbilities();
    
    // Render stats
    renderStats();
    
    // Load and render compatible cores
    loadRunnerCores();
    
    // Render patch history
    renderPatchHistory();
    
    // Render stat history chart
    renderStatHistoryChart();
    
    // Initialize rating widget
    initRatingWidget();

    // Render community rating timeline chart
    renderRatingTimeline();
    
    // Setup share buttons
    setupShareButtons();
    
    // Setup image lightbox
    setupImageLightbox();
}

// Initialize the community rating widget
function initRatingWidget() {
    const container = document.getElementById('ratingWidgetInline');
    if (!container || !runner?.slug) return;
    
    // Check if RatingWidget is available
    if (typeof RatingWidget === 'undefined') {
        console.warn('RatingWidget not loaded');
        return;
    }
    
    // Create the rating widget inside the abilities-grid card
    new RatingWidget(container, runner.slug, {
        type: 'runner',
        showDistribution: false,
        showVoteCount: true,
        compact: true,
        onRatingChange: (rating, aggregate) => {
            console.log(`Rating updated: ${rating} stars, new average: ${aggregate.average_rating}`);
            updateRatingBadge(aggregate.average_rating, aggregate.total_votes);
        }
    });
    
    // Also load the compact badge data
    loadRatingBadge();
}

// Load and display the compact rating badge in the header
async function loadRatingBadge() {
    if (!runner?.slug || typeof RatingsAPI === 'undefined') return;
    
    try {
        const response = await RatingsAPI.getRunnerRating(runner.slug);
        
        if (response.success && response.ratings) {
            updateRatingBadge(response.ratings.average_rating, response.ratings.total_votes);
        }
    } catch (error) {
        console.warn('Failed to load rating badge:', error);
    }
}

// Update the compact rating badge display
function updateRatingBadge(averageRating, totalVotes) {
    const badge = document.getElementById('runnerRatingBadge');
    if (!badge) return;
    
    // Update value
    const valueEl = document.getElementById('ratingBadgeValue');
    if (valueEl) {
        valueEl.textContent = averageRating ? averageRating.toFixed(1) : '-';
    }
    
    // Update votes
    const votesEl = document.getElementById('ratingBadgeVotes');
    if (votesEl) {
        const voteCount = totalVotes || 0;
        votesEl.textContent = `${voteCount.toLocaleString()} vote${voteCount !== 1 ? 's' : ''}`;
    }
    
    // Update stars
    const starsContainer = document.getElementById('ratingBadgeStars');
    if (starsContainer) {
        const stars = starsContainer.querySelectorAll('.star');
        const fullStars = Math.round(averageRating || 0);
        
        stars.forEach((star, index) => {
            star.classList.toggle('filled', index < fullStars);
        });
    }
}

// Map ability_type string to a CSS key
function getAbilityTypeKey(type) {
    const t = (type || '').toLowerCase();
    if (t === 'tech') return 'tech';
    if (t === 'prime') return 'prime';
    if (t === 'tactical') return 'tactical';
    if (t.startsWith('trait')) return 'trait';
    if (t === 'passive') return 'passive';
    return 'other';
}

// Render abilities — uses ordered layout and new API fields
function renderAbilities() {
    const container = document.getElementById('abilitiesList');
    const abilities = runner.abilities || [];

    if (abilities.length === 0) {
        container.innerHTML = '<p class="no-data">No abilities data</p>';
        return;
    }

    const boltSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

    // Sort abilities into canonical order: tech → prime → tactical → trait_1 → trait_2
    const sorted = ABILITY_ORDER.map(type => abilities.find(a => a.ability_type === type)).filter(Boolean);
    // Append any extras not in ABILITY_ORDER
    abilities.forEach(a => { if (!sorted.includes(a)) sorted.push(a); });

    container.innerHTML = sorted.map(ability => {
        const typeName = formatAbilityType(ability.ability_type);
        const typeKey  = getAbilityTypeKey(ability.ability_type);

        // Stat pills — support both old field names and new API field names
        const pills = [];
        const cd = ability.cooldown_seconds ?? ability.cooldown;
        if (cd != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--cooldown"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${cd}s CD</span>`
        );
        if (ability.duration != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--duration"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${ability.duration}s</span>`
        );
        if (ability.charges != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--charges"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>${ability.charges} charge${ability.charges !== 1 ? 's' : ''}</span>`
        );
        if (ability.range != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--range"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>${ability.range}m</span>`
        );

        return `
        <div class="ability-card ability-card--${typeKey}">
            <div class="ability-header">
                <div class="ability-icon-wrap">
                    ${ability.icon_url
                        ? `<img src="${escapeHtml(ability.icon_url)}" alt="" loading="lazy" onerror="this.outerHTML='${boltSvg.replace(/"/g, "'")}'">`
                        : boltSvg}
                </div>
                <div class="ability-header-text">
                    <div class="ability-type ability-type--${typeKey}">${typeName}</div>
                    <div class="ability-name">${escapeHtml(ability.name)}</div>
                </div>
            </div>
            ${ability.description && ability.description !== ability.name
                ? `<div class="ability-desc">${escapeHtml(ability.description)}</div>` : ''}
            ${pills.length > 0 ? `<div class="ability-stats">${pills.join('')}</div>` : ''}
        </div>`;
    }).join('') + getRatingCardHtml();
}

// Generate the community rating card HTML for the abilities grid
function getRatingCardHtml() {
    return `
    <div class="ability-card ability-card--rating" id="runnerRatingBadge">
        <div class="ability-header">
            <div class="ability-icon-wrap ability-icon-wrap--rating">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--neon)" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div class="ability-header-text">
                <div class="ability-type ability-type--rating">COMMUNITY RATING</div>
                <div class="ability-name">
                    <span class="rating-inline-stars" id="ratingBadgeStars">
                        <span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span>
                    </span>
                    <span class="rating-inline-value" id="ratingBadgeValue">-</span>
                    <span class="rating-inline-votes" id="ratingBadgeVotes">-</span>
                </div>
            </div>
        </div>
        <div class="ability-desc" id="ratingWidgetInline"></div>
    </div>`;
}

// Canonical ordering of abilities
const ABILITY_ORDER = ['tech', 'prime', 'tactical', 'trait_1', 'trait_2'];

// Format ability type
function formatAbilityType(type) {
    const types = {
        'tech': 'TECH',
        'prime': 'PRIME',
        'tactical': 'TACTICAL',
        'trait_1': 'TRAIT',
        'trait_2': 'TRAIT',
        'trait1': 'TRAIT',
        'trait2': 'TRAIT',
        'passive': 'PASSIVE'
    };
    return types[type] || type?.toUpperCase() || 'ABILITY';
}

// Get stats for a specific version
function getStatsForVersion(version) {
    if (version === 'current') {
        return runner.stats || {};
    }
    
    // Get stats from history - stats are directly on the history item
    const history = runner.history || [];
    if (history[version]) {
        return history[version];
    }
    
    return runner.stats || {};
}

// Render stats version selector
function renderStatsVersionSelector() {
    const selector = document.getElementById('statsVersionSelector');
    const history = runner.history || [];
    
    if (history.length === 0) {
        selector.style.display = 'none';
        return;
    }
    
    selector.style.display = 'flex';
    
    // Build buttons HTML
    let buttonsHtml = '';
    
    // Check if we have a current version in history
    const hasCurrent = history.some(item => item.is_current);
    
    // If current stats differ from history or no current flag, show Current button
    if (!hasCurrent) {
        buttonsHtml += `
            <button class="stat-version-btn ${selectedStatVersion === 'current' ? 'active' : ''}" 
                    onclick="selectStatVersion('current')">
                Current
            </button>
        `;
    }
    
    // Add buttons for each history item
    buttonsHtml += history.map((item, index) => {
        const label = item.season_name || item.patch_version || item.season_version || `Patch ${index + 1}`;
        return `
            <button class="stat-version-btn ${selectedStatVersion === index ? 'active' : ''}" 
                    onclick="selectStatVersion(${index})">
                ${escapeHtml(label)}
            </button>
        `;
    }).join('');
    
    selector.innerHTML = buttonsHtml;
}

// Select stat version (exposed globally for onclick)
window.selectStatVersion = function(version) {
    selectedStatVersion = version;
    renderStats();
};

// Render stats with bars
function renderStats() {
    const container = document.getElementById('statsContainer');
    
    // Render version selector if history exists
    renderStatsVersionSelector();
    
    // Get stats based on selected version
    const stats = getStatsForVersion(selectedStatVersion);
    
    // Define stat configurations
    const statConfigs = [
        { key: 'heat_capacity', label: 'Heat Capacity', maxValue: 100 },
        { key: 'agility', label: 'Agility', maxValue: 100 },
        { key: 'loot_speed', label: 'Loot Speed', maxValue: 100 },
        { key: 'melee_damage', label: 'Melee Damage', maxValue: 100 },
        { key: 'prime_recovery', label: 'Prime Recovery', maxValue: 100 },
        { key: 'tactical_recovery', label: 'Tactical Recovery', maxValue: 100 },
        { key: 'self_repair_speed', label: 'Self Repair', maxValue: 100 },
        { key: 'finisher_siphon', label: 'Finisher Siphon', maxValue: 100 },
        { key: 'revive_speed', label: 'Revive Speed', maxValue: 100 },
        { key: 'hardware', label: 'Hardware', maxValue: 100 },
        { key: 'firewall', label: 'Firewall', maxValue: 100 },
        { key: 'fall_resistance', label: 'Fall Resistance', maxValue: 100 },
        { key: 'ping_duration', label: 'Ping Duration', maxValue: 100 }
    ];
    
    let html = '';
    
    for (const config of statConfigs) {
        const value = stats[config.key];
        if (value === null || value === undefined) continue;
        
        const barPercent = Math.max(0, Math.min(100, (value / config.maxValue) * 100));
        
        html += `
            <div class="stat-bar-row">
                <div class="stat-bar-label">
                    <span>${config.label.toUpperCase()}</span>
                </div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${barPercent}%"></div>
                </div>
                <div class="stat-bar-value">${value}</div>
            </div>
        `;
    }
    
    container.innerHTML = html || '<p class="no-data">No stats available</p>';
}

// Render loadout slots
function renderLoadout() {
    const section = document.getElementById('loadoutSection');
    const container = document.getElementById('loadoutSlots');
    const slots = runner.loadout_slots || [];
    
    if (slots.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = slots.map(slot => `
        <div class="loadout-slot">
            <div class="slot-icon">${getSlotIcon(slot.slot_type)}</div>
            <div class="slot-name">${formatSlotType(slot.slot_type)}</div>
        </div>
    `).join('');
}

// Get slot icon as SVG
function getSlotIcon(type) {
    const icons = {
        'head': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="5"/>
            <path d="M5 21v-2a7 7 0 0 1 7-7v0a7 7 0 0 1 7 7v2"/>
        </svg>`,
        'chest': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 3L4 7v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V7l-8-4z"/>
        </svg>`,
        'leg': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 4v8l-2 8h4l1-4h6l1 4h4l-2-8V4"/>
            <path d="M9 4h6"/>
        </svg>`,
        'shield': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>`,
        'core1': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`,
        'core2': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`
    };
    return icons[type] || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>`;
}

// Format slot type
function formatSlotType(type) {
    const names = {
        'head': 'Head',
        'chest': 'Chest',
        'leg': 'Legs',
        'shield': 'Shield',
        'core1': 'Core 1',
        'core2': 'Core 2'
    };
    return names[type] || type?.charAt(0).toUpperCase() + type?.slice(1) || 'Unknown';
}

// Render metadata
function renderMetadata() {
    const addedEl = document.getElementById('addedDate');
    const updatedEl = document.getElementById('updatedDate');
    
    if (runner.created_at) {
        addedEl.textContent = formatDate(runner.created_at);
    }
    
    if (runner.updated_at) {
        updatedEl.textContent = formatDate(runner.updated_at);
    }
}

// Render patch history
function renderPatchHistory() {
    const tab = document.getElementById('patchHistoryTab');
    const countBadge = document.getElementById('patchHistoryCount');
    const list = document.getElementById('patchList');
    
    // Use new patch_notes structure from history endpoint
    // History is an array where each item can have a patch_notes array
    let patchNotesArray = [];
    if (Array.isArray(runner.history) && runner.history.length > 0) {
        // Flatten all patch_notes from all history items
        runner.history.forEach(historyItem => {
            if (historyItem.patch_notes && Array.isArray(historyItem.patch_notes)) {
                patchNotesArray.push(...historyItem.patch_notes);
            }
        });
    } else if (runner.history && runner.history.patch_notes && Array.isArray(runner.history.patch_notes)) {
        // Alternative format: history object with patch_notes array
        patchNotesArray = runner.history.patch_notes;
    }
    
    // Show/hide the tab based on whether there's patch history
    if (tab) {
        tab.style.display = patchNotesArray.length > 0 ? 'inline-flex' : 'none';
    }
    
    // Update count badge
    if (countBadge && patchNotesArray.length > 0) {
        countBadge.textContent = patchNotesArray.length;
        countBadge.style.display = 'inline-flex';
    }
    
    // Render patch notes using new API structure
    if (patchNotesArray.length > 0) {
        list.innerHTML = patchNotesArray.map(patch => {
            const changeType = patch.change_type || 'change';
            const changeIcon = getChangeIconForChangeType(changeType);
            
            return `
                <div class="patch-item">
                    <div class="patch-header">
                        <span class="patch-version">${escapeHtml(patch.season_name || patch.patch_version || 'Update')}</span>
                        <span class="patch-date">${patch.release_date ? formatDate(patch.release_date) : ''}</span>
                    </div>
                    <div class="patch-title">${escapeHtml(patch.title || '')}</div>
                    ${patch.description ? `
                        <div class="patch-changes">
                            <div class="patch-change ${changeType}">
                                <span class="change-icon">${changeIcon}</span>
                                <span class="change-text">${escapeHtml(patch.description)}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${patch.affected_stats && patch.affected_stats.length > 0 ? `
                        <div class="patch-affected-stats">
                            <span class="stats-label">Affected Stats:</span>
                            ${patch.affected_stats.map(stat => `<span class="affected-stat-tag">${escapeHtml(formatFieldName(stat))}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } else {
        list.innerHTML = '<div class="patch-empty"><p>No patch history available</p></div>';
    }
}

// Render history items from API
function renderHistoryItems(history) {
    return history.map(item => {
        const changes = [];
        
        // Add patch notes if available (this is the primary change description)
        if (item.patch_notes) {
            changes.push({ text: item.patch_notes, type: getChangeType(item.patch_notes) });
        }
        
        // Build list of changes from history item
        if (item.changes) {
            // If changes is an object with field changes
            if (typeof item.changes === 'object' && !Array.isArray(item.changes)) {
                for (const [field, changeData] of Object.entries(item.changes)) {
                    const oldVal = changeData.old !== undefined ? changeData.old : '';
                    const newVal = changeData.new !== undefined ? changeData.new : '';
                    const changeText = `${formatFieldName(field)}: ${oldVal} → ${newVal}`;
                    changes.push({
                        text: changeText,
                        type: determineChangeType(field, oldVal, newVal)
                    });
                }
            } else if (Array.isArray(item.changes)) {
                // If changes is an array of change strings
                changes.push(...item.changes.map(c => ({ text: c, type: getChangeType(c) })));
            } else if (typeof item.changes === 'string') {
                changes.push({ text: item.changes, type: 'change' });
            }
        }
        
        // If no structured changes and no patch notes, use description or note
        if (changes.length === 0 && (item.description || item.note)) {
            const text = item.description || item.note;
            changes.push({ text, type: getChangeType(text) });
        }
        
        return `
            <div class="patch-item">
                <div class="patch-header">
                    <span class="patch-version">${escapeHtml(item.season_name || item.patch_version || item.season_version || item.patch || item.version || item.season || 'Update')}</span>
                    <span class="patch-date">${item.release_date || item.date || item.updated_at ? formatDate(item.release_date || item.date || item.updated_at) : ''}</span>
                </div>
                ${changes.length > 0 ? `
                    <div class="patch-changes">
                        ${changes.map(change => `
                            <div class="patch-change ${change.type}">
                                <span class="change-icon">${getChangeIconForType(change.type)}</span>
                                <span class="change-text">${escapeHtml(change.text)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Format field name for display
function formatFieldName(field) {
    return field.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Determine change type based on field and values
function determineChangeType(field, oldVal, newVal) {
    // If it's a numeric stat, compare values
    const oldNum = parseFloat(oldVal);
    const newNum = parseFloat(newVal);
    
    if (!isNaN(oldNum) && !isNaN(newNum)) {
        if (newNum > oldNum) return 'buff';
        if (newNum < oldNum) return 'nerf';
    }
    
    return 'change';
}

// Get change icon for specific type
function getChangeIconForType(type) {
    if (type === 'buff') return '↑';
    if (type === 'nerf') return '↓';
    return '•';
}

// Get change icon for change_type from API
function getChangeIconForChangeType(type) {
    switch(type) {
        case 'buff': return '↑';
        case 'nerf': return '↓';
        case 'new': return '✦';
        case 'rework': return '⟳';
        case 'bugfix': return '🔧';
        case 'adjustment': return '•';
        default: return '•';
    }
}

// Get change type
function getChangeType(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('increase') || lower.includes('buff') || lower.includes('improved')) {
        return 'buff';
    }
    if (lower.includes('decrease') || lower.includes('nerf') || lower.includes('reduced')) {
        return 'nerf';
    }
    return 'change';
}

// Get change icon
function getChangeIcon(text) {
    const type = getChangeType(text);
    if (type === 'buff') return '↑';
    if (type === 'nerf') return '↓';
    return '•';
}

// Format date
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

// Show error state
function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update meta tags for SEO
function updateMetaTags() {
    const title = `${runner.name} - ${runner.role || 'Runner'} | MarathonDB`;
    const runnerDescBase = runner.description ? `${runner.description}. ` : '';
    const description = `${runnerDescBase}Discover the ${runner.name} runner class in Marathon. Explore abilities, cores, loadouts, and detailed stats on MarathonDB.`;
    const pageUrl = `${window.location.origin}/marathon/runners/${runner.slug}/`;
    const buildMetaUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const imageUrl = buildMetaUrl(runner.icon_url_high) || buildMetaUrl(runner.icon_path_high)
        || MarathonAPI.getRunnerIconUrl(runner.icon_path || runner.slug || runner.name);
    
    document.title = title;
    
    // Update meta tags
    updateMetaTag('description', description);
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', pageUrl);
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', imageUrl);
    
    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.href = pageUrl;
    }
}

// Update or create meta tag
function updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (meta) {
        meta.setAttribute('content', content);
    }
}

// Update breadcrumb with runner name
function updateBreadcrumb() {
    const breadcrumbName = document.getElementById('breadcrumbName');
    if (breadcrumbName && runner) {
        breadcrumbName.textContent = runner.name;
    }
}

// Add structured data for SEO (schema.org JSON-LD)
function addStructuredData() {
    if (!runner) return;
    
    const buildStructuredUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const imageUrl = buildStructuredUrl(runner.icon_url_high) || buildStructuredUrl(runner.icon_url)
        || buildStructuredUrl(runner.icon_path_high)
        || MarathonAPI.getRunnerIconUrl(runner.icon_path || runner.slug || runner.name);
    
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": runner.name,
        "description": runner.description || `${runner.name} character abilities and stats for Marathon`,
        "image": imageUrl,
        "brand": {
            "@type": "Brand",
            "name": "Marathon"
        },
        "category": runner.role || "Runner"
    };
    
    // Add rating data if available
    if (runner.average_rating && runner.rating_count) {
        structuredData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": runner.average_rating,
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": runner.rating_count
        };
    }
    
    // Add additional properties
    const additionalProperties = [];
    
    if (runner.role) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Role",
            "value": runner.role
        });
    }
    
    if (runner.archetype) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Archetype",
            "value": runner.archetype
        });
    }
    
    if (additionalProperties.length > 0) {
        structuredData.additionalProperty = additionalProperties;
    }
    
    // Inject or update the script tag
    let script = document.getElementById('structured-data');
    if (!script) {
        script = document.createElement('script');
        script.id = 'structured-data';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
}

// Mock cores data by runner type for testing
const MOCK_RUNNER_CORES = {
    destroyer: [
        { id: 1, name: "Rapid Engagement", slug: "rapid-engagement", rarity: "Enhanced", credits: 150 },
        { id: 2, name: "Iron Will", slug: "iron-will", rarity: "Superior", credits: 600 },
        { id: 9, name: "Fortress", slug: "fortress", rarity: "Deluxe", credits: 220 }
    ],
    assassin: [
        { id: 3, name: "Ghost Protocol", slug: "ghost-protocol", rarity: "Deluxe", credits: 200 },
        { id: 8, name: "Executioner", slug: "executioner", rarity: "Prestige", credits: 2500 }
    ],
    thief: [
        { id: 4, name: "Quick Hands", slug: "quick-hands", rarity: "Standard", credits: 50 },
        { id: 10, name: "Treasure Hunter", slug: "treasure-hunter", rarity: "Enhanced", credits: 140 }
    ],
    recon: [
        { id: 5, name: "Eagle Eye", slug: "eagle-eye", rarity: "Enhanced", credits: 120 }
    ],
    vandal: [
        { id: 6, name: "Adrenaline Rush", slug: "adrenaline-rush", rarity: "Deluxe", credits: 180 },
        { id: 11, name: "Overdrive", slug: "overdrive", rarity: "Prestige", credits: 2200 }
    ],
    triage: [
        { id: 7, name: "Combat Medic", slug: "combat-medic", rarity: "Superior", credits: 550 },
        { id: 12, name: "Field Surgeon", slug: "field-surgeon", rarity: "Enhanced", credits: 100 }
    ]
};

// ================================================================================================
// CORE DETAIL MODAL (reuses the cores page modal design)
// ================================================================================================

const CORE_RARITY_ORDER = { prestige: 0, superior: 1, deluxe: 2, enhanced: 3, standard: 4 };

function sortCoresByRarity(cores) {
    return cores.slice().sort((a, b) => {
        const ra = CORE_RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] ?? 5;
        const rb = CORE_RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] ?? 5;
        return ra - rb || (a.name || '').localeCompare(b.name || '');
    });
}

const CORE_RUNNER_ICONS = {
    destroyer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    recon:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    thief:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    assassin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14.5 4h-5L7 7H2l5.5 5.5L5 22h7l-2.5-5.5L12 13l2.5 3.5L12 22h7l-2.5-9.5L22 7h-5l-2.5-3z"/></svg>',
    vandal:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    triage:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
};

const CORE_CHANGE_TYPE_META = {
    added:     { icon: '✚', cls: 'new',    label: 'Added' },
    buffed:    { icon: '▲', cls: 'buff',   label: 'Buffed' },
    nerfed:    { icon: '▼', cls: 'nerf',   label: 'Nerfed' },
    reworked:  { icon: '⟳', cls: 'rework', label: 'Reworked' },
    removed:   { icon: '✕', cls: 'nerf',   label: 'Removed' },
    unchanged: { icon: '—', cls: 'new',    label: 'Unchanged' },
};

let currentCoreSlug = null;

function openRunnerCoreModal(slug) {
    if (!slug) return;
    currentCoreSlug = slug;
    
    const overlay = document.getElementById('coreModal');
    if (!overlay) return;
    
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Push modal ads on first open (deferred so they don't load on hidden page)
    if (!overlay._adsPushed) {
        overlay._adsPushed = true;
        overlay.querySelectorAll('ins.adsbygoogle').forEach(() => {
            try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        });
    }
    
    // Set loading state
    document.getElementById('coreModalName').textContent = 'Loading...';
    document.getElementById('coreModalDescription').textContent = '';
    document.getElementById('coreModalBadges').innerHTML = '';
    document.getElementById('coreModalQuickStats').innerHTML = '';
    document.getElementById('coreModalHistory').innerHTML = '';
    document.getElementById('coreModalMeta').innerHTML = '';
    document.getElementById('coreModalIcon').src = '';
    const histSec = document.getElementById('coreModalHistorySection');
    if (histSec) histSec.style.display = 'none';
    const ratingSec = document.getElementById('coreModalRatingSection');
    if (ratingSec) ratingSec.style.display = 'none';
    
    // Fetch and render
    MarathonAPI.getCoreBySlug(slug).then(response => {
        if (response?.data) {
            populateCoreModal(response.data);
        } else {
            document.getElementById('coreModalName').textContent = 'Core not found';
        }
    }).catch(err => {
        console.error('Failed to load core detail:', err);
        document.getElementById('coreModalName').textContent = 'Error loading core';
    });
}

function closeRunnerCoreModal() {
    const overlay = document.getElementById('coreModal');
    if (!overlay || !overlay.classList.contains('active')) return;
    
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    currentCoreSlug = null;
}

function populateCoreModal(core) {
    const rarity = (core.rarity || 'standard').toLowerCase();
    const runnerType = (core.runner_type || 'unknown').toLowerCase();
    const iconUrl = core.icon_url || MarathonAPI.getCoreIconUrl(core.icon_path || core.slug);

    // Icon
    const iconImg = document.getElementById('coreModalIcon');
    iconImg.src = iconUrl;
    iconImg.alt = core.name || '';

    const iconFrame = document.getElementById('coreModalIconFrame');
    iconFrame.className = 'core-modal-icon-frame ' + rarity;

    const glow = document.getElementById('coreModalRarityGlow');
    glow.className = 'core-modal-rarity-glow ' + rarity;

    // Name + Description
    document.getElementById('coreModalName').textContent = core.name || 'Unknown Core';
    document.getElementById('coreModalDescription').textContent = core.description || '';

    // Badges (runner + rarity + verified + purchaseable + value)
    const coreRunnerIcon = CORE_RUNNER_ICONS[runnerType] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>';
    const verifiedBadge = core.verified
        ? `<span class="cd-badge cd-badge-verified" title="Item is fully verified from ingame data">
               <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
               Verified
           </span>`
        : '';
    const purchaseableBadge = core.is_purchaseable
        ? '<span class="cd-badge cd-badge-purchaseable" title="Available from in-game vendor">\uD83C\uDFEA Purchaseable</span>'
        : '';
    const credits = core.credits;
    const valueBadge = credits
        ? `<span class="cd-badge cd-badge-value"><img src="/assets/icons/credits.webp" alt="" width="12" height="12" style="vertical-align:middle"> ${credits.toLocaleString()}</span>`
        : '';
    document.getElementById('coreModalBadges').innerHTML = `
        <span class="cd-badge cd-badge-runner ${runnerType}">${coreRunnerIcon} ${coreFormatLabel(runnerType)}</span>
        <span class="cd-badge cd-badge-rarity ${rarity}">${coreFormatLabel(rarity)}</span>
        ${verifiedBadge}
        ${purchaseableBadge}
        ${valueBadge}
    `;

    // Quick stats (vendor info only)
    coreRenderQuickStats(core);

    // Meta / Details
    coreRenderMeta(core);

    // Balance History
    coreRenderHistory(core);

    // Community Rating
    coreRenderRatingWidget(core);

    // Share buttons
    coreBindShareButtons(core);
}

function coreRenderQuickStats(core) {
    const stats = [];
    const qsSection = document.getElementById('coreModalQuickStats');
    if (core.is_purchaseable) {
        if (core.vendor_name) {
            stats.push('<div class="core-modal-qs"><span class="core-modal-qs-label">Vendor</span><span class="core-modal-qs-value">' + escapeHtml(core.vendor_name) + '</span></div>');
        }
        if (core.vendor_rank) {
            stats.push('<div class="core-modal-qs"><span class="core-modal-qs-label">Required Rank</span><span class="core-modal-qs-value">' + escapeHtml(core.vendor_rank) + '</span></div>');
        }
        if (core.purchase_location) {
            stats.push('<div class="core-modal-qs"><span class="core-modal-qs-label">Location</span><span class="core-modal-qs-value">' + escapeHtml(core.purchase_location) + '</span></div>');
        }
    }
    qsSection.innerHTML = stats.join('');
    qsSection.style.display = stats.length ? '' : 'none';
}

function coreRenderHistory(core) {
    const history = core.history || [];
    const section = document.getElementById('coreModalHistorySection');
    const container = document.getElementById('coreModalHistory');
    if (!history.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    container.innerHTML = history.map((h, i) => {
        const meta = CORE_CHANGE_TYPE_META[h.change_type] || CORE_CHANGE_TYPE_META.unchanged;
        const isLast = i === history.length - 1;
        let changesHtml = '';
        if (h.previous_values || h.new_values) {
            try {
                const prev = typeof h.previous_values === 'string' ? JSON.parse(h.previous_values) : h.previous_values;
                const next = typeof h.new_values === 'string' ? JSON.parse(h.new_values) : h.new_values;
                const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
                changesHtml = Array.from(allKeys).map(key => {
                    const oldVal = prev?.[key] ?? '—';
                    const newVal = next?.[key] ?? '—';
                    const direction = (typeof newVal === 'number' && typeof oldVal === 'number')
                        ? (newVal > oldVal ? 'buff' : newVal < oldVal ? 'nerf' : '') : '';
                    return '<div class="core-modal-hist-change">' +
                        '<span class="core-modal-hist-key">' + coreFormatLabel(key) + '</span>' +
                        '<span class="core-modal-hist-old">' + oldVal + '</span>' +
                        '<span class="core-modal-hist-arrow">→</span>' +
                        '<span class="core-modal-hist-new ' + direction + '">' + newVal + '</span></div>';
                }).join('');
            } catch (_) { /* ignore parse errors */ }
        }
        return `
            <div class="core-modal-hist-entry">
                <div class="core-modal-hist-marker">
                    <div class="core-modal-hist-dot ${meta.cls}">${meta.icon}</div>
                    ${!isLast ? '<div class="core-modal-hist-line"></div>' : ''}
                </div>
                <div class="core-modal-hist-body">
                    <div class="core-modal-hist-header">
                        <span class="change-type-badge ${meta.cls}">${meta.label}</span>
                        ${h.patch_number ? '<span class="core-modal-hist-patch">v' + h.patch_number + '</span>' : ''}
                        ${h.season_name ? '<span class="core-modal-hist-season">' + escapeHtml(h.season_name) + '</span>' : ''}
                        ${h.changed_at ? '<span class="core-modal-hist-date">' + new Date(h.changed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span>' : ''}
                    </div>
                    ${h.summary ? '<p class="core-modal-hist-summary">' + escapeHtml(h.summary) + '</p>' : ''}
                    ${changesHtml ? '<div class="core-modal-hist-changes">' + changesHtml + '</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function coreRenderMeta(core) {
    const rows = [];
    if (core.season_name) rows.push(['Season', escapeHtml(core.season_name)]);
    if (core.patch_number) rows.push(['Introduced', 'v' + escapeHtml(core.patch_number)]);
    if (core.is_active !== undefined) rows.push(['Status', core.is_active ? 'Active' : 'Inactive']);

    const container = document.getElementById('coreModalMeta');
    if (!rows.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="core-modal-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <h3>Details</h3>
        </div>
        <dl class="core-modal-meta-list">
            ${rows.map(([k, v]) => '<div class="core-modal-meta-row"><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('')}
        </dl>
        <a href="/cores/?core=${encodeURIComponent(currentCoreSlug)}" class="core-modal-full-link">View on Cores Hub \u2192</a>
    `;
}

function coreBindShareButtons(core) {
    const slug = core.slug || '';
    const name = core.name || 'Core';
    const url = window.location.origin + '/marathon/cores/?core=' + encodeURIComponent(slug);

    const twitterBtn = document.getElementById('coreShareTwitter');
    const discordBtn = document.getElementById('coreShareDiscord');
    const copyBtn = document.getElementById('coreShareCopy');
    const toast = document.getElementById('coreShareToast');

    function showToast(msg, cls) {
        if (!toast) return;
        toast.textContent = msg;
        toast.className = 'item-share-toast active' + (cls ? ' ' + cls : '');
        setTimeout(() => { toast.className = 'item-share-toast'; }, 2000);
    }

    if (twitterBtn) {
        const newBtn = twitterBtn.cloneNode(true);
        twitterBtn.parentNode.replaceChild(newBtn, twitterBtn);
        newBtn.id = 'coreShareTwitter';
        newBtn.addEventListener('click', () => {
            const text = encodeURIComponent('Check out ' + name + ' on MarathonDB');
            window.open('https://x.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(url), '_blank', 'width=550,height=420');
        });
    }
    if (discordBtn) {
        const newBtn = discordBtn.cloneNode(true);
        discordBtn.parentNode.replaceChild(newBtn, discordBtn);
        newBtn.id = 'coreShareDiscord';
        newBtn.addEventListener('click', () => {
            const discordText = '**' + name + '**\\n' + url;
            navigator.clipboard.writeText(discordText).then(() => {
                newBtn.classList.add('copied');
                showToast('Copied for Discord!', 'toast-discord');
                setTimeout(() => newBtn.classList.remove('copied'), 2000);
            });
        });
    }
    if (copyBtn) {
        const newBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newBtn, copyBtn);
        newBtn.id = 'coreShareCopy';
        newBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(url).then(() => {
                newBtn.classList.add('copied');
                showToast('Link copied!', 'toast-copy');
                setTimeout(() => newBtn.classList.remove('copied'), 2000);
            });
        });
    }
}

function coreRenderRatingWidget(core) {
    const section = document.getElementById('coreModalRatingSection');
    const container = document.getElementById('coreModalRating');
    if (!section || !container) return;

    // Use the shared renderCoreRatingWidget from cores.js if available
    if (typeof renderCoreRatingWidget === 'function') {
        section.style.display = '';
        renderCoreRatingWidget(core);
        return;
    }

    // Fallback: simple display from API data
    const rating = core.rating;
    if (!rating || !rating.total_votes) {
        section.style.display = 'none';
        return;
    }
    section.style.display = '';
    container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.85rem;">Community rating: ' + rating.approval_percentage + '% (' + rating.total_votes + ' vote' + (rating.total_votes !== 1 ? 's' : '') + ')</div>';
}

function coreFormatLabel(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Wire up core modal events (called once from DOMContentLoaded)
function setupCoreModalEvents() {
    document.getElementById('coreModalBackdrop')?.addEventListener('click', closeRunnerCoreModal);
    document.getElementById('coreModalClose')?.addEventListener('click', closeRunnerCoreModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentCoreSlug) closeRunnerCoreModal();
    });
}

// Load and display cores for this runner
async function loadRunnerCores() {
    const section = document.getElementById('coresSection');
    const grid = document.getElementById('runnerCoresGrid');
    
    if (!section || !grid || !runner.role) {
        return;
    }
    
    // Get runner type from role (e.g., "Destroyer" -> "destroyer")
    const runnerType = runner.role.toLowerCase();
    let cores = [];
    
    try {
        const response = await MarathonAPI.getCoresByRunner(runnerType);
        
        if (response && response.data && response.data.length > 0) {
            cores = response.data;
        } else {
            // API not ready - use mock data
            console.warn('Cores API not available, using mock data for runner:', runnerType);
            cores = MOCK_RUNNER_CORES[runnerType] || [];
        }
    } catch (error) {
        console.warn('Could not load runner cores, using mock data:', error);
        cores = MOCK_RUNNER_CORES[runnerType] || [];
    }
    
    if (cores.length > 0) {
        section.style.display = 'block';
        
        // Sort by rarity and display up to 6 cores
        const displayCores = sortCoresByRarity(cores).slice(0, 6);
        
        grid.innerHTML = displayCores.map(core => {
            const iconUrl = core.icon_url || MarathonAPI.getCoreIconUrl(core.icon_path || core.slug);
            const rarity = (core.rarity || 'standard').toLowerCase();
            const credits = core.credits || core.cost || '-';
            
            return `
                <div class="runner-core-card ${rarity}" role="button" tabindex="0" onclick="openRunnerCoreModal('${(core.slug || core.id).replace(/'/g, "\\'")}')"
                     style="cursor:pointer">
                    <div class="runner-core-icon ${rarity}">
                        <img src="${iconUrl}" alt="${escapeHtml(core.name)}" onerror="this.style.display='none'">
                    </div>
                    <div class="runner-core-info">
                        <div class="runner-core-name">${escapeHtml(core.name || 'Unknown')}</div>
                        <div class="runner-core-rarity ${rarity}">${escapeHtml(core.rarity || 'Standard')}</div>
                    </div>
                    <div class="runner-core-cost">
                        <img src="/assets/icons/credits.webp" alt="Credits" class="credits-icon">
                        ${typeof credits === 'number' ? credits.toLocaleString() : credits}
                    </div>
                </div>
            `;
        }).join('');
        
        // Update the "View All" link
        const viewAllLink = section.querySelector('.section-view-all');
        if (viewAllLink) {
            viewAllLink.href = `/cores/?runner=${runnerType}`;
        }
    } else {
        section.style.display = 'none';
    }
}

// ===== TAB NAVIGATION =====

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.runner-tab');

    // Set abilities as active by default if no tab is already marked active
    const hasActive = Array.from(tabs).some(t => t.classList.contains('active'));
    if (!hasActive) {
        const defaultTab = document.querySelector('.runner-tab[data-tab="abilities"]');
        if (defaultTab) {
            defaultTab.classList.add('active');
            document.getElementById('abilitiesTabContent')?.classList.add('active');
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            document.querySelectorAll('.runner-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}TabContent`)?.classList.add('active');
            
            // Load or render skins when switching to skins tab
            if (targetTab === 'skins' && runner) {
                if (!skinsLoaded) {
                    loadRunnerSkins();
                } else {
                    renderRunnerSkins(); // already pre-fetched; just render
                }
            }

            // Load or render cores when switching to cores tab
            if (targetTab === 'cores' && runner) {
                if (!coresLoaded) {
                    loadRunnerCoresTab();
                } else {
                    renderRunnerCoresTab(); // already pre-fetched; just render
                }
            }
        });
    });
}

// ===== RUNNER SKINS =====

/**
 * Load skins for the current runner (using V3 API)
 */
async function loadRunnerSkins() {
    const container = document.getElementById('skinsContainer');
    if (!container || !runner) return;
    
    try {
        const response = await fetch(`${RUNNER_SKINS_API}?per_page=100&page=1`);
        const result = await response.json();
        const allSkins = result.data || (result.skins && result.skins.data) || [];
        
        const filtered = allSkins.filter(s => s.runner && s.runner.slug === runner.slug);
        
        if (filtered.length > 0) {
            runnerSkins = filtered.map(skin => ({
                ...skin,
                name: skin.display_name || skin.name,
                icon_path: (skin.image && (skin.image.card || skin.image.thumbnail)) || '',
                collection_name: skin.collection?.name || '',
            }));
            skinsLoaded = true;
            
            const countBadge = document.getElementById('skinsCount');
            if (countBadge) {
                countBadge.textContent = runnerSkins.length;
                countBadge.style.display = 'inline-flex';
            }
            
            renderRunnerSkins();
        } else {
            container.innerHTML = '<div class="skins-empty"><p>No skins available yet</p></div>';
        }
    } catch (error) {
        console.error('Failed to load runner skins:', error);
        container.innerHTML = '<div class="skins-empty"><p>Failed to load skins</p></div>';
    }
}

// ===== RUNNER CORES TAB =====

/**
 * Load cores for the current runner (for the Cores tab)
 */
async function loadRunnerCoresTab() {
    const container = document.getElementById('coresContainer');
    if (!container || !runner) return;
    
    try {
        const response = await MarathonAPI.getCoresByRunner(runner.slug);
        
        if (response && response.data && response.data.length > 0) {
            runnerCores = sortCoresByRarity(response.data).slice(0, 10);
            coresLoaded = true;
            
            // Update cores count badge
            const countBadge = document.getElementById('coresCount');
            if (countBadge && runnerCores.length > 0) {
                countBadge.textContent = runnerCores.length;
                countBadge.style.display = 'inline-flex';
            }
            
            renderRunnerCoresTab();
        } else {
            container.innerHTML = `
                <div class="skins-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="4"/>
                    </svg>
                    <p>No cores available for ${escapeHtml(runner.name)} yet</p>
                    <span class="skins-empty-hint">Check back as more cores are added to the database</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load runner cores:', error);
        container.innerHTML = '<div class="skins-empty"><p>Failed to load cores</p></div>';
    }
}

/**
 * Render the cores grid in the tab
 */
function renderRunnerCoresTab() {
    const container = document.getElementById('coresContainer');
    if (!container) return;
    
    if (runnerCores.length === 0) {
        container.innerHTML = `
            <div class="skins-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                </svg>
                <p>No cores available for ${escapeHtml(runner.name)} yet</p>
                <span class="skins-empty-hint">Check back as more cores are added to the database</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="skins-header">
            <h3 class="skins-title">Compatible Cores</h3>
            <span class="skins-subtitle">${runnerCores.length} core${runnerCores.length !== 1 ? 's' : ''} found</span>
        </div>
        <div class="cores-tab-grid">
            ${runnerCores.map(core => renderCoreCard(core)).join('')}
        </div>
        <div class="skins-view-more">
            <a href="/cores/" class="view-more-btn">
                <span>View All Cores</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </a>
        </div>
    `;
}

/**
 * Render a single core card
 */
function renderCoreCard(core) {
    const iconUrl = core.icon_url || MarathonAPI.getCoreIconUrl(core.icon_path || core.slug);
    const rarity = (core.rarity || 'standard').toLowerCase();
    const credits = core.credits || core.cost || '-';
    
    return `
        <div class="core-tab-card ${rarity}" role="button" tabindex="0" onclick="openRunnerCoreModal('${(core.slug || core.id).replace(/'/g, "\\'")}')"
             style="cursor:pointer">
            <div class="core-tab-icon">
                <img src="${iconUrl}" alt="${escapeHtml(core.name)}" onerror="this.style.display='none'">
            </div>
            <div class="core-tab-info">
                <div class="core-tab-name">${escapeHtml(core.name || 'Unknown')}</div>
                <div class="core-tab-rarity ${rarity}">${escapeHtml(core.rarity || 'Standard')}</div>
                ${core.description ? `<div class="core-tab-desc">${escapeHtml(core.description.substring(0, 80))}${core.description.length > 80 ? '...' : ''}</div>` : ''}
            </div>
            <div class="core-tab-cost">
                <img src="/assets/icons/credits.webp" alt="Credits" class="credits-icon">
                ${typeof credits === 'number' ? credits.toLocaleString() : credits}
            </div>
        </div>
    `;
}

/**
 * Render the skins grid — clean preview cards
 */
function renderRunnerSkins() {
    const container = document.getElementById('skinsContainer');
    if (!container) return;
    
    if (runnerSkins.length === 0) {
        container.innerHTML = `
            <div class="skins-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="8" r="5"/>
                    <path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
                <p>No skins available for ${escapeHtml(runner.name)} yet</p>
                <span class="skins-empty-hint">Check back as more cosmetics are added to the database</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="rd-skins-grid">
            ${runnerSkins.map(skin => renderRunnerSkinCard(skin)).join('')}
        </div>
        <div class="skins-view-more">
            <a href="/runner-skins/?runner=${runner.slug}" class="view-more-btn">
                <span>View All Runner Skins</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </a>
        </div>
    `;
}

/**
 * Render a single skin card — image preview + name + rarity tag
 */
function renderRunnerSkinCard(skin) {
    const iconPath = skin.icon_path || skin.icon_path_low || '';
    const imageUrl = iconPath 
        ? (iconPath.startsWith('http') ? iconPath : `${RUNNER_SKINS_CDN}/${iconPath}`)
        : '';
    
    const rarityClass = skin.rarity?.toLowerCase() || 'common';
    const rarityLabel = skin.rarity ? skin.rarity.charAt(0).toUpperCase() + skin.rarity.slice(1).toLowerCase() : 'Common';
    
    return `
        <a href="/runner-skins/${skin.slug}/" class="rd-skin-card" data-rarity="${rarityClass}">
            <div class="rd-skin-image">
                ${imageUrl ? `
                    <img src="${imageUrl}" 
                         alt="${escapeHtml(skin.name)}" 
                         loading="lazy"
                         onerror="this.style.display='none'">
                ` : `
                    <div class="rd-skin-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="8" r="5"/>
                            <path d="M20 21a8 8 0 1 0-16 0"/>
                        </svg>
                    </div>
                `}
                <span class="rd-skin-rarity rarity-${rarityClass}">${rarityLabel}</span>
            </div>
            <div class="rd-skin-info">
                <span class="rd-skin-name">${escapeHtml(skin.name)}</span>
            </div>
        </a>
    `;
}

// ================================================================================================
// SHARE BUTTONS
// ================================================================================================

function setupShareButtons() {
    const shareTwitter = document.getElementById('shareTwitter');
    const shareDiscord = document.getElementById('shareDiscord');
    const shareCopy = document.getElementById('shareCopy');

    if (!runner) return;

    const runnerUrl = window.location.href.split('#')[0];
    const runnerName = runner.name || 'Runner';
    const runnerDesc = runner.description || runner.role || '';

    // X (Twitter) Share
    if (shareTwitter) {
        shareTwitter.addEventListener('click', () => {
            const text = `Check out ${runnerName} in Marathon! ${runnerDesc}`;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(runnerUrl)}`;
            window.open(twitterUrl, '_blank', 'width=550,height=420');
        });
    }

    // Discord Share (copy markdown-formatted text)
    if (shareDiscord) {
        shareDiscord.addEventListener('click', () => {
            const discordText = `**${runnerName}** - ${runnerDesc}\n${runnerUrl}`;
            navigator.clipboard.writeText(discordText).then(() => {
                shareDiscord.classList.add('copied');
                showInlineToast(shareDiscord, '\u2713 Copied for Discord');
                setTimeout(() => shareDiscord.classList.remove('copied'), 2000);
            }).catch(err => console.error('Failed to copy:', err));
        });
    }

    // Copy Link
    if (shareCopy) {
        shareCopy.addEventListener('click', () => {
            navigator.clipboard.writeText(runnerUrl).then(() => {
                shareCopy.classList.add('copied');
                showInlineToast(shareCopy, '\u2713 Link copied!');
                setTimeout(() => shareCopy.classList.remove('copied'), 2000);
            }).catch(err => console.error('Failed to copy:', err));
        });
    }
}

// Show a small floating toast anchored above the button that triggered it
function showInlineToast(buttonEl, message) {
    const existing = document.getElementById('inline-share-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'inline-share-toast';
    toast.className = 'inline-share-toast';
    toast.textContent = message;

    const rect = buttonEl.getBoundingClientRect();
    toast.style.left = (rect.left + rect.width / 2) + 'px';
    toast.style.top  = (rect.top - 44) + 'px';

    document.body.appendChild(toast);
    // Double rAF ensures transition fires after paint
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 200);
    }, 1800);
}

// ================================================================================================
// IMAGE LIGHTBOX
// ================================================================================================

function openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.className = 'ws-lightbox-overlay';
    overlay.innerHTML = `
        <div class="ws-lightbox-content">
            <img src="${src}" alt="Full size preview">
            <button class="ws-lightbox-close">&times;</button>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay || ev.target.classList.contains('ws-lightbox-close')) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        }
    });
}

function setupImageLightbox() {
    const imageContainer = document.querySelector('.detail-image.runner-portrait');
    const img = document.getElementById('runnerImage');
    if (imageContainer && img) {
        imageContainer.addEventListener('click', () => {
            openLightbox(img.src);
        });
    }
}

// ================================================================================================
// PRE-FETCH TAB COUNTS
// ================================================================================================

/**
 * Eagerly fetch skins and cores counts on page load so the tab badges
 * are populated before the user ever clicks a tab.
 * Also pre-loads the full data so the first tab switch is instant.
 */
async function prefetchTabCounts() {
    if (!runner?.slug) return;

    // --- Skins ---
    try {
        const res  = await fetch(`${RUNNER_SKINS_API}?per_page=100&page=1`);
        const data = await res.json();
        const allSkins = data.data || (data.skins && data.skins.data) || [];
        const filtered = allSkins.filter(s => s.runner && s.runner.slug === runner.slug);
        if (filtered.length > 0) {
            runnerSkins = filtered.map(skin => ({
                ...skin,
                name: skin.display_name || skin.name,
                icon_path: (skin.image && (skin.image.card || skin.image.thumbnail)) || '',
                collection_name: skin.collection?.name || '',
            }));
            skinsLoaded = true;
            const badge = document.getElementById('skinsCount');
            if (badge) { badge.textContent = runnerSkins.length; badge.style.display = 'inline-flex'; }
        }
    } catch (_) { /* silently ignore */ }

    // --- Cores ---
    try {
        const response = await MarathonAPI.getCoresByRunner(runner.slug);
        if (response?.data?.length > 0) {
            runnerCores = sortCoresByRarity(response.data).slice(0, 10);
            coresLoaded = true;
            const badge = document.getElementById('coresCount');
            if (badge) { badge.textContent = runnerCores.length; badge.style.display = 'inline-flex'; }
        }
    } catch (_) { /* silently ignore */ }
}

// ================================================================================================
// STAT HISTORY CHART
// ================================================================================================

function renderStatHistoryChart() {
    const container = document.getElementById('statHistoryChart');
    const history = runner?.history || [];
    
    if (!container ||history.length < 2) {
        if (container) container.style.display = 'none';
        return;
    }

    // Show the container
    container.style.display = 'block';

    const chartStats = [
        { key: 'heat_capacity', label: 'Heat Capacity', color: '#ef4444' },
        { key: 'agility', label: 'Agility', color: '#f59e0b' },
        { key: 'loot_speed', label: 'Loot Speed', color: '#22c55e' },
        { key: 'melee_damage', label: 'Melee Damage', color: '#3b82f6' },
        { key: 'prime_recovery', label: 'Prime Recovery', color: '#a855f7' },
        { key: 'tactical_recovery', label: 'Tactical Recovery', color: '#06b6d4' },
        { key: 'self_repair_speed', label: 'Self Repair', color: '#ec4899' },
        { key: 'finisher_siphon', label: 'Finisher Siphon', color: '#14b8a6' },
        { key: 'revive_speed', label: 'Revive Speed', color: '#f97316' },
        { key: 'hardware', label: 'Hardware', color: '#8b5cf6' },
        { key: 'firewall', label: 'Firewall', color: '#10b981' },
        { key: 'fall_resistance', label: 'Fall Resistance', color: '#6366f1' },
        { key: 'ping_duration', label: 'Ping Duration', color: '#f43f5e' },
    ];

    // Only show charts for stats that have varying values across seasons
    const chartsToRender = chartStats.filter(stat => {
        const vals = history.map(s => s[stat.key]).filter(v => v !== null && v !== undefined);
        if (vals.length < 2) return false;
        return new Set(vals.map(Number)).size > 1; // Only if values actually changed
    });

    if (chartsToRender.length === 0) {
        container.style.display = 'none';
        return;
    }

    const seasons = history.map(s => s.season_name || s.season_version || `S${s.season_id}`);

    container.innerHTML = `
        <h3 class="stats-group-title">Stat Changes Over Time</h3>
        <div class="stat-charts-grid">
            ${chartsToRender.map(stat => {
                const vals = history.map(s => {
                    const v = s[stat.key];
                    return v !== null && v !== undefined ? Number(v) : null;
                });
                return renderRunnerMiniChart(stat, vals, seasons);
            }).join('')}
        </div>
    `;
}

function renderRunnerMiniChart(stat, values, seasons) {
    const validVals = values.filter(v => v !== null);
    if (validVals.length < 2) return '';

    const minVal = Math.min(...validVals);
    const maxVal = Math.max(...validVals);
    const range = maxVal - minVal || 1;

    const W = 200;
    const H = 60;
    const padX = 4;
    const padY = 6;
    const chartW = W - padX * 2;
    const chartH = H - padY * 2;

    // Build points
    const points = [];
    const dots = [];
    values.forEach((v, i) => {
        if (v === null) return;
        const x = padX + (i / (values.length - 1)) * chartW;
        const y = padY + chartH - ((v - minVal) / range) * chartH;
        points.push(`${x},${y}`);
        dots.push({ x, y, val: v, season: seasons[i] });
    });

    const polyline = points.join(' ');

    // First and last values
    const first = validVals[0];
    const last = validVals[validVals.length - 1];
    const diff = last - first;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    const diffClass = diff > 0 ? 'chart-up' : diff < 0 ? 'chart-down' : 'chart-neutral';

    return `<div class="stat-mini-chart">
        <div class="chart-header">
            <span class="chart-label" style="color: ${stat.color}">${stat.label}</span>
            <span class="chart-diff ${diffClass}">${diffStr}</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="none">
            <polyline points="${polyline}" fill="none" stroke="${stat.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
            ${dots.map(d => `<circle cx="${d.x}" cy="${d.y}" r="3" fill="${stat.color}" stroke="var(--bg-card)" stroke-width="1.5"><title>${d.season}: ${d.val}</title></circle>`).join('')}
        </svg>
        <div class="chart-range">
            <span>${minVal}</span>
            <span>${maxVal}</span>
        </div>
    </div>`;
}

// ─── Community Rating Timeline Chart (Chart.js) ────────────
async function renderRatingTimeline() {
    const container = document.getElementById('ratingTimelineChart');
    if (!container || !runner?.slug) return;

    if (typeof RatingsAPI === 'undefined' || typeof RatingsAPI.getRunnerTimeline !== 'function') {
        return;
    }

    try {
        const res = await RatingsAPI.getRunnerTimeline(runner.slug, { days: 365, granularity: 'day' });

        if (!res.success || !res.timeline || res.timeline.length < 2) {
            container.style.display = 'none';
            return;
        }

        const timeline = res.timeline;
        container.style.display = 'block';

        // Format dates — adapt format to data density
        const dateFormat = timeline.length > 60
            ? { month: 'short', year: '2-digit' }
            : { month: 'short', day: 'numeric' };
        const labels = timeline.map(p => {
            const d = new Date(p.period + 'T00:00:00');
            return d.toLocaleDateString('en-US', dateFormat);
        });
        const ratings = timeline.map(p => p.average_rating);
        const votes = timeline.map(p => p.votes);

        container.innerHTML = `
            <h3 class="stats-group-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Community Rating Over Time
            </h3>
            <div class="rating-timeline-canvas-wrap">
                <canvas id="ratingTimelineCanvas"></canvas>
            </div>
        `;

        // Wait for Chart.js to be available (loaded via defer)
        if (typeof Chart === 'undefined') {
            container.style.display = 'none';
            return;
        }

        const canvas = document.getElementById('ratingTimelineCanvas');
        const ctx = canvas.getContext('2d');

        const neonColor = getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#d4ff00';

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Avg Rating',
                    data: ratings,
                    borderColor: neonColor,
                    backgroundColor: neonColor + '1a',
                    fill: true,
                    tension: 0.35,
                    pointRadius: timeline.length > 60 ? 1 : 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: neonColor,
                    pointBorderColor: 'rgba(0,0,0,0.5)',
                    pointBorderWidth: 1,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(20, 20, 30, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: neonColor + '40',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                const idx = ctx.dataIndex;
                                return `Rating: ${ratings[idx].toFixed(2)}★  (${votes[idx]} vote${votes[idx] !== 1 ? 's' : ''})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            color: 'rgba(255,255,255,0.5)',
                            font: { size: 11 },
                            callback: v => v + '★'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.06)',
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255,255,255,0.4)',
                            font: { size: 10 },
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 15,
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (err) {
        console.warn('Failed to render rating timeline:', err);
        container.style.display = 'none';
    }
}
