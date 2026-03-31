// Enhanced Profile Page with ALL API Features
// Includes: Emotes, Followers, VODs, Clips, Teams, Moderators, VIPs, Schedule

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    if (!username) {
        document.getElementById('loading').innerHTML = 'No creator specified';
        return;
    }

    loadCompleteProfile(username);
});

async function loadCompleteProfile(username) {
    const loading = document.getElementById('loading');
    const content = document.getElementById('profile-content');

    try {
        loading.textContent = `Loading profile for ${username}...`;
        
        // Use V2 optimized endpoints
        const [creatorData, videosData, clipsData, teamsData,
               profile7d, profile30d] = await Promise.all([
            fetch(`https://twitch.gdb.gg/api/v2/creators/${username}/current`).then(r => r.ok ? r.json() : null),
            fetch(`https://twitch.gdb.gg/api/v2/channels/${username}/videos?limit=12`).then(r => r.ok ? r.json() : null),
            fetch(`https://twitch.gdb.gg/api/v2/channels/${username}/clips?period=month&limit=50`).then(r => r.ok ? r.json() : null),
            fetch(`https://twitch.gdb.gg/api/v2/channels/${username}/teams`).then(r => r.ok ? r.json() : null),
            // Unified profile API for historical data (7d and 30d periods)
            fetch(`https://twitch.gdb.gg/api/v2/creators/${username}/profile-v2?period=7d&points_per_hour=2&sessions_limit=20`).then(r => r.ok ? r.json() : null),
            fetch(`https://twitch.gdb.gg/api/v2/creators/${username}/profile-v2?period=30d&points_per_hour=1&sessions_limit=30`).then(r => r.ok ? r.json() : null)
        ]);

        if (!creatorData) {
            throw new Error('Creator not found');
        }
        
        // Filter clips client-side by time period
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const weekMs = 7 * dayMs;
        
        const allClips = clipsData && clipsData.clips ? clipsData.clips : [];
        const clipsByPeriod = {
            day: allClips.filter(c => (now - new Date(c.created_at).getTime()) <= dayMs),
            week: allClips.filter(c => (now - new Date(c.created_at).getTime()) <= weekMs),
            month: allClips
        };
        // Sort clips newest first everywhere
        Object.keys(clipsByPeriod).forEach(k => {
            clipsByPeriod[k] = (clipsByPeriod[k] || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
        
        loading.style.display = 'none';
        content.style.display = 'block';
        
    renderProfile(creatorData, videosData, clipsByPeriod, null, teamsData,
                  { profile7d, profile30d }, username);
    } catch (error) {
        loading.innerHTML = `
            <p>Error loading profile: ${error.message}</p>
            <a href="/twitch/" class="btn-primary">Back to Twitch</a>
        `;
    }
}

function renderProfile(creator, videos, clipsByPeriod, emotes, teams, historicalData, username) {
    const content = document.getElementById('profile-content');
    
    // New creator endpoint returns different structure - adapt here
    const isLive = creator.is_live || false;
    const stream = creator.stream || null;
    const stats = creator.stats || {};
    const followerCount = stats.follower_count || 0;
    
    // V2 Historical data
    const { profile7d, profile30d } = historicalData || {};
    
    // Use profile_image_url from API (now available after backend update)
    const profileImageUrl = creator.profile_image_url || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png';
    
    // Update SEO meta tags dynamically
    const displayName = creator.display_name || username;
    const followerStr = followerCount ? `${followerCount.toLocaleString()} followers` : '';
    const liveStatus = isLive ? '🔴 LIVE NOW' : '';
    const gameName = stream?.game_name || '';
    
    // Update page title
    document.title = `${displayName} - Twitch Stats & Analytics | gdb.gg`;
    
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descParts = [
            `View ${displayName}'s Twitch statistics`,
            followerStr,
            liveStatus,
            gameName ? `streaming ${gameName}` : '',
            'follower growth, viewership analytics, clips, and VODs on gdb.gg'
        ].filter(Boolean);
        metaDesc.setAttribute('content', descParts.join(' • '));
    }
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${displayName} - Twitch Stats | gdb.gg`);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
        ogDesc.setAttribute('content', `${followerStr ? followerStr + ' • ' : ''}Track ${displayName}'s Twitch growth, clips, and streaming analytics.`);
    }
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
        const newOgImage = document.createElement('meta');
        newOgImage.setAttribute('property', 'og:image');
        newOgImage.setAttribute('content', profileImageUrl);
        document.head.appendChild(newOgImage);
    } else {
        ogImage.setAttribute('content', profileImageUrl);
    }
    
    // Update Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', `${displayName} - Twitch Stats | gdb.gg`);
    
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) {
        twitterDesc.setAttribute('content', `${followerStr ? followerStr + ' • ' : ''}View ${displayName}'s Twitch analytics and growth.`);
    }
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
        const newTwitterImage = document.createElement('meta');
        newTwitterImage.setAttribute('name', 'twitter:image');
        newTwitterImage.setAttribute('content', profileImageUrl);
        document.head.appendChild(newTwitterImage);
    } else {
        twitterImage.setAttribute('content', profileImageUrl);
    }
    
    // Tracking status info
    const dataAge = creator.data_age_seconds || 0;
    const cacheRemaining = creator.approx_cache_ttl_remaining_seconds || 0;
    const isFresh = dataAge < 300; // Less than 5 minutes is fresh
    const lastUpdateMins = Math.floor(dataAge / 60);
    const nextUpdateMins = Math.floor(cacheRemaining / 60);
    
    content.innerHTML = `
        <!-- Profile Header -->
        <div class="profile-header-enhanced">
            <div class="profile-avatar-container">
                <img src="${profileImageUrl}" alt="${creator.display_name}" class="profile-avatar-xl ${isLive ? 'live' : ''}" 
                     onerror="this.src='https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png'">
                ${isLive ? '<div class="avatar-live-tag">🔴 LIVE</div>' : ''}
            </div>
            <div class="profile-header-info">
                <h1>${creator.display_name}</h1>
                ${isLive && stream ? `
                <div class="live-now-inline">
                    <span class="live-pill">🔴 ${stream.viewer_count.toLocaleString()} watching</span>
                    <span class="live-meta">${stream.game_name || ''}</span>
                    <span class="live-title">${(stream.title || '').substring(0, 80)}${(stream.title || '').length > 80 ? '…' : ''}</span>
                </div>
                ` : ''}
                <div class="profile-quick-stats">
                    <div class="quick-stat">
                        <span class="stat-number">${followerCount.toLocaleString()}</span>
                        <span class="stat-label">Followers</span>
                    </div>
                </div>
            </div>
            
            <!-- Tracking Status Indicator -->
            <div class="tracking-status">
                <a href="https://twitch.tv/${creator.login}" target="_blank" class="btn-primary">Watch on Twitch</a>
                <div class="tracking-indicator ${isFresh ? 'fresh' : 'stale'}">
                    <span class="status-dot"></span>
                    <span class="status-label">${isFresh ? 'Live Data' : 'Cached'}</span>
                </div>
                <div class="tracking-details">
                    <small>Updated: ${lastUpdateMins === 0 ? 'just now' : `${lastUpdateMins}m ago`}</small>
                    ${cacheRemaining > 0 ? `<small>Next: ~${nextUpdateMins}m</small>` : ''}
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="tabs-nav">
            <button class="tab-btn active" data-tab="overview">Overview</button>
            <button class="tab-btn" data-tab="clips">Clips</button>
            <button class="tab-btn" data-tab="videos">VODs</button>
            <button class="tab-btn" data-tab="emotes" data-lazy="true">Emotes</button>
            <button class="tab-btn" data-tab="teams">Teams</button>
        </div>

        <!-- Tab Content -->
        <div class="tabs-content">
            <!-- Overview Tab -->
            <div class="tab-pane active" id="overview">
                <div class="card-enhanced">
                    <h3>Growth</h3>
                    <div class="toggle-group" id="growth-toggle">
                        <button class="toggle-btn" data-range="24h">24h</button>
                        <button class="toggle-btn active" data-range="7d">1 week</button>
                        <button class="toggle-btn" data-range="30d">30 days</button>
                        <button class="toggle-btn" data-range="all">All time</button>
                        <button class="toggle-btn active" id="toggle-charts-btn" style="margin-left: auto;">Hide Charts</button>
                    </div>
                    <div class="stats-grid" id="growth-stats">
                        <!-- Filled by JS -->
                    </div>
                    <p class="tab-footer" id="growth-note">Estimates based on recent clips and VODs</p>
                    
                    <!-- Charts Section -->
                    <div class="charts-section" id="charts-section">
                        <div class="charts-grid" id="charts-container">
                            <!-- Charts will be added by JS -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clips Tab -->
            <div class="tab-pane" id="clips">
                ${clipsByPeriod && clipsByPeriod.week && clipsByPeriod.week.length > 0 ? `
                <div class="clips-grid">
                    ${clipsByPeriod.week.map((clip, index) => `
                        <a href="${clip.url}" target="_blank" class="clip-card">
                            <div class="clip-rank">#${index + 1}</div>
                            <img src="${clip.thumbnail_url}" alt="${clip.title}" class="clip-thumbnail">
                            <div class="clip-info">
                                <h4>${clip.title}</h4>
                                <p class="clip-creator">Clipped by ${clip.creator_name}</p>
                                <div class="clip-stats">
                                    <span>👁️ ${clip.view_count.toLocaleString()} views</span>
                                    <span>⏱️ ${clip.duration.toFixed(0)}s</span>
                                </div>
                                <p class="clip-date">${new Date(clip.created_at).toLocaleDateString()}</p>
                            </div>
                        </a>
                    `).join('')}
                </div>
                <p class="tab-footer">Showing top clips from the past week</p>
                ` : '<p class="empty-state">No clips found</p>'}
            </div>

            <!-- Videos Tab -->
            <div class="tab-pane" id="videos">
                ${videos && videos.total_videos_returned > 0 ? `
                <div class="videos-grid">
                    ${videos.videos.map(video => `
                        <a href="${video.url}" target="_blank" class="video-card">
                            <img src="${video.thumbnail_url.replace('%{width}', '440').replace('%{height}', '248')}" 
                                 alt="${video.title}" class="video-thumbnail">
                            <div class="video-info">
                                <h4>${video.title}</h4>
                                <div class="video-stats">
                                    <span>👁️ ${video.view_count.toLocaleString()} views</span>
                                    <span>⏱️ ${video.duration}</span>
                                </div>
                                <p class="video-date">${new Date(video.created_at).toLocaleDateString()}</p>
                            </div>
                        </a>
                    `).join('')}
                </div>
                <p class="tab-footer">Showing recent VODs</p>
                ` : '<p class="empty-state">No VODs found</p>'}
            </div>

            <!-- Emotes Tab -->
            <div class="tab-pane" id="emotes">
                <p class="loading-text">Loading emotes...</p>
            </div>

            <!-- Teams Tab -->
            <div class="tab-pane" id="teams">
                ${teams && teams.total_teams > 0 ? `
                <div class="teams-detailed">
                    ${teams.teams.map(team => `
                        <div class="team-detailed-card">
                            ${team.banner ? `<img src="${team.banner}" alt="${team.team_display_name}" class="team-banner">` : ''}
                            <div class="team-content">
                                ${team.thumbnail_url ? `<img src="${team.thumbnail_url}" alt="${team.team_display_name}" class="team-logo">` : ''}
                                <div>
                                    <h3>${team.team_display_name}</h3>
                                    <p>${team.info || 'No description available'}</p>
                                    <p class="team-meta">Created: ${new Date(team.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : '<p class="empty-state">Not part of any teams</p>'}
            </div>
        </div>
    `;

    // Setup tab switching
    setupTabs();

    // Compute and render growth metrics using real historical data
    try {
        // Compute and render growth metrics using real historical data
        const videosList = (videos && videos.videos) ? videos.videos : [];
        const clipsDay = clipsByPeriod.day || [];
        const clipsWeek = clipsByPeriod.week || [];
        const clipsMonth = clipsByPeriod.month || [];

        function summarizeGrowth(range) {
            if (range === '24h') {
                // 24h approximation - estimate from 7d data
                const vods24h = videosList.filter(v => (Date.now() - new Date(v.created_at).getTime()) <= 24 * 60 * 60 * 1000);
                return {
                    followers: followerCount,
                    followersDelta: profile7d && profile7d.followers ? Math.round(profile7d.followers.total_change / 7) : 0,
                    vods: vods24h.length,
                    vodViews: vods24h.reduce((s, v) => s + (v.view_count || 0), 0),
                    clips: clipsDay.length,
                    clipViews: clipsDay.reduce((s, c) => s + (c.view_count || 0), 0),
                    hoursLive: profile7d && profile7d.streaming ? Math.round(profile7d.streaming.total_hours / 7) : 0,
                    avgViewers: profile7d && profile7d.streaming ? profile7d.streaming.avg_viewers : 0,
                    note: 'Past 24 hours'
                };
            } else if (range === '7d') {
                return {
                    followers: followerCount,
                    followersDelta: profile7d && profile7d.followers ? profile7d.followers.total_change : 0,
                    vods: clipsWeek.length, // using clips as proxy
                    vodViews: clipsWeek.reduce((s, c) => s + (c.view_count || 0), 0),
                    clips: clipsWeek.length,
                    clipViews: clipsWeek.reduce((s, c) => s + (c.view_count || 0), 0),
                    hoursLive: profile7d && profile7d.streaming ? profile7d.streaming.total_hours : 0,
                    avgViewers: profile7d && profile7d.streaming ? profile7d.streaming.avg_viewers : 0,
                    peakViewers: profile7d && profile7d.streaming ? profile7d.streaming.peak_viewers : 0,
                    sessions: profile7d && profile7d.streaming ? profile7d.streaming.total_sessions : 0,
                    note: 'Past 7 days'
                };
            } else if (range === '30d') {
                return {
                    followers: followerCount,
                    followersDelta: profile30d && profile30d.followers ? profile30d.followers.total_change : 0,
                    vods: clipsMonth.length, // using clips as proxy
                    vodViews: clipsMonth.reduce((s, c) => s + (c.view_count || 0), 0),
                    clips: clipsMonth.length,
                    clipViews: clipsMonth.reduce((s, c) => s + (c.view_count || 0), 0),
                    hoursLive: profile30d && profile30d.streaming ? profile30d.streaming.total_hours : 0,
                    avgViewers: profile30d && profile30d.streaming ? profile30d.streaming.avg_viewers : 0,
                    peakViewers: profile30d && profile30d.streaming ? profile30d.streaming.peak_viewers : 0,
                    sessions: profile30d && profile30d.streaming ? profile30d.streaming.total_sessions : 0,
                    note: 'Past 30 days'
                };
            } else {
                // all time - use 30d data as best available window
                const allSessions = profile30d && profile30d.streaming && profile30d.streaming.sessions ? profile30d.streaming.sessions : [];
                const historyData = profile30d && profile30d.followers && profile30d.followers.history ? profile30d.followers.history : [];
                return {
                    followers: followerCount,
                    followersDelta: historyData.length > 1 ? historyData[historyData.length - 1].follower_count - historyData[0].follower_count : 0,
                    vods: videosList.length,
                    vodViews: videosList.reduce((s, v) => s + (v.view_count || 0), 0),
                    clips: clipsMonth.length,
                    clipViews: [...clipsDay, ...clipsWeek, ...clipsMonth].reduce((s, c) => s + (c.view_count || 0), 0),
                    hoursLive: allSessions.length > 0 ? allSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60 : 0,
                    avgViewers: allSessions.length > 0 ? allSessions.reduce((sum, s) => sum + (s.average_viewers || 0), 0) / allSessions.length : 0,
                    peakViewers: allSessions.length > 0 ? Math.max(...allSessions.map(s => s.peak_viewers || 0)) : 0,
                    sessions: allSessions.length,
                    note: 'All-time (based on available data windows)'
                };
            }
        }

        function renderGrowth(range) {
            const s = summarizeGrowth(range);
            const el = document.getElementById('growth-stats');
            const deltaSymbol = s.followersDelta > 0 ? '+' : '';
            const deltaClass = s.followersDelta > 0 ? 'positive' : (s.followersDelta < 0 ? 'negative' : '');
            
            // Helper to add size class based on number length
            const getSizeClass = (num) => {
                const str = num.toLocaleString();
                if (str.length > 10) return 'xlarge-number';
                if (str.length > 7) return 'large-number';
                return '';
            };
            
            el.innerHTML = `
                <div class="stat-box">
                    <div class="stat-box-label">Followers</div>
                    <div class="stat-box-value ${getSizeClass(s.followers)}">${s.followers.toLocaleString()}</div>
                    ${s.followersDelta !== 0 ? `<div class="stat-box-delta ${deltaClass}">${deltaSymbol}${s.followersDelta.toLocaleString()}</div>` : ''}
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Hours Live</div>
                    <div class="stat-box-value">${Math.round(s.hoursLive)}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Avg Viewers</div>
                    <div class="stat-box-value">${Math.round(s.avgViewers).toLocaleString()}</div>
                </div>
                ${s.peakViewers ? `
                <div class="stat-box">
                    <div class="stat-box-label">Peak Viewers</div>
                    <div class="stat-box-value">${s.peakViewers.toLocaleString()}</div>
                </div>
                ` : ''}
                ${s.sessions ? `
                <div class="stat-box">
                    <div class="stat-box-label">Streams</div>
                    <div class="stat-box-value">${s.sessions}</div>
                </div>
                ` : ''}
                <div class="stat-box">
                    <div class="stat-box-label">Clips Created</div>
                    <div class="stat-box-value">${s.clips}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Clip Views</div>
                    <div class="stat-box-value ${getSizeClass(s.clipViews)}">${s.clipViews.toLocaleString()}</div>
                </div>
            `;
            const note = document.getElementById('growth-note');
            note.textContent = s.note;
        }

        // Initialize charts
        let chartInstances = {};
        let chartsVisible = true;
        
        function toggleCharts() {
            const chartsSection = document.getElementById('charts-section');
            const toggleBtn = document.getElementById('toggle-charts-btn');
            chartsVisible = !chartsVisible;
            
            if (chartsVisible) {
                chartsSection.classList.remove('hidden');
                toggleBtn.textContent = 'Hide Charts';
                if (Object.keys(chartInstances).length === 0) {
                    initializeCharts();
                }
            } else {
                chartsSection.classList.add('hidden');
                toggleBtn.textContent = 'Show Charts';
            }
        }
        
        function initializeCharts() {
            const chartsContainer = document.getElementById('charts-container');
            
            // Create chart canvases
            chartsContainer.innerHTML = `
                <div class="chart-container">
                    <h4>Followers Over Time</h4>
                    <div class="chart-wrapper">
                        <canvas id="followers-chart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <h4>Viewers & Avg Viewers</h4>
                    <div class="chart-wrapper">
                        <canvas id="viewers-chart"></canvas>
                    </div>
                </div>
            `;
            
            // Prepare data from unified profile-v2 API
            const followersData = profile30d && profile30d.followers && profile30d.followers.history ? profile30d.followers.history : [];
            const sessionsData = profile30d && profile30d.streaming && profile30d.streaming.sessions ? profile30d.streaming.sessions : [];
            
            // Followers Chart
            if (followersData.length > 0) {
                const ctx1 = document.getElementById('followers-chart').getContext('2d');
                const gradient1 = ctx1.createLinearGradient(0, 0, 0, 300);
                gradient1.addColorStop(0, 'rgba(0, 243, 255, 0.3)');
                gradient1.addColorStop(1, 'rgba(0, 243, 255, 0)');
                
                chartInstances.followers = new Chart(ctx1, {
                    type: 'line',
                    data: {
                        labels: followersData.map(d => {
                            const date = new Date(d.timestamp);
                            return date.toLocaleDateString();
                        }),
                        datasets: [{
                            label: 'Followers',
                            data: followersData.map(d => d.follower_count),
                            borderColor: '#00f3ff',
                            backgroundColor: gradient1,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 2,
                            pointHoverRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#e0e0e0',
                                    font: { family: 'Courier New', size: 12 }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(19, 19, 26, 0.95)',
                                titleColor: '#00f3ff',
                                bodyColor: '#e0e0e0',
                                borderColor: '#00f3ff',
                                borderWidth: 2,
                                titleFont: { family: 'Courier New', size: 14 },
                                bodyFont: { family: 'Courier New', size: 12 },
                                callbacks: {
                                    title: (items) => {
                                        const index = items[0].dataIndex;
                                        return new Date(followersData[index].timestamp).toLocaleString();
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                ticks: {
                                    color: '#888',
                                    font: { family: 'Courier New' }
                                },
                                grid: { color: 'rgba(0, 243, 255, 0.1)' }
                            },
                            x: {
                                ticks: {
                                    color: '#888',
                                    font: { family: 'Courier New' }
                                },
                                grid: { color: 'rgba(0, 243, 255, 0.1)' }
                            }
                        }
                    }
                });
            }
            
            // Viewers Chart (from sessions data) - Aggregate by day, one entry per day
            if (sessionsData.length > 0) {
                const ctx2 = document.getElementById('viewers-chart').getContext('2d');
                
                // Group sessions by date and aggregate metrics
                const sessionsByDate = new Map();
                sessionsData.forEach(session => {
                    const date = new Date(session.started_at).toLocaleDateString();
                    if (!sessionsByDate.has(date)) {
                        sessionsByDate.set(date, {
                            peakViewers: [],
                            avgViewers: [],
                            timestamp: session.started_at
                        });
                    }
                    const day = sessionsByDate.get(date);
                    day.peakViewers.push(session.peak_viewers || 0);
                    day.avgViewers.push(session.average_viewers || 0);
                });
                
                // Convert to array and aggregate - take max peak and average of avgs per day
                const aggregatedData = Array.from(sessionsByDate.entries()).map(([date, data]) => ({
                    date,
                    timestamp: data.timestamp,
                    peakViewers: Math.max(...data.peakViewers),
                    avgViewers: Math.round(data.avgViewers.reduce((a, b) => a + b, 0) / data.avgViewers.length)
                }));
                
                // Sort by timestamp ascending (oldest to newest)
                aggregatedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
                chartInstances.viewers = new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: aggregatedData.map(d => d.date),
                        datasets: [{
                            label: 'Peak Viewers',
                            data: aggregatedData.map(d => d.peakViewers),
                            backgroundColor: 'rgba(255, 0, 110, 0.7)',
                            borderColor: '#ff006e',
                            borderWidth: 2
                        }, {
                            label: 'Avg Viewers',
                            data: aggregatedData.map(d => d.avgViewers),
                            backgroundColor: 'rgba(0, 255, 159, 0.7)',
                            borderColor: '#00ff9f',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#e0e0e0',
                                    font: { family: 'Courier New', size: 12 }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(19, 19, 26, 0.95)',
                                titleColor: '#ff006e',
                                bodyColor: '#e0e0e0',
                                borderColor: '#ff006e',
                                borderWidth: 2,
                                titleFont: { family: 'Courier New', size: 14 },
                                bodyFont: { family: 'Courier New', size: 12 }
                            }
                        },
                        scales: {
                            y: {
                                ticks: {
                                    color: '#888',
                                    font: { family: 'Courier New' }
                                },
                                grid: { color: 'rgba(255, 0, 110, 0.1)' }
                            },
                            x: {
                                ticks: {
                                    color: '#888',
                                    font: { family: 'Courier New' }
                                },
                                grid: { color: 'rgba(255, 0, 110, 0.1)' }
                            }
                        }
                    }
                });
            }
        }
        
        // Wire up toggle charts button
        document.getElementById('toggle-charts-btn').addEventListener('click', toggleCharts);

        // Wire toggle buttons
        const toggle = document.getElementById('growth-toggle');
        toggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.toggle-btn');
            if (!btn || btn.id === 'toggle-charts-btn') return;
            toggle.querySelectorAll('.toggle-btn').forEach(b => {
                if (b.id !== 'toggle-charts-btn') b.classList.remove('active');
            });
            btn.classList.add('active');
            renderGrowth(btn.dataset.range);
        });

        // Initial range
        renderGrowth('7d');
        
        // Initialize charts by default (charts are visible on load)
        initializeCharts();
    } catch (_) {
        // Non-fatal; growth section will simply remain empty
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    let emotesLoaded = false;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to current
            btn.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Lazy-load emotes on first click
            if (tabName === 'emotes' && !emotesLoaded && btn.dataset.lazy) {
                emotesLoaded = true;
                loadEmotes();
            }
        });
    });
}

