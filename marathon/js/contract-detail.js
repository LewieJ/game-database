// Contract Detail Page
// Fetches a single contract by slug and renders the full guide page

(function () {
    'use strict';

    // ── DOM refs ──
    const loadingState = document.getElementById('loadingState');
    const contractContent = document.getElementById('contractContent');
    const errorState = document.getElementById('errorState');
    const breadcrumb = document.getElementById('breadcrumb');
    const backLink = document.getElementById('backLink');
    const contractHeader = document.getElementById('contractHeader');
    const infoBar = document.getElementById('infoBar');
    const stepsSection = document.getElementById('stepsSection');
    const videoSection = document.getElementById('videoSection');
    const sidebar = document.getElementById('sidebar');

    // ── Init ──
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const slug = getSlugFromURL();
        if (!slug) {
            showError();
            return;
        }

        try {
            const result = await MarathonAPI.getContractBySlug(slug);
            if (!result || !result.success || !result.contract) {
                showError();
                return;
            }

            const contract = result.contract;
            renderContract(contract);
            updatePageMeta(contract);

            loadingState.style.display = 'none';
            contractContent.style.display = '';

            // Setup walkthrough toggles
            setupWalkthroughToggles();
        } catch (err) {
            console.error('Failed to load contract:', err);
            showError();
        }
    }

    function getSlugFromURL() {
        // URL pattern: /contracts/:slug/
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        // parts = ['contracts', 'some-slug']
        if (parts.length >= 2 && parts[0] === 'contracts') {
            return parts[1];
        }
        return null;
    }

    // ── Render ──
    function renderContract(c) {
        const faction = c.faction || {};
        const factionColor = faction.color_surface || '#d4ff00';

        // Set faction color CSS variable
        document.documentElement.style.setProperty('--faction-color', factionColor);

        renderBreadcrumb(c, faction);
        renderHeader(c, faction);
        renderInfoBar(c, faction);
        renderStorySection(c);
        renderContractMedia(c);
        renderSteps(c);
        renderVideo(c);
        renderSidebar(c, faction);
    }

    // ── Story / Lore section (new Contracts API fields) ──
    function renderStorySection(c) {
        if (!c.story_text && !c.story_image_url) return;
        const container = document.getElementById('stepsSection');
        if (!container) return;

        let html = '';
        if (c.story_image_url) {
            html += `<div class="cd-story-image"><img src="${c.story_image_url}" alt="Story image for ${esc(c.name)}" loading="lazy"></div>`;
        }
        if (c.story_text) {
            html += `<div class="cd-story-text">${renderMarkdown(c.story_text)}</div>`;
        }

        // Insert story before the steps
        const storyDiv = document.createElement('div');
        storyDiv.className = 'cd-story-section';
        storyDiv.innerHTML = html;
        container.parentNode.insertBefore(storyDiv, container);
    }

    function renderBreadcrumb(c, faction) {
        const factionName = faction.name || 'Unknown';
        breadcrumb.innerHTML = `
            <a href="/index.html">Home</a>
            <span class="cd-bc-sep">›</span>
            <a href="/contracts/">Contracts</a>
            <span class="cd-bc-sep">›</span>
            <span class="cd-bc-current">${esc(c.name)}</span>
        `;
    }

    function renderHeader(c, faction) {
        const factionName = faction.name || '';
        const factionIcon = faction.icon_url || '';
        const typeClass = c.contract_type || 'permanent';
        const typeLabel = capitalize(c.contract_type || '');
        const diffClass = c.difficulty || '';
        const diffLabel = c.difficulty ? capitalize(c.difficulty) : '';
        const scopeClass = c.scope || '';
        const scopeLabel = c.scope ? capitalize(c.scope.replace(/_/g, ' ')) : '';

        // Tags — new API returns tags as TagObject[] with { slug, name, color }
        const tagsHTML = (c.tags || []).map(tag => {
            const t = typeof tag === 'string' ? { slug: tag, name: capitalize(tag), color: '#666' } : tag;
            const color = t.color || '#666';
            const name = t.name || capitalize(t.slug || '');
            return `<span class="cd-tag" style="border-color:${color};color:${color}">${esc(name)}</span>`;
        }).join('');

        contractHeader.innerHTML = `
            <div class="cd-header-badges">
                ${factionIcon ? `
                <a href="/contracts/?faction=${faction.slug || ''}" class="cd-faction-badge">
                    <img src="${factionIcon}" alt="${esc(factionName)}">
                    ${esc(factionName)}
                </a>` : ''}
                ${typeLabel ? `<span class="cd-type-badge ${typeClass}">${typeLabel}</span>` : ''}
                ${diffLabel ? `<span class="cd-diff-badge ${diffClass}">${diffLabel}</span>` : ''}
                ${scopeLabel ? `<span class="cd-scope-badge ${scopeClass}">${scopeLabel}</span>` : ''}
            </div>
            <h1 class="cd-title">${esc(c.name)}</h1>
            ${c.agent_name ? `<div class="cd-agent-name">Agent: <strong>${esc(c.agent_name)}</strong></div>` : ''}
            ${c.description ? `<p class="cd-description">${esc(c.description)}</p>` : ''}
            ${c.flavor_text ? `<p class="cd-flavor-text"><em>${esc(c.flavor_text)}</em></p>` : ''}
            ${tagsHTML ? `<div class="cd-tags">${tagsHTML}</div>` : ''}
        `;
    }

    function renderInfoBar(c, faction) {
        const items = [];

        // Scope (important for understanding progress)
        if (c.scope) {
            const scopeIcons = {
                'single_run': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M12 8v8m-4-4h8"/></svg>',
                'cumulative': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M8 12h8M8 8h8M8 16h8"/></svg>',
                'session': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
            };
            const scopeLabels = {
                'single_run': 'Single Run',
                'cumulative': 'Cumulative',
                'session': 'Session'
            };
            const scopeTooltips = {
                'single_run': 'Must be completed in one extraction',
                'cumulative': 'Progress saved across multiple runs',
                'session': 'Resets when you log out'
            };
            const scopeIcon = scopeIcons[c.scope] || scopeIcons['cumulative'];
            const scopeLabel = scopeLabels[c.scope] || capitalize(c.scope.replace(/_/g, ' '));
            const scopeTooltip = scopeTooltips[c.scope] || '';
            
            items.push(`
                <div class="cd-info-item" title="${scopeTooltip}">
                    ${scopeIcon}
                    <strong>${scopeLabel}</strong>
                </div>
            `);
        }

        // Steps count
        const stepCount = (c.steps || []).length;
        if (stepCount) {
            items.push(`
                <div class="cd-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <strong>${stepCount}</strong> step${stepCount !== 1 ? 's' : ''}
                </div>
            `);
        }

        // Map
        if (c.map_slug) {
            items.push(`
                <div class="cd-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${formatMapName(c.map_slug)}
                </div>
            `);
        }

        // Reward summary — try reward_summary, then reward_preview, then total_reputation
        const rewardSummary = c.reward_summary
            || (c.reward_preview ? `+${c.reward_preview.total_reputation} Rep` : '')
            || (c.total_reputation ? `+${c.total_reputation} Rep` : '');
        if (rewardSummary) {
            items.push(`
                <div class="cd-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ${esc(rewardSummary)}
                </div>
            `);
        }

        // Choice rewards indicator
        const choiceGroups = c.choice_groups || c.choice_rewards || [];
        if (choiceGroups.length) {
            const totalChoices = choiceGroups.reduce((sum, group) => sum + (group.options ? group.options.length : 0), 0);
            items.push(`
                <div class="cd-info-item cd-choice-indicator" title="This contract lets you choose rewards">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                    <strong>${totalChoices}</strong> Choice Reward${totalChoices !== 1 ? 's' : ''}
                </div>
            `);
        }

        // Repeatable
        if (c.is_repeatable) {
            items.push(`
                <div class="cd-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Repeatable
                </div>
            `);
        }

        // Chain
        let chainHTML = '';
        if (c.chain_position && c.chain_total) {
            const dots = [];
            for (let i = 1; i <= c.chain_total; i++) {
                const cls = i === c.chain_position ? 'current' : (i < c.chain_position ? 'completed' : '');
                dots.push(`<span class="cd-chain-dot ${cls}" title="Part ${i}"></span>`);
            }
            chainHTML = `
                <div class="cd-chain-progress">
                    <span class="cd-chain-label">Part ${c.chain_position} of ${c.chain_total}</span>
                    <div class="cd-chain-dots">${dots.join('')}</div>
                </div>
            `;
        }

        // Build bar with dividers between items
        const infoHTML = items.map((item, i) => {
            return (i > 0 ? '<span class="cd-info-divider"></span>' : '') + item;
        }).join('');

        infoBar.innerHTML = infoHTML + chainHTML;

        // Hide bar if nothing to show
        if (!items.length && !chainHTML) {
            infoBar.style.display = 'none';
        }
    }

    function renderContractMedia(c) {
        // Display contract-level overview media/screenshots
        if (c.media && c.media.length) {
            const mediaHTML = c.media.filter(m => m.type === 'image').map(m => `
                <div class="cd-contract-media-item">
                    <img src="${m.url}" alt="${esc(m.alt || '')}" loading="lazy">
                    ${m.caption ? `<div class="cd-media-caption">${esc(m.caption)}</div>` : ''}
                </div>
            `).join('');
            
            if (mediaHTML) {
                const mediaContainer = document.createElement('div');
                mediaContainer.className = 'cd-contract-media';
                mediaContainer.innerHTML = mediaHTML;
                // Insert after info bar, before steps
                const stepsSection = document.getElementById('stepsSection');
                stepsSection.parentNode.insertBefore(mediaContainer, stepsSection);
            }
        }
    }

    function renderSteps(c) {
        const steps = c.steps || [];
        if (!steps.length) {
            stepsSection.style.display = 'none';
            return;
        }

        let html = `<h2 class="cd-steps-title">Objectives — ${steps.length} Step${steps.length !== 1 ? 's' : ''}</h2>`;
        html += '<div class="cd-timeline">';

        steps.forEach((step, i) => {
            const seqClass = step.is_sequential ? ' sequential' : '';
            const countText = step.count > 1 ? ` (×${step.count})` : '';

            // Location
            let locationHTML = '';
            if (step.location_hint) {
                const mapLink = esc(step.location_hint);
                locationHTML = `
                    <div class="cd-step-location">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${mapLink}
                    </div>
                `;
            }

            // Warnings for this step
            let warningsHTML = '';
            if (step.warnings && step.warnings.length) {
                const warningItems = step.warnings.map(w => {
                    const severityClass = (w.severity || 'low').toLowerCase();
                    const typeClass = (w.type || 'hint').toLowerCase();
                    const iconMap = {
                        'mistake': '⚠️',
                        'danger': '🚨',
                        'hint': '💡',
                        'tip': '✨'
                    };
                    const icon = iconMap[w.type] || '💡';
                    return `
                        <div class="cd-warning ${typeClass} ${severityClass}">
                            <span class="cd-warning-icon">${icon}</span>
                            <span class="cd-warning-message">${esc(w.message)}</span>
                        </div>
                    `;
                }).join('');
                warningsHTML = `<div class="cd-step-warnings">${warningItems}</div>`;
            }

            // Media for this step
            let mediaHTML = '';
            if (step.media && step.media.length) {
                const mediaItems = step.media.map(m => {
                    if (m.type === 'image') {
                        return `
                            <div class="cd-media-item">
                                <img src="${m.url}" alt="${esc(m.alt || '')}" loading="lazy">
                                ${m.caption ? `<div class="cd-media-caption">${esc(m.caption)}</div>` : ''}
                            </div>
                        `;
                    }
                    return '';
                }).join('');
                if (mediaItems) {
                    mediaHTML = `<div class="cd-step-media">${mediaItems}</div>`;
                }
            }

            // Step rewards
            let rewardsHTML = '';
            if (step.rewards && step.rewards.length) {
                const chips = step.rewards.map(r => {
                    const amount = r.amount ? `+${r.amount}` : '';
                    return `<span class="cd-step-reward-chip">${amount} ${esc(r.display_name || r.reward_type)}</span>`;
                }).join('');
                rewardsHTML = `<div class="cd-step-rewards">${chips}</div>`;
            }

            // Walkthrough
            let walkthroughHTML = '';
            if (step.walkthrough) {
                walkthroughHTML = `
                    <div class="cd-walkthrough">
                        <button class="cd-walkthrough-toggle" data-step="${i + 1}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                            View Guide
                        </button>
                        <div class="cd-walkthrough-body">${renderMarkdown(step.walkthrough)}</div>
                    </div>
                `;
            }

            html += `
                <div class="cd-step${seqClass}" id="step-${i + 1}">
                    <div class="cd-step-marker">${i + 1}</div>
                    <div class="cd-step-card">
                        <div class="cd-step-header">
                            <span class="cd-step-name">${esc(step.name)}</span>
                            ${countText ? `<span class="cd-step-count">${countText}</span>` : ''}
                        </div>
                        ${step.description ? `<p class="cd-step-desc">${esc(step.description)}</p>` : ''}
                        ${warningsHTML}
                        ${locationHTML}
                        ${mediaHTML}
                        ${rewardsHTML}
                        ${walkthroughHTML}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        stepsSection.innerHTML = html;
    }

    function renderVideo(c) {
        if (!c.video_url) return;

        let embedUrl = c.video_url;
        // Convert YouTube watch URL to embed URL
        const ytMatch = c.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        if (ytMatch) {
            embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
        }

        videoSection.innerHTML = `
            <h3 class="cd-video-title">Video Guide</h3>
            <iframe src="${embedUrl}" title="Video guide for ${esc(c.name)}" allowfullscreen loading="lazy"></iframe>
        `;
        videoSection.style.display = '';
    }

    function renderSidebar(c, faction) {
        let cards = '';

        // Difficulty rating
        if (c.difficulty_rating !== undefined && c.difficulty_rating !== null) {
            const rating = Math.max(0, Math.min(5, c.difficulty_rating)); // Clamp to 0-5
            const starsHTML = Array.from({ length: 5 }, (_, i) => {
                const filled = i < rating;
                return `<span class="cd-star ${filled ? 'filled' : ''}">${filled ? '★' : '☆'}</span>`;
            }).join('');

            cards += `
                <div class="cd-sidebar-card cd-info-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                        Contract Info
                    </div>
                    <div class="cd-info-content">
                        <div class="cd-difficulty-rating">
                            <span class="cd-info-label">Difficulty</span>
                            <div class="cd-stars">${starsHTML}</div>
                            <span class="cd-rating-text">${rating} out of 5</span>
                        </div>
                        ${c.estimated_time_range || c.estimated_time_minutes ? `
                            <div class="cd-divider"></div>
                            <div class="cd-time-estimate">
                                <span class="cd-info-label">Est. Time</span>
                                <div class="cd-time-value">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                    ${c.estimated_time_range || (c.estimated_time_minutes + ' min')}
                                </div>
                                ${c.time_difficulty_note ? `<span class="cd-time-note">${esc(c.time_difficulty_note)}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Enemy Briefing
        if (c.enemies && c.enemies.length) {
            const enemiesHTML = c.enemies.map(e => {
                const threatStars = Array.from({ length: 5 }, (_, i) => {
                    return i < (e.threat_level || 0) ? '⚠' : '·';
                }).join('');
                return `
                    <div class="cd-enemy-item">
                        <div class="cd-enemy-header">
                            <span class="cd-enemy-name">${esc(e.enemy_type || 'Unknown')}</span>
                            <span class="cd-enemy-quantity">${esc(e.quantity || '')}</span>
                        </div>
                        <div class="cd-enemy-threat" title="Threat level: ${e.threat_level || 0}/5">${threatStars}</div>
                        ${e.location ? `<div class="cd-enemy-location">📍 ${esc(e.location)}</div>` : ''}
                        ${e.notes ? `<div class="cd-enemy-notes">${esc(e.notes)}</div>` : ''}
                    </div>
                `;
            }).join('');

            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                        Enemy Briefing
                    </div>
                    <div class="cd-enemy-list">${enemiesHTML}</div>
                </div>
            `;
        }

        // All Rewards (aggregated from steps + completion)
        const allRewards = [];
        
        // Collect step rewards
        if (c.steps) {
            c.steps.forEach(step => {
                if (step.rewards && step.rewards.length) {
                    step.rewards.forEach(r => {
                        // Find existing reward of same type and add amounts
                        const existing = allRewards.find(ar => 
                            ar.reward_type === r.reward_type && 
                            ar.display_name === r.display_name
                        );
                        if (existing) {
                            existing.amount = (existing.amount || 0) + (r.amount || 0);
                        } else {
                            allRewards.push({ ...r });
                        }
                    });
                }
            });
        }

        // Add completion rewards
        if (c.completion_rewards && c.completion_rewards.length) {
            c.completion_rewards.forEach(r => {
                const existing = allRewards.find(ar => 
                    ar.reward_type === r.reward_type && 
                    ar.display_name === r.display_name
                );
                if (existing) {
                    existing.amount = (existing.amount || 0) + (r.amount || 0);
                } else {
                    allRewards.push({ ...r });
                }
            });
        }

        // Render all rewards
        if (allRewards.length > 0) {
            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Total Rewards
                    </div>
                    <div class="cd-reward-list">
                        ${allRewards.map(r => renderRewardItem(r)).join('')}
                    </div>
                </div>
            `;
        }

        // Completion rewards (legacy - only if different from aggregated)
        if (c.completion_rewards && c.completion_rewards.length) {
            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Completion Rewards
                    </div>
                    <div class="cd-reward-list">
                        ${c.completion_rewards.map(r => renderRewardItem(r)).join('')}
                    </div>
                </div>
            `;
        }

        // Choice rewards
        const sidebarChoiceGroups = c.choice_groups || c.choice_rewards || [];
        if (sidebarChoiceGroups.length) {
            const choiceHTML = sidebarChoiceGroups.map(group => {
                const optionsHTML = (group.options || []).map(opt => {
                    const iconHTML = opt.icon_url
                        ? `<img class="cd-choice-option-icon" src="${opt.icon_url}" alt="${esc(opt.display_name || '')}">`
                        : '';
                    const rarityClass = (opt.rarity || '').toLowerCase();
                    return `
                        <div class="cd-choice-option">
                            ${iconHTML}
                            <div>
                                <span class="cd-choice-option-name">${esc(opt.display_name || '')}</span>
                                ${opt.rarity ? `<span class="cd-choice-option-rarity cd-reward-rarity ${rarityClass}">${opt.rarity}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="cd-choice-group">
                        <div class="cd-choice-prompt">${esc(group.prompt || 'Choose a reward')}</div>
                        <div class="cd-choice-pick-info">Pick ${group.min_picks || 1}${group.max_picks && group.max_picks !== group.min_picks ? `–${group.max_picks}` : ''}</div>
                        <div class="cd-choice-options">${optionsHTML}</div>
                    </div>
                `;
            }).join('');

            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                        Choose Your Reward
                    </div>
                    ${choiceHTML}
                </div>
            `;
        }

        // Contract-level Warnings
        if (c.warnings && c.warnings.length) {
            const warningsHTML = c.warnings.map(w => {
                const severityClass = (w.severity || 'low').toLowerCase();
                const typeClass = (w.type || 'hint').toLowerCase();
                const iconMap = {
                    'mistake': '⚠️',
                    'danger': '🚨',
                    'hint': '💡',
                    'tip': '✨'
                };
                const icon = iconMap[w.type] || '💡';
                return `
                    <div class="cd-warning ${typeClass} ${severityClass}">
                        <span class="cd-warning-icon">${icon}</span>
                        <span class="cd-warning-message">${esc(w.message)}</span>
                    </div>
                `;
            }).join('');

            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Important Notes
                    </div>
                    <div class="cd-warnings-list">${warningsHTML}</div>
                </div>
            `;
        }

        // Prerequisites
        if (c.prerequisites && c.prerequisites.length) {
            const prereqHTML = c.prerequisites.map(p => {
                let icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
                let text = esc(p.description || '');

                if (p.type === 'contract' && p.slug) {
                    text = `Complete <a href="/contracts/${p.slug}/">${esc(p.name || p.slug)}</a>`;
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
                } else if (p.type === 'reputation_rank') {
                    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                }

                return `<div class="cd-prereq-item">${icon} <span>${text}</span></div>`;
            }).join('');

            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Prerequisites
                    </div>
                    <div class="cd-prereq-list">${prereqHTML}</div>
                </div>
            `;
        }

        // Tips
        if (c.tips && c.tips.length) {
            const tipsHTML = c.tips.map(t => `<li>${esc(t)}</li>`).join('');
            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                        Tips &amp; Strategy
                    </div>
                    <ul class="cd-tips-list">${tipsHTML}</ul>
                </div>
            `;
        }

        // Related contracts — new API uses 'related', old API used 'related_contracts'
        const relatedList = c.related || c.related_contracts || [];
        if (relatedList.length) {
            const relatedHTML = relatedList.map(r => {
                const typeClass = r.contract_type || 'permanent';
                const typeLabel = capitalize(r.contract_type || '');
                const href = r.slug ? `/contracts/${r.slug}/` : '#';
                return `
                    <a href="${href}" class="cd-related-item">
                        <span class="cd-related-name">${esc(r.name)}</span>
                        <span class="cd-related-type ${typeClass}">${typeLabel}</span>
                    </a>
                `;
            }).join('');

            cards += `
                <div class="cd-sidebar-card">
                    <div class="cd-sidebar-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Related Contracts
                    </div>
                    <div class="cd-related-list">${relatedHTML}</div>
                </div>
            `;
        }

        sidebar.innerHTML = cards;
    }

    function renderRewardItem(r) {
        const iconClass = r.reward_type || 'item';
        const rarityClass = (r.rarity || '').toLowerCase();
        const amountText = r.amount ? (r.reward_type === 'reputation' ? `+${r.amount}` : `×${r.amount}`) : '';

        // Icon SVG based on type
        let iconSVG;
        switch (r.reward_type) {
            case 'reputation':
                iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                break;
            case 'credits':
            case 'currency':
                iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
                break;
            case 'xp':
                iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>';
                break;
            default:
                iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
        }

        // If there's an icon_url, use image instead of SVG
        const iconContent = r.icon_url
            ? `<img src="${r.icon_url}" alt="${esc(r.display_name || '')}">`
            : iconSVG;

        const chanceText = r.drop_chance && !r.is_guaranteed
            ? `<span class="cd-reward-chance">${r.drop_chance}% chance</span>`
            : '';

        return `
            <div class="cd-reward-item">
                <div class="cd-reward-icon ${iconClass}">${iconContent}</div>
                <div class="cd-reward-info">
                    <span class="cd-reward-name">${esc(r.display_name || r.reward_type)}</span>
                    <span>
                        ${amountText ? `<span class="cd-reward-amount">${amountText}</span>` : ''}
                        ${r.rarity ? `<span class="cd-reward-rarity ${rarityClass}">${r.rarity}</span>` : ''}
                    </span>
                    ${chanceText}
                </div>
            </div>
        `;
    }

    // ── Walkthrough toggle ──
    function setupWalkthroughToggles() {
        document.querySelectorAll('.cd-walkthrough-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const content = btn.nextElementSibling;
                const isOpen = content.classList.contains('show');

                if (isOpen) {
                    content.classList.remove('show');
                    btn.classList.remove('open');
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                        View Guide
                    `;
                } else {
                    content.classList.add('show');
                    btn.classList.add('open');
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                        Hide Guide
                    `;
                }
            });
        });
    }

    // ── Page meta ──
    function updatePageMeta(c) {
        const title = `${c.name} — Contract Guide | MARATHON DB`;
        document.title = title;

        const faction = c.faction || {};
        const desc = `${c.name} contract guide for ${faction.name || 'Marathon'}. ${(c.steps || []).length}-step mission with walkthrough, objectives, and rewards.`;

        updateMeta('description', desc);
        updateMeta('og:title', title, 'property');
        updateMeta('og:description', desc, 'property');
        updateMeta('twitter:title', title);
        updateMeta('twitter:description', desc);

        if (faction.icon_url) {
            updateMeta('og:image', faction.icon_url, 'property');
            updateMeta('twitter:image', faction.icon_url);
        }
    }

    function updateMeta(name, content, attr = 'name') {
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    // ── Helpers ──
    function showError() {
        loadingState.style.display = 'none';
        contractContent.style.display = 'none';
        errorState.style.display = 'flex';
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
    }

    function formatMapName(slug) {
        if (!slug) return '';
        return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Basic markdown-to-HTML renderer for walkthrough content.
     * Handles: **bold**, headers (###), paragraphs, lists, blockquotes
     */
    function renderMarkdown(md) {
        if (!md) return '';
        let html = md
            // Escape HTML entities first
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Restore blockquotes (> at line start)
            .replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>')
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Unordered lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            // Ordered lists
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            // Paragraphs (double newline)
            .replace(/\n\n/g, '</p><p>')
            // Single newlines within paragraphs
            .replace(/\n/g, '<br>');

        // Wrap consecutive <li> in <ul>
        html = html.replace(/(<li>.*?<\/li>)+/gs, match => `<ul>${match}</ul>`);

        // Merge consecutive blockquotes
        html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

        // Wrap in paragraph if needed
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }

        return html;
    }

})();
