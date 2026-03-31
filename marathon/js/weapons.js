// Weapons Page JavaScript

let allWeapons = [];
let categories = [];
let currentCategory = '';
let searchTerm = '';
let currentSort = 'votes';
let weaponRatings = {}; // Cache for weapon ratings
let weaponSkinCounts = {}; // V3 cosmetics skin counts per weapon slug
let weaponModCounts = {}; // Mod counts per weapon slug
// ── COMPARE MODE ──
let weaponSparklineData = {}; // Cache: slug -> [avg_rating values]
let compareMode = false;
let compareSlots = []; // max 4 slugs
const COMPARE_MAX = 4;

// Ammo type icons
const ammoIcons = {
    kinetic: `<svg viewBox="0 0 24 24" fill="currentColor" class="ammo-icon ammo-kinetic"><circle cx="12" cy="12" r="8"/></svg>`,
    energy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ammo-icon ammo-energy"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    power: `<svg viewBox="0 0 24 24" fill="currentColor" class="ammo-icon ammo-power"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    special: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ammo-icon ammo-special"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

// Read SSG-baked badge counts from the inline JSON block (avoids querying 30 card DOMs)
function scrapeSSGBadgeCounts() {
    const el = document.getElementById('ssg-badge-counts');
    if (!el) return;
    try {
        const data = JSON.parse(el.textContent);
        if (data.mods) Object.entries(data.mods).forEach(([slug, n]) => { if (weaponModCounts[slug] == null) weaponModCounts[slug] = n; });
        if (data.skins) Object.entries(data.skins).forEach(([slug, n]) => { if (weaponSkinCounts[slug] == null) weaponSkinCounts[slug] = n; });
    } catch (e) {
        console.warn('Failed to parse SSG badge counts:', e);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Capture SSG-baked badge counts before the grid is overwritten
    scrapeSSGBadgeCounts();

    // Load all data sources in parallel (no rendering yet)
    await Promise.all([
        loadCategories(),
        loadWeapons(),
        loadWeaponSkinCounts()
    ]);
    
    // Apply skin & mod counts to weapon data objects (no re-render)
    applyV3SkinCounts();
    await loadWeaponModCounts();
    applyModCounts();
    
    // Single initial render after all data is ready
    renderCategoryTabs();
    filterAndDisplayWeapons();
    
    setupEventListeners();
    setupCompareMode();
    
    // Load ratings after weapons are displayed, then combined all-time votes, then sparklines
    loadWeaponRankings().then(() => loadCombinedVotes()).then(() => loadWeaponSparklines());
});

// Setup event listeners
function setupEventListeners() {
    // Search input
    document.getElementById('weaponSearch')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        filterAndDisplayWeapons();
    });
    
    // Sort select
    document.getElementById('weaponSort')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndDisplayWeapons();
    });
    
    // Category tabs (delegated)
    document.getElementById('categoryTabs')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.weapon-filter-btn') || (e.target.classList.contains('category-tab-sm') ? e.target : null);
        if (btn) {
            document.querySelectorAll('.weapon-filter-btn, .category-tab-sm').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            filterAndDisplayWeapons();
        }
    });
    
    // Modal close
    document.getElementById('weaponModal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeModal();
    });
    
    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Load categories