// Lazy-load emotes when Emotes tab is clicked
async function loadEmotes() {
    const emotesPane = document.getElementById('emotes');
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    
    try {
        const response = await fetch(`https://twitch.gdb.gg/api/v2/channels/${username}/emotes`);
        if (!response.ok) throw new Error('Failed to load emotes');
        
        const emotes = await response.json();
        
        if (emotes && emotes.total_emotes > 0) {
            emotesPane.innerHTML = `
                <div class="emotes-grid">
                    ${emotes.emotes.map(emote => `
                        <div class="emote-card" title="${emote.name}">
                            <img src="${emote.images.url_2x}" alt="${emote.name}" class="emote-image">
                            <p class="emote-name">${emote.name}</p>
                        </div>
                    `).join('')}
                </div>
                <p class="tab-footer">${emotes.total_emotes} total emotes</p>
            `;
            // Update tab button with count
            const emotesBtn = document.querySelector('.tab-btn[data-tab="emotes"]');
            if (emotesBtn) {
                emotesBtn.textContent = `Emotes (${emotes.total_emotes})`;
            }
        } else {
            emotesPane.innerHTML = '<p class="empty-state">No custom emotes</p>';
        }
    } catch (error) {
        emotesPane.innerHTML = '<p class="error-text">Failed to load emotes</p>';
    }
}
