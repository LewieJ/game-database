// Runners page JavaScript

let allRunners = [];
let runnerRatings = {}; // Cache for runner ratings
let runnerSparklineData = {}; // Cache: slug -> [avg_rating values]

document.addEventListener('DOMContentLoaded', async function() {
    // Load runners + accurate badge counts in parallel (no render yet)
    const [runnerResponse, coreCounts, skinCounts] = await Promise.all([
        MarathonAPI.getRunners().catch(err => { console.error('Error loading runners:', err); return null; }),
        fetchCoreCounts(),
        fetchSkinCounts(),
    ]);

    if (runnerResponse && runnerResponse.data) {
        allRunners = runnerResponse.data;

        // Apply accurate counts BEFORE first render (prevents stale-data flash)
        allRunners.forEach(runner => {
            const key = (runner.slug || runner.id || '').toLowerCase();
            runner.skins_count = skinCounts[key] || 0;
            runner.cores_count = coreCounts[key] || 0;
        });

        displayRunners(allRunners);
    } else {
        showEmpty('No runners data available');
    }

    // Load ratings after runners are displayed
    loadAllRunnerRatings();

    // Load sparklines after ratings
    loadRunnerSparklines();
    
    // Close modal on overlay click
    document.getElementById('runnerModal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
});

function displayRunners(runners) {
    const grid = document.getElementById('runnersGrid');
    if (!grid) return;
    
    // Update runner count
    const countEl = document.getElementById('runnerCount');
    if (countEl) {
        countEl.textContent = runners.length;
    }
    
    if (!runners || runners.length === 0) {
        grid.style.visibility = '';
        grid.style.opacity = '';
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>No runners found</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = runners.map(runner => {
        // Use new icon_url field from API v2.0.0, fallback to legacy method
        const buildUrl = (path) => {
            if (!path) return null;
            if (path.startsWith('http')) return path;
            return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
        };
        const iconUrl = buildUrl(runner.icon_url_low) || buildUrl(runner.icon_url) 
            || buildUrl(runner.icon_path_low)
            || MarathonAPI.getRunnerIconUrl(runner.icon_path || runner.slug || runner.name);
        
        // Build badges
        const skinsCount = runner.skins_count || 0;
        const coresCount = runner.cores_count || 0;
        const hasBadges = skinsCount > 0 || coresCount > 0;
        const runnerSlug = runner.slug || runner.id;
        
        return `
            <div class="runner-card" onclick="goToRunnerDetail('${runnerSlug}')">
                <div class="runner-card-top">
                    <div class="runner-image">
                        <img src="${iconUrl}" alt="${escapeHtml(runner.name)}" onerror="this.style.display='none'" loading="lazy">
                    </div>
                    <div class="runner-card-content">
                        <div class="runner-name">${escapeHtml(runner.name || 'Unknown')}</div>
                        ${runner.prior_name ? `<div class="runner-prior-name">Formerly: ${escapeHtml(runner.prior_name)}</div>` : ''}
                        ${runner.description ? `<div class="runner-description">${escapeHtml(runner.description)}</div>` : ''}
                        ${hasBadges ? `
                            <div class="runner-badges">
                                ${skinsCount > 0 ? `<span class="runner-badge badge-skins">${skinsCount} Skin${skinsCount !== 1 ? 's' : ''}</span>` : ''}
                                ${coresCount > 0 ? `<span class="runner-badge badge-cores">${coresCount} Core${coresCount !== 1 ? 's' : ''}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="runner-hover-overlay">
                        <span class="runner-view-btn">View all stats →</span>
                    </div>
                </div>
                <div class="runner-star-strip" data-slug="${runnerSlug}" onclick="event.stopPropagation()">
                    <div class="runner-rating-prompt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>Rate this runner</span>
                    </div>
                    <div class="runner-star-buttons">
                        ${[1,2,3,4,5].map(v => `<button class="runner-star-btn" data-rating="${v}" data-slug="${runnerSlug}" title="${v} star${v !== 1 ? 's' : ''}">★</button>`).join('')}
                    </div>
                    <div class="runner-sparkline" id="spark-${runnerSlug}"></div>
                    <div class="runner-star-meta">
                        <span class="runner-star-avg" id="star-avg-${runnerSlug}">—</span>
                        <span class="runner-star-votes" id="star-votes-${runnerSlug}"></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Reveal grid (may be hidden to prevent SSG stale-data flash)
    grid.style.visibility = '';
    grid.style.opacity = '';

    // Attach star click handlers
    attachStarHandlers();

    // Re-apply cached sparklines after re-render
    applyRunnerSparklines();
}

async function openRunnerModal(slug) {
    const modal = document.getElementById('runnerModal');
    if (!modal) return;
    
    // Find runner in cached data first
    let runner = allRunners.find(r => r.slug === slug || r.id === slug);
    
    // Try to get detailed data
    try {
        const response = await MarathonAPI.getRunnerBySlug(slug);
        if (response && response.data) {
            runner = response.data;
        }
    } catch (error) {
        console.error('Error loading runner details:', error);
    }
    
    if (!runner) {
        console.error('Runner not found:', slug);
        return;
    }
    
    // Populate modal - use high-res image for detail view
    const buildModalUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const iconUrl = buildModalUrl(runner.icon_url_high) || buildModalUrl(runner.icon_path_high)
        || MarathonAPI.getRunnerIconUrl(runner.icon_path || runner.slug || runner.name);
    document.getElementById('modalImage').innerHTML = `<img src="${iconUrl}" alt="${escapeHtml(runner.name)}" onerror="this.style.display='none'">`;
    document.getElementById('modalTitle').textContent = runner.name || 'Unknown';
    document.getElementById('modalSubtitle').textContent = runner.role || runner.class || '';
    document.getElementById('modalDescription').textContent = runner.description || '';
    
    // Abilities
    const abilities = runner.abilities || [];
    document.getElementById('modalAbilities').innerHTML = abilities.length > 0 
        ? abilities.map(ability => {
            const abilityName = typeof ability === 'string' ? ability : ability.name || '';
            const abilityDesc = typeof ability === 'object' ? ability.description || '' : '';
            return `
                <div class="mod-tag" title="${escapeHtml(abilityDesc)}">
                    ${escapeHtml(abilityName)}
                </div>
            `;
        }).join('')
        : '<p style="color: var(--text-dim);">No abilities data available</p>';
    
    // Stats
    const stats = runner.stats || {};
    const statEntries = Object.entries(stats).filter(([key, val]) => val !== null && val !== undefined);
    
    // Also check for top-level stat properties
    const topLevelStats = ['health', 'speed', 'armor', 'shield', 'energy'];
    topLevelStats.forEach(stat => {
        if (runner[stat] !== undefined && runner[stat] !== null) {
            statEntries.push([stat, runner[stat]]);
        }
    });
    
    document.getElementById('modalStats').innerHTML = statEntries.length > 0
        ? statEntries.map(([key, value]) => `
            <div class="stat-item">
                <div class="label">${formatStatName(key)}</div>
                <div class="value">${value}</div>
            </div>
        `).join('')
        : '<p style="color: var(--text-dim);">No stats data available</p>';
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('runnerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function formatStatName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toUpperCase();
}

function showError(message) {
    const grid = document.getElementById('runnersGrid');
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

function showEmpty(message) {
    showError(message);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Navigate to runner detail page
function goToRunnerDetail(slug) {
    window.location.href = `/marathon/runners/${encodeURIComponent(slug)}/`;
}

// ─── Live Badge Counts ──────────────────────────────────────
// Lightweight aggregate endpoints — return { slug: count } maps.

/** Fetch core counts per runner_type from the dedicated counts endpoint */
async function fetchCoreCounts() {
    try {
        const res = await fetch('https://cores.marathondb.gg/api/cores/counts');
        const json = await res.json();
        if (json?.success) return json.data || {};
    } catch (e) { console.warn('Core count fetch failed:', e); }
    return {};
}

/** Fetch runner skin counts per runner slug from the dedicated counts endpoint */
async function fetchSkinCounts() {
    try {
        const res = await fetch('https://runnerskins.marathondb.gg/api/skins/counts');
        const json = await res.json();
        if (json?.success) return json.data || {};
    } catch (e) { console.warn('Skin count fetch failed:', e); }
    return {};
}

// Load ratings for all runners and update cards
async function loadAllRunnerRatings() {
    if (typeof RatingsAPI === 'undefined') {
        console.warn('RatingsAPI not loaded');
        return;
    }
    
    try {
        const response = await RatingsAPI.getAllRunnerRatings({ sort: 'rating', order: 'desc' });
        
        if (response.success && response.data) {
            response.data.forEach(rating => {
                runnerRatings[rating.runner_slug] = rating;
                updateRunnerCardRating(rating.runner_slug, rating);
            });
            highlightUserStarVotes();
        }
    } catch (error) {
        console.warn('Failed to load runner ratings:', error);
    }
}

// Update a single runner card with rating data
function updateRunnerCardRating(slug, ratingData) {
    const average = ratingData.average_rating;
    const votes = ratingData.total_votes;
    const hasRating = votes > 0 && average > 0;
    
    const avgEl = document.getElementById(`star-avg-${slug}`);
    const votesEl = document.getElementById(`star-votes-${slug}`);
    const strip = document.querySelector(`.runner-star-strip[data-slug="${slug}"]`);
    
    if (avgEl) {
        avgEl.textContent = hasRating ? average.toFixed(1) : '—';
        if (hasRating) {
            avgEl.classList.add('has-rating');
        } else {
            avgEl.classList.remove('has-rating');
        }
    }
    
    if (votesEl) {
        if (hasRating) {
            votesEl.innerHTML = `<span style="color: var(--text-secondary);">${formatVoteCount(votes)}</span> vote${votes !== 1 ? 's' : ''}`;
        } else {
            votesEl.innerHTML = '';
        }
    }

    // Hide the "Rate this runner" prompt only if the current user has already voted
    if (strip) {
        const prompt = strip.querySelector('.runner-rating-prompt');
        if (prompt) {
            const userVotes = JSON.parse(localStorage.getItem('marathondb_runner_star_votes') || '{}');
            prompt.classList.toggle('has-votes', !!userVotes[slug]);
        }
    }
    
    // Fill stars based on average
    const filledUpTo = hasRating ? Math.round(average) : 0;
    if (strip) {
        strip.querySelectorAll('.runner-star-btn').forEach(btn => {
            const val = parseInt(btn.dataset.rating);
            if (val <= filledUpTo) {
                btn.classList.add('filled');
            } else {
                btn.classList.remove('filled');
            }
        });
    }
}

function formatVoteCount(n) {
    if (!n || n === 0) return '';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

// Highlight user's previous star votes from localStorage
function highlightUserStarVotes() {
    const votes = JSON.parse(localStorage.getItem('marathondb_runner_star_votes') || '{}');
    Object.entries(votes).forEach(([slug, rating]) => {
        const strip = document.querySelector(`.runner-star-strip[data-slug="${slug}"]`);
        if (!strip) return;
        strip.querySelectorAll('.runner-star-btn').forEach(btn => {
            const val = parseInt(btn.dataset.rating);
            if (val <= rating) {
                btn.classList.add('user-voted');
            }
        });
    });
}

// Attach interactive star click handlers
function attachStarHandlers() {
    document.querySelectorAll('.runner-star-btn').forEach(btn => {
        // Hover preview
        btn.addEventListener('mouseenter', (e) => {
            const strip = btn.closest('.runner-star-strip');
            const hoverVal = parseInt(btn.dataset.rating);
            strip.querySelectorAll('.runner-star-btn').forEach(b => {
                const v = parseInt(b.dataset.rating);
                b.classList.toggle('hover-fill', v <= hoverVal);
            });
        });

        btn.addEventListener('mouseleave', (e) => {
            const strip = btn.closest('.runner-star-strip');
            strip.querySelectorAll('.runner-star-btn').forEach(b => {
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

            const strip = btn.closest('.runner-star-strip');

            // Immediately show user vote
            strip.querySelectorAll('.runner-star-btn').forEach(b => {
                const v = parseInt(b.dataset.rating);
                b.classList.toggle('user-voted', v <= rating);
            });

            // Persist locally
            const votes = JSON.parse(localStorage.getItem('marathondb_runner_star_votes') || '{}');
            votes[slug] = rating;
            localStorage.setItem('marathondb_runner_star_votes', JSON.stringify(votes));

            // Submit to API
            if (typeof RatingsAPI !== 'undefined') {
                const result = await RatingsAPI.submitRating(slug, rating);
                if (result.success && result.data) {
                    runnerRatings[slug] = result.data;
                    updateRunnerCardRating(slug, result.data);
                }
            }
        });
    });
}

// ─── Sparklines ─────────────────────────────────────────────

async function loadRunnerSparklines() {
    if (typeof RatingsAPI === 'undefined' || typeof RatingsAPI.getRunnerTimeline !== 'function') return;

    // No bulk endpoint — fetch each runner individually (only 7 runners)
    const slugs = allRunners.map(r => r.slug || r.id).filter(Boolean);

    await Promise.all(slugs.map(async (slug) => {
        try {
            const res = await RatingsAPI.getRunnerTimeline(slug, { days: 30, granularity: 'day' });
            if (res.success && res.timeline && res.timeline.length >= 2) {
                runnerSparklineData[slug] = res.timeline.map(p => p.average_rating);
            }
        } catch (err) {
            // silently skip
        }
    }));

    applyRunnerSparklines();
}

function applyRunnerSparklines() {
    for (const [slug, values] of Object.entries(runnerSparklineData)) {
        const container = document.getElementById(`spark-${slug}`);
        if (container && !container.hasChildNodes()) {
            renderRunnerSparkline(container, values);
        }
    }
}

function renderRunnerSparkline(container, values) {
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