async function loadCategories() {
    try {
        const response = await WeaponsAPI.getCategories();
        if (response?.data) {
            categories = response.data;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Render category tabs
function renderCategoryTabs() {
    // Target the filters sub-container if it exists, otherwise fall back to legacy container
    const container = document.querySelector('.weapons-toolbar-filters') || document.getElementById('categoryTabs');
    if (!container) return;
    
    // Count weapons per category
    const catCounts = {};
    allWeapons.forEach(w => {
        const slug = w.category_slug || w.category || '';
        catCounts[slug] = (catCounts[slug] || 0) + 1;
    });

    // Use weapon-filter-btn class for the new square design, with category-tab-sm fallback
    const btnClass = document.querySelector('.weapons-toolbar-filters') ? 'weapon-filter-btn' : 'category-tab-sm';

    container.innerHTML = `
        <button class="${btnClass} active" data-category="">All <span class="tab-count">${allWeapons.length}</span></button>
        ${categories.map(cat => {
            const slug = cat.slug || cat.name;
            const count = catCounts[slug] || catCounts[cat.name] || 0;
            return `<button class="${btnClass}" data-category="${slug}">${cat.name} <span class="tab-count">${count}</span></button>`;
        }).join('')}
    `;
}

// Load weapons
async function loadWeapons() {
    try {
        const response = await WeaponsAPI.getWeapons();
        if (response?.data) {
            allWeapons = response.data;
            // Update weapon count in header
            const countEl = document.getElementById('weaponCount');
            if (countEl) countEl.textContent = `(${allWeapons.length})`;
        } else {
            showError('Failed to load weapons');
        }
    } catch (error) {
        console.error('Error loading weapons:', error);
        showError('Failed to load weapons');
    }
}

// Load weapon mod counts from the dedicated counts endpoint
async function loadWeaponModCounts() {
    try {
        const res = await fetch('https://mods.marathondb.gg/api/mods/counts');
        const json = await res.json();
        if (json?.success && json.data && Object.keys(json.data).length > 0) {
            // Merge API data over any SSG-scraped fallback
            Object.assign(weaponModCounts, json.data);
        }
    } catch (error) {
        console.warn('Failed to load weapon mod counts:', error);
    }
}

// Apply mod counts to loaded weapons (uses API data or SSG-scraped fallback)
function applyModCounts() {
    if (Object.keys(weaponModCounts).length === 0) return;
    allWeapons.forEach(w => {
        const slug = w.slug || w.id;
        if (weaponModCounts[slug] != null && w.mods_count == null) {
            w.mods_count = weaponModCounts[slug];
        }
    });
}

// Load weapon skin counts from the dedicated counts endpoint
async function loadWeaponSkinCounts() {
    try {
        const res = await fetch('https://weaponskins.marathondb.gg/api/skins/counts');
        const json = await res.json();
        if (json?.success && json.data && Object.keys(json.data).length > 0) {
            // Merge API data over any SSG-scraped fallback
            Object.assign(weaponSkinCounts, json.data);
        }
    } catch (error) {
        console.warn('Failed to load weapon skin counts:', error);
    }
}

// Apply skin counts to loaded weapons (sourced from weapon skins API)
function applyV3SkinCounts() {
    if (Object.keys(weaponSkinCounts).length === 0) return;
    allWeapons.forEach(w => {
        const slug = w.slug || w.id;
        w.skins_count = weaponSkinCounts[slug] || 0;
    });
}

// Sort weapons
function sortWeapons(weapons) {
    const sorted = [...weapons];
    switch (currentSort) {
        case 'rating':
            return sorted.sort((a, b) => {
                const rA = weaponRatings[a.slug || a.id];
                const rB = weaponRatings[b.slug || b.id];
                const avgA = rA && rA.total_votes > 0 ? rA.average_rating : -1;
                const avgB = rB && rB.total_votes > 0 ? rB.average_rating : -1;
                if (avgB !== avgA) return avgB - avgA;
                const votesA = rA ? rA.total_votes : 0;
                const votesB = rB ? rB.total_votes : 0;
                return votesB - votesA;
            });
        case 'name':
            return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        case 'name-desc':
            return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        case 'damage':
            return sorted.sort((a, b) => (b.stats?.damage || 0) - (a.stats?.damage || 0));
        case 'rpm':
            return sorted.sort((a, b) => (b.stats?.rate_of_fire || 0) - (a.stats?.rate_of_fire || 0));
        case 'category':
            return sorted.sort((a, b) => (a.category_name || '').localeCompare(b.category_name || ''));
        case 'newest':
            return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
        case 'votes':
            return sorted.sort((a, b) => {
                const rA = weaponRatings[a.slug || a.id];
                const rB = weaponRatings[b.slug || b.id];
                const votesA = rA ? rA.total_votes : 0;
                const votesB = rB ? rB.total_votes : 0;
                if (votesB !== votesA) return votesB - votesA;
                const avgA = rA && rA.total_votes > 0 ? rA.average_rating : -1;
                const avgB = rB && rB.total_votes > 0 ? rB.average_rating : -1;
                return avgB - avgA;
            });
        default:
            return sorted;
    }
}

// Filter and display
function filterAndDisplayWeapons() {
    let filtered = allWeapons;
    
    // Filter by category
    if (currentCategory) {
        filtered = filtered.filter(w => 
            w.category_slug === currentCategory || 
            w.category === currentCategory ||
            (w.category_name || '').toLowerCase() === currentCategory.toLowerCase()
        );
    }
    
    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(w =>
            (w.name || '').toLowerCase().includes(searchTerm) ||
            (w.description || '').toLowerCase().includes(searchTerm) ||
            (w.category_name || '').toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort
    filtered = sortWeapons(filtered);
    
    displayWeapons(filtered);
}

// Display weapons
function displayWeapons(weapons) {
    const grid = document.getElementById('weaponsGrid');
    if (!grid) return;
    
    if (!weapons || weapons.length === 0) {
        grid.style.visibility = '';
        grid.style.opacity = '';
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>No weapons found</p>
            </div>
        `;
        return;
    }
    
    // Ensure grid is visible (may be hidden to prevent SSG flicker)
    grid.style.visibility = '';
    grid.style.opacity = '';

    grid.innerHTML = weapons.map(weapon => {
        const iconUrl = buildWeaponIconUrl(weapon);
        
        // Build ammo icon if available
        const ammoIcon = weapon.ammo_type && ammoIcons[weapon.ammo_type] 
            ? `<span class="weapon-ammo" title="${weapon.ammo_type}">${ammoIcons[weapon.ammo_type]}</span>` 
            : '';
        
        const weaponSlug = escapeHtml(weapon.slug || weapon.id);
        
        // Build badges for skins/mods counts
        const badges = [];
        if (weapon.skins_count > 0) {
            badges.push(`<span class="weapon-badge badge-skins">${weapon.skins_count} Skin${weapon.skins_count > 1 ? 's' : ''}</span>`);
        }
        if (weapon.mods_count > 0) {
            badges.push(`<span class="weapon-badge badge-mods">${weapon.mods_count} Mod${weapon.mods_count > 1 ? 's' : ''}</span>`);
        }
        const badgesHtml = badges.length > 0 ? `<div class="weapon-badges">${badges.join('')}</div>` : '';
        
        // Get cached rating data
        const ratingData = weaponRatings[weaponSlug];
        const hasRating = ratingData && ratingData.total_votes > 0 && ratingData.average_rating > 0;
        const avgDisplay = hasRating ? ratingData.average_rating.toFixed(1) : '—';
        const avgClass = hasRating ? 'weapon-star-avg has-rating' : 'weapon-star-avg';
        const votesDisplay = hasRating 
            ? `<span style="color: var(--text-secondary);">${formatWeaponVoteCount(ratingData.total_votes)}</span> vote${ratingData.total_votes !== 1 ? 's' : ''}`
            : '<span class="weapon-rate-cta">Rate this weapon</span>';
        const filledUpTo = hasRating ? Math.round(ratingData.average_rating) : 0;

        const categoryName = weapon.category_name || weapon.category || '';

        return `
            <div class="weapon-card${compareSlots.includes(weaponSlug) ? ' compare-selected' : ''}" data-category="${escapeHtml(categoryName)}" onclick="${compareMode ? `toggleWeaponCompare('${weaponSlug}', event)` : `goToWeaponDetail('${weaponSlug}')`}">
                <div class="compare-checkbox" onclick="toggleWeaponCompare('${weaponSlug}', event)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="weapon-card-top">
                    ${ammoIcon}
                    <div class="weapon-image">
                        <img src="${iconUrl}" alt="${escapeHtml(weapon.name)}" width="180" height="135" onerror="this.style.display='none'" loading="lazy">
                        <div class="weapon-hover-overlay">
                            <span class="weapon-view-btn">View all stats →</span>
                        </div>
                    </div>
                    <div class="weapon-info">
                        <h3>${escapeHtml(weapon.name || 'Unknown')}</h3>
                        <span class="weapon-category">${escapeHtml(weapon.category_name || weapon.category || '')}</span>
                    </div>
                    ${badgesHtml}
                </div>
                <div class="weapon-star-strip" data-slug="${weaponSlug}" onclick="event.stopPropagation()">
                    <div class="weapon-rating-prompt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>Rate this weapon</span>
                    </div>
                    <div class="weapon-star-buttons">
                        ${[1,2,3,4,5].map(v => `<button class="weapon-star-btn${v <= filledUpTo ? ' filled' : ''}" data-rating="${v}" data-slug="${weaponSlug}" title="${v} star${v !== 1 ? 's' : ''}">★</button>`).join('')}
                    </div>
                    <div class="weapon-sparkline" id="spark-${weaponSlug}"></div>
                    <div class="weapon-star-meta">
                        <span class="${avgClass}" id="wstar-avg-${weaponSlug}">${avgDisplay}</span>
                        <span class="weapon-star-votes" id="wstar-votes-${weaponSlug}">${votesDisplay}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach star click handlers
    attachWeaponStarHandlers();

    // Re-apply cached sparklines to newly rendered cards
    applySparklines();
}

// Open weapon modal
async function openWeaponModal(slug) {
    const modal = document.getElementById('weaponModal');
    if (!modal) return;
    
    // Find weapon in cached data first
    let weapon = allWeapons.find(w => w.slug === slug || w.id === slug);
    
    // Try to get detailed data
    try {
        const response = await WeaponsAPI.getWeaponBySlug(slug);
        if (response?.data) {
            weapon = response.data;
        }
    } catch (error) {
        console.error('Error loading weapon details:', error);
    }
    
    if (!weapon) {
        console.error('Weapon not found:', slug);
        return;
    }
    
    // Populate modal
    const _buildIconUrl = (path) => { if (!path) return null; if (path.startsWith('http')) return path; return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`; };
    const iconUrl = _buildIconUrl(weapon.icon_url_webp) || _buildIconUrl(weapon.icon_url) || _buildIconUrl(weapon.icon_url_low) || MarathonAPI.getWeaponIconUrlBySlug(weapon.slug, 'low');
    document.getElementById('modalImage').innerHTML = `<img src="${iconUrl}" alt="${escapeHtml(weapon.name)}" onerror="this.style.display='none'">`;
    document.getElementById('modalTitle').textContent = weapon.name || 'Unknown';
    document.getElementById('modalSubtitle').textContent = weapon.category_name || weapon.category || '';
    document.getElementById('modalDescription').textContent = weapon.description || '';
    
    // Stats
    const stats = weapon.stats || {};
    const statsEl = document.getElementById('modalStats');
    const statEntries = [
        ['Damage', stats.damage],
        ['Precision Mult', stats.precision ? `${stats.precision}x` : null],
        ['Rate of Fire', stats.rate_of_fire],
        ['Magazine', stats.magazine_size],
        ['Reload Speed', stats.reload_speed],
        ['Range', stats.range_meters],
        ['Accuracy', stats.accuracy_score],
        ['Aim Assist', stats.aim_assist],
        ['Charge Time', stats.charge_time_seconds],
        ['Volt Drain', stats.volt_drain ? `${stats.volt_drain}%` : null]
    ].filter(([_, val]) => val !== null && val !== undefined);
    
    statsEl.innerHTML = statEntries.length > 0
        ? statEntries.map(([label, value]) => `
            <div class="stat-item">
                <div class="label">${label}</div>
                <div class="value">${value}</div>
            </div>
        `).join('')
        : '<p style="color: var(--text-dim);">No stats data available</p>';
    
    // Mods
    const mods = weapon.mods || [];
    const modsEl = document.getElementById('modalMods');
    modsEl.innerHTML = mods.length > 0
        ? mods.map(mod => `<div class="mod-tag">${escapeHtml(mod.name || mod)}</div>`).join('')
        : '<p style="color: var(--text-dim);">No compatible mods data</p>';
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('weaponModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Show error
function showError(message) {
    const grid = document.getElementById('weaponsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Navigate to weapon detail page
function goToWeaponDetail(slug) {
    if (compareMode) return; // Don't navigate in compare mode
    window.location.href = `/marathon/weapons/${encodeURIComponent(slug)}/`;
}

// Load weapon rankings from overview endpoint (replaces old loadAllWeaponRatings)
async function loadWeaponRankings() {
    if (typeof RatingsAPI === 'undefined') {
        console.warn('RatingsAPI not loaded');
        return;
    }
    
    try {
        const response = await RatingsAPI.getWeaponLeaderboard();
        
        if (response.success && response.data) {
            response.data.forEach(item => {
                weaponRatings[item.weapon_slug] = {
                    average_rating: item.average_rating,
                    total_votes: item.total_votes,
                    weapon_slug: item.weapon_slug,
                    weapon_name: item.weapon_name,
                };
            });
            // Re-sort and rebuild grid if sort depends on ratings (default: votes)
            if (currentSort === 'rating' || currentSort === 'votes') {
                filterAndDisplayWeapons();
            } else {
                // Just update stars/votes in place without rebuilding
                response.data.forEach(item => {
                    updateWeaponCardRating(item.weapon_slug, weaponRatings[item.weapon_slug]);
                });
            }
            highlightUserWeaponStarVotes();
        }
    } catch (error) {
        console.warn('Failed to load weapon rankings:', error);
    }
}

// Update a single weapon card with rating data
function updateWeaponCardRating(slug, ratingData) {
    const average = ratingData.average_rating;
    const votes = ratingData.total_votes;
    
    const avgEl = document.getElementById(`wstar-avg-${slug}`);
    const votesEl = document.getElementById(`wstar-votes-${slug}`);
    
    if (avgEl && votes > 0 && average > 0) {
        avgEl.textContent = average.toFixed(1);
        avgEl.classList.add('has-rating');
    }
    if (votesEl && votes > 0) {
        votesEl.innerHTML = `<span style="color: var(--text-secondary);">${formatWeaponVoteCount(votes)}</span> vote${votes !== 1 ? 's' : ''}`;
    }
    
    // Hide the "Rate this weapon" prompt if the current user has already voted
    const strip = document.querySelector(`.weapon-star-strip[data-slug="${slug}"]`);
    if (strip) {
        const prompt = strip.querySelector('.weapon-rating-prompt');
        if (prompt) {
            const userVotes = JSON.parse(localStorage.getItem('marathondb_weapon_star_votes') || '{}');
            prompt.classList.toggle('has-votes', !!userVotes[slug]);
        }
    }

    // Fill stars based on average
    if (strip && average > 0) {
        strip.querySelectorAll('.weapon-star-btn').forEach(btn => {
            const val = parseInt(btn.dataset.rating);
            if (val <= Math.round(average)) {
                btn.classList.add('filled');
            } else {
                btn.classList.remove('filled');
            }
        });
    }
}

// Load combined all-time vote totals across all seasons for every weapon
async function loadCombinedVotes() {
    if (typeof RatingsAPI === 'undefined') return;
    const slugs = allWeapons.map(w => w.slug).filter(Boolean);
    if (!slugs.length) return;

    try {
        // Prefer batch endpoint (1 request) — falls back to per-weapon if unavailable
        if (typeof RatingsAPI.getCombinedVotesBatch === 'function') {
            const resp = await RatingsAPI.getCombinedVotesBatch(slugs);
            if (resp.success && resp.data) {
                resp.data.forEach(item => {
                    if (!item.weapon_slug) return;
                    if (!weaponRatings[item.weapon_slug]) weaponRatings[item.weapon_slug] = {};
                    weaponRatings[item.weapon_slug].total_votes = item.total_votes;
                    weaponRatings[item.weapon_slug].average_rating = item.average_rating;
                    updateWeaponCardRating(item.weapon_slug, weaponRatings[item.weapon_slug]);
                });
                if (currentSort === 'votes' || currentSort === 'rating') filterAndDisplayWeapons();
                return;
            }
        }

        // Fallback: individual history calls (N+1)
        const results = await Promise.allSettled(
            slugs.map(slug => RatingsAPI.getWeaponHistory(slug))
        );

        results.forEach(result => {
            if (result.status !== 'fulfilled' || !result.value.success) return;
            const resp = result.value;
            const slug = resp.weapon_slug;
            if (!slug || !resp.seasons) return;

            let combinedVotes = 0;
            let weightedSum = 0;
            resp.seasons.forEach(s => {
                const v = s.ratings?.total_votes || 0;
                const a = s.ratings?.average_rating || 0;
                combinedVotes += v;
                weightedSum += a * v;
            });

            const combinedAvg = combinedVotes > 0 ? weightedSum / combinedVotes : 0;

            if (!weaponRatings[slug]) weaponRatings[slug] = {};
            weaponRatings[slug].total_votes = combinedVotes;
            weaponRatings[slug].average_rating = combinedAvg;
            updateWeaponCardRating(slug, weaponRatings[slug]);
        });

        if (currentSort === 'votes' || currentSort === 'rating') {
            filterAndDisplayWeapons();
        }
    } catch (error) {
        console.warn('Failed to load combined vote totals:', error);
    }
}

function formatWeaponVoteCount(n) {
    if (!n || n === 0) return '';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

// Highlight user's previous weapon star votes from localStorage
function highlightUserWeaponStarVotes() {
    const votes = JSON.parse(localStorage.getItem('marathondb_weapon_star_votes') || '{}');
    Object.entries(votes).forEach(([slug, rating]) => {
        const strip = document.querySelector(`.weapon-star-strip[data-slug="${slug}"]`);
        if (!strip) return;
        strip.querySelectorAll('.weapon-star-btn').forEach(btn => {
            const val = parseInt(btn.dataset.rating);
            if (val <= rating) {
                btn.classList.add('user-voted');
            }
        });
    });
}

// Attach interactive star click handlers for weapons
function attachWeaponStarHandlers() {
    document.querySelectorAll('.weapon-star-btn').forEach(btn => {
        // Hover preview
        btn.addEventListener('mouseenter', () => {
            const strip = btn.closest('.weapon-star-strip');
            const hoverVal = parseInt(btn.dataset.rating);
            strip.querySelectorAll('.weapon-star-btn').forEach(b => {
                b.classList.toggle('hover-fill', parseInt(b.dataset.rating) <= hoverVal);
            });
        });

        btn.addEventListener('mouseleave', () => {
            const strip = btn.closest('.weapon-star-strip');
            strip.querySelectorAll('.weapon-star-btn').forEach(b => {
                b.classList.remove('hover-fill');
            });
        });

        // Click to vote
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const slug = btn.dataset.slug;
            const rating = parseInt(btn.dataset.rating);
            if (!slug || isNaN(rating) || rating < 1 || rating > 5) return;

            const strip = btn.closest('.weapon-star-strip');

            // Immediately show user vote
            strip.querySelectorAll('.weapon-star-btn').forEach(b => {
                b.classList.toggle('user-voted', parseInt(b.dataset.rating) <= rating);
            });

            // Persist locally
            const votes = JSON.parse(localStorage.getItem('marathondb_weapon_star_votes') || '{}');
            votes[slug] = rating;
            localStorage.setItem('marathondb_weapon_star_votes', JSON.stringify(votes));

            // Submit to API
            if (typeof RatingsAPI !== 'undefined') {
                const result = await RatingsAPI.submitWeaponRating(slug, rating);
                if (result.success) {
                    const agg = result.aggregate || result.data;
                    if (agg) {
                        weaponRatings[slug] = {
                            ...weaponRatings[slug],
                            average_rating: agg.average_rating,
                            total_votes: agg.total_votes,
                        };
                        updateWeaponCardRating(slug, weaponRatings[slug]);
                    }
                }
            }
        });
    });
}

// ═══════════════════════════════════════
//  WEAPON COMPARISON TOOL
// ═══════════════════════════════════════

function setupCompareMode() {
    const btn = document.getElementById('compareToggleBtn');
    if (btn) btn.addEventListener('click', toggleCompareMode);

    // Floating bar actions
    document.getElementById('compareNowBtn')?.addEventListener('click', showComparison);
    document.getElementById('compareClearBtn')?.addEventListener('click', clearCompare);
    document.getElementById('compareCloseBtn')?.addEventListener('click', toggleCompareMode);
}

function toggleCompareMode() {
    compareMode = !compareMode;
    document.body.classList.toggle('compare-active', compareMode);
    const btn = document.getElementById('compareToggleBtn');
    if (btn) {
        btn.classList.toggle('active', compareMode);
        btn.innerHTML = compareMode
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg> Exit Compare`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 21l7-7M21 21v-5h-5M3 21h5v-5"/></svg> Compare`;
    }
    if (!compareMode) {
        clearCompare();
        hideComparisonPanel();
    } else {
        showCompareHint();
    }
    updateCompareBar();
}

function showCompareHint() {
    if (document.querySelector('.compare-hint-toast')) return;
    const toast = document.createElement('div');
    toast.className = 'compare-hint-toast';
    toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <span>Select up to 4 weapons, then click <strong>Compare Now</strong> — the comparison table will load below.</span>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

function toggleWeaponCompare(slug, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const idx = compareSlots.indexOf(slug);
    if (idx > -1) {
        compareSlots.splice(idx, 1);
    } else if (compareSlots.length < COMPARE_MAX) {
        compareSlots.push(slug);
    }
    updateCompareUI();
}

function clearCompare() {
    compareSlots = [];
    updateCompareUI();
}

function updateCompareUI() {
    // Update card checkboxes
    document.querySelectorAll('.weapon-card').forEach(card => {
        const slug = card.querySelector('.weapon-star-strip')?.dataset.slug;
        if (!slug) return;
        card.classList.toggle('compare-selected', compareSlots.includes(slug));
    });
    updateCompareBar();
}

function updateCompareBar() {
    const bar = document.getElementById('compareFloatingBar');
    if (!bar) return;
    if (!compareMode || compareSlots.length === 0) {
        bar.classList.remove('visible');
        return;
    }
    bar.classList.add('visible');

    const slotsContainer = bar.querySelector('.compare-bar-slots');
    if (slotsContainer) {
        slotsContainer.innerHTML = compareSlots.map(slug => {
            const w = allWeapons.find(w => (w.slug || w.id) === slug);
            if (!w) return '';
            const iconUrl = buildWeaponIconUrl(w);
            return `<div class="compare-bar-item" title="${escapeHtml(w.name)}">
                <img src="${iconUrl}" alt="${escapeHtml(w.name)}" onerror="this.style.display='none'">
                <span>${escapeHtml(w.name)}</span>
                <button class="compare-bar-remove" onclick="toggleWeaponCompare('${slug}', event)">&times;</button>
            </div>`;
        }).join('');
    }

    const countEl = bar.querySelector('.compare-bar-count');
    if (countEl) countEl.textContent = `${compareSlots.length}/${COMPARE_MAX}`;

    const goBtn = document.getElementById('compareNowBtn');
    if (goBtn) goBtn.disabled = compareSlots.length < 2;
}

function buildWeaponIconUrl(weapon) {
    const buildUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    return buildUrl(weapon.icon_url_webp) || buildUrl(weapon.icon_url_low) || buildUrl(weapon.icon_url)
        || buildUrl(weapon.icon_path_low)
        || MarathonAPI.getWeaponIconUrlBySlug(weapon.slug, 'low');
}

async function showComparison() {
    if (compareSlots.length < 2) return;

    // Fetch full detail + history for each weapon
    const panel = document.getElementById('comparisonPanel');
    if (!panel) return;
    panel.style.display = 'block';
    panel.innerHTML = '<div class="compare-loading"><div class="loading-spinner"></div><span>Loading weapon data...</span></div>';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const weaponData = await Promise.all(compareSlots.map(async slug => {
            try {
                const resp = await WeaponsAPI.getWeaponBySlug(slug);
                return resp?.data || allWeapons.find(w => w.slug === slug);
            } catch {
                return allWeapons.find(w => w.slug === slug);
            }
        }));

        renderComparison(weaponData.filter(Boolean));
    } catch (err) {
        panel.innerHTML = '<div class="empty-state"><p>Failed to load comparison data</p></div>';
    }
}

function hideComparisonPanel() {
    const panel = document.getElementById('comparisonPanel');
    if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
}

function renderComparison(weapons) {
    const panel = document.getElementById('comparisonPanel');
    if (!panel) return;

    // Stats to compare
    const statDefs = [
        { key: 'damage', label: 'Damage', max: 200, suffix: '' },
        { key: 'precision', label: 'Precision Mult', max: 5, suffix: 'x' },
        { key: 'rate_of_fire', label: 'Fire Rate (RPM)', max: 1200, suffix: '' },
        { key: 'charge_time_seconds', label: 'Charge Time', max: 5, suffix: 's' },
        { key: 'firepower_score', label: 'Firepower Score', max: 100, suffix: '' },
        { key: 'accuracy_score', label: 'Accuracy Score', max: 100, suffix: '' },
        { key: 'hipfire_spread', label: 'Hipfire Spread', max: 20, suffix: '°' },
        { key: 'ads_spread', label: 'ADS Spread', max: 10, suffix: '°' },
        { key: 'crouch_spread_bonus', label: 'Crouch Spread Bonus', max: 100, suffix: '%' },
        { key: 'moving_inaccuracy', label: 'Moving Inaccuracy', max: 100, suffix: '%' },
        { key: 'handling_score', label: 'Handling Score', max: 100, suffix: '' },
        { key: 'reload_speed', label: 'Reload Speed', max: 5, suffix: 's' },
        { key: 'equip_speed', label: 'Equip Speed', max: 2, suffix: 's' },
        { key: 'ads_speed', label: 'ADS Speed', max: 1, suffix: 's' },
        { key: 'aim_assist', label: 'Aim Assist', max: 5, suffix: '' },
        { key: 'recoil', label: 'Recoil', max: 100, suffix: '%' },
        { key: 'range_meters', label: 'Range', max: 200, suffix: 'm' },
        { key: 'magazine_size', label: 'Magazine', max: 100, suffix: '' },
        { key: 'volt_drain', label: 'Volt Drain', max: 100, suffix: '%' },
        { key: 'zoom', label: 'Zoom', max: 5, suffix: 'x' },
    ];

    const ttkDefs = [
        { key: 'ttk_no_shield', label: 'TTK (No Shield)' },
        { key: 'ttk_green_shield', label: 'TTK (Green)' },
        { key: 'ttk_blue_shield', label: 'TTK (Blue)' },
        { key: 'ttk_purple_shield', label: 'TTK (Purple)' },
    ];

    // Only show stats where at least one weapon has data
    const relevantStats = statDefs.filter(sd =>
        weapons.some(w => w.stats && w.stats[sd.key] !== null && w.stats[sd.key] !== undefined)
    );
    const relevantTtk = ttkDefs.filter(sd =>
        weapons.some(w => w.stats && w.stats[sd.key] !== null && w.stats[sd.key] !== undefined)
    );

    // Determine "best" for each stat (higher = better, except reload/spread/sprint/equip/ads which are lower = better)
    const lowerIsBetter = ['reload_speed', 'hipfire_spread', 'ads_spread', 'moving_inaccuracy', 'equip_speed', 'ads_speed',
        'charge_time_seconds', 'recoil', 'volt_drain',
        'ttk_no_shield', 'ttk_green_shield', 'ttk_blue_shield', 'ttk_purple_shield'];

    function bestIndex(key, vals) {
        const numbers = vals.map(v => (v !== null && v !== undefined && !isNaN(v)) ? Number(v) : null);
        const valid = numbers.filter(v => v !== null);
        if (valid.length === 0) return -1;
        const target = lowerIsBetter.includes(key) ? Math.min(...valid) : Math.max(...valid);
        return numbers.indexOf(target);
    }

    // Colors for each weapon bar
    const barColors = ['var(--neon)', '#60a5fa', '#f59e0b', '#a855f7'];

    // Header row
    const colWidth = Math.floor(100 / (weapons.length + 1));
    const headerHtml = `<div class="compare-header">
        <div class="compare-label-col">Stat</div>
        ${weapons.map((w, i) => {
            const iconUrl = buildWeaponIconUrl(w);
            return `<div class="compare-weapon-col">
                <img src="${iconUrl}" alt="${escapeHtml(w.name)}" class="compare-weapon-img" onerror="this.style.display='none'">
                <span class="compare-weapon-name">${escapeHtml(w.name)}</span>
                <span class="compare-weapon-cat">${escapeHtml(w.category_name || '')}</span>
            </div>`;
        }).join('')}
    </div>`;

    // Stat rows
    const statsRowsHtml = relevantStats.map(sd => {
        const vals = weapons.map(w => w.stats?.[sd.key] ?? null);
        const best = bestIndex(sd.key, vals);
        const maxVal = Math.max(...vals.filter(v => v !== null).map(Number), sd.max);

        return `<div class="compare-row">
            <div class="compare-label-col">${sd.label}</div>
            ${vals.map((v, i) => {
                const num = v !== null ? Number(v) : null;
                const pct = num !== null ? Math.max(5, (num / maxVal) * 100) : 0;
                const isBest = i === best && vals.filter(x => x !== null).length > 1;
                return `<div class="compare-value-col${isBest ? ' compare-best' : ''}">
                    ${num !== null ? `
                        <div class="compare-bar-track">
                            <div class="compare-bar-fill" style="width:${pct}%;background:${barColors[i]}"></div>
                        </div>
                        <span class="compare-val">${num}${sd.suffix}</span>
                    ` : '<span class="compare-val compare-na">—</span>'}
                </div>`;
            }).join('')}
        </div>`;
    }).join('');

    // TTK rows
    const ttkRowsHtml = relevantTtk.length > 0 ? `
        <div class="compare-section-title">Time to Kill</div>
        ${relevantTtk.map(sd => {
            const vals = weapons.map(w => w.stats?.[sd.key] ?? null);
            const best = bestIndex(sd.key, vals);
            return `<div class="compare-row">
                <div class="compare-label-col">${sd.label}</div>
                ${vals.map((v, i) => {
                    const isBest = i === best && vals.filter(x => x !== null).length > 1;
                    return `<div class="compare-value-col${isBest ? ' compare-best' : ''}">
                        ${v !== null ? `<span class="compare-val">${v}s</span>` : '<span class="compare-val compare-na">—</span>'}
                    </div>`;
                }).join('')}
            </div>`;
        }).join('')}
    ` : '';

    // Weapon info rows
    const infoDefs = [
        { key: 'fire_mode', label: 'Fire Mode' },
        { key: 'ammo_type', label: 'Ammo Type' },
        { key: 'rarity', label: 'Rarity' },
    ];
    const infoRowsHtml = infoDefs.map(sd => {
        const vals = weapons.map(w => w[sd.key] || '—');
        return `<div class="compare-row compare-row-info">
            <div class="compare-label-col">${sd.label}</div>
            ${vals.map(v => `<div class="compare-value-col"><span class="compare-val">${escapeHtml(v)}</span></div>`).join('')}
        </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="compare-panel-header">
            <h2>Weapon Comparison</h2>
            <button class="compare-panel-close" onclick="hideComparisonPanel()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="compare-table" style="--compare-cols: ${weapons.length}">
            ${headerHtml}
            <div class="compare-section-title">Weapon Info</div>
            ${infoRowsHtml}
            <div class="compare-section-title">Combat Stats</div>
            ${statsRowsHtml}
            ${ttkRowsHtml}
        </div>
    `;
}

// ═══════════════════════════════════════
// WEAPON SPARKLINES (30-day trend)
// ═══════════════════════════════════════

async function loadWeaponSparklines() {
    if (typeof RatingsAPI === 'undefined' || typeof RatingsAPI.getAllWeaponsTimeline !== 'function') return;

    try {
        const res = await RatingsAPI.getAllWeaponsTimeline({ days: 30, granularity: 'day' });
        if (!res.success || !res.weapons) return;

        // Cache the data for re-renders
        for (const [slug, points] of Object.entries(res.weapons)) {
            if (points && points.length >= 2) {
                weaponSparklineData[slug] = points.map(p => p.avg_rating);
            }
        }

        applySparklines();
    } catch (err) {
        console.warn('Failed to load weapon sparklines:', err);
    }
}

function applySparklines() {
    for (const [slug, values] of Object.entries(weaponSparklineData)) {
        const container = document.getElementById(`spark-${slug}`);
        if (container && !container.hasChildNodes()) {
            renderSparkline(container, values);
        }
    }
}

function renderSparkline(container, values) {
    if (!values || values.length < 2) return;

    const W = 60;
    const H = 24;
    const pad = 2;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (W - pad * 2);
        const y = pad + (H - pad * 2) - ((v - min) / range) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // Trend direction: compare first third avg vs last third avg
    const third = Math.max(1, Math.floor(values.length / 3));
    const firstAvg = values.slice(0, third).reduce((a, b) => a + b, 0) / third;
    const lastAvg = values.slice(-third).reduce((a, b) => a + b, 0) / third;
    const trendClass = lastAvg > firstAvg + 0.05 ? 'spark-up' : lastAvg < firstAvg - 0.05 ? 'spark-down' : 'spark-flat';

    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="sparkline-svg ${trendClass}" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
}
