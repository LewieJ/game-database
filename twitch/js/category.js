// Category page functionality

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');
    const categoryName = urlParams.get('name');

    if (!categoryId) {
        document.getElementById('loading').innerHTML = 'No category specified';
        return;
    }

    loadCategoryData(categoryId, categoryName);
});

async function loadCategoryData(categoryId, categoryName) {
    const loading = document.getElementById('loading');
    const content = document.getElementById('category-content');

    try {
        loading.textContent = `Loading ${categoryName || 'category'}...`;
        
        // Fetch category details and history in parallel using V2 endpoints
        const [categoryResponse, history1d, history7d, history30d] = await Promise.all([
            fetch(`https://twitch.gdb.gg/api/v2/categories/${categoryId}/current-v2`),
            fetch(`https://twitch.gdb.gg/api/v2/categories/${categoryId}/history-v2?range=1d`).then(r => r.ok ? r.json() : null),
            fetch(`https://twitch.gdb.gg/api/v2/categories/${categoryId}/history-v2?range=7d`).then(r => r.ok ? r.json() : null),
            fetch(`https://twitch.gdb.gg/api/v2/categories/${categoryId}/history-v2?range=30d`).then(r => r.ok ? r.json() : null)
        ]);
        
        if (!categoryResponse.ok) {
            // Fallback: Try to fetch from live Twitch data
            if (categoryResponse.status === 404) {
                loading.textContent = `Category not yet tracked. Fetching live data from Twitch...`;
                
                const fallbackResponse = await fetch(`https://twitch.gdb.gg/api/v2/categories/${categoryId}?max_pages=1&top=10`);
                
                if (!fallbackResponse.ok) {
                    throw new Error('Category not found on Twitch');
                }
                
                const fallbackData = await fallbackResponse.json();
                
                // Render with fallback data and a notice
                renderCategoryPageWithFallback(fallbackData, loading, content, categoryId, categoryName);
                return;
            }
            throw new Error('Category not found');
        }

        const categoryData = await categoryResponse.json();
        
        renderCategoryPage(categoryData, loading, content, categoryId, categoryName, { history1d, history7d, history30d });
    } catch (error) {
        loading.innerHTML = `
            <p>Error loading category: ${error.message}</p>
            <a href="/twitch/" class="btn-primary">Back to Twitch</a>
        `;
    }
}

function renderCategoryHistory(historicalData = {}) {
    const { history1d, history7d, history30d } = historicalData;
    
    // If no historical data available, show nothing
    if (!history1d && !history7d && !history30d) {
        return '';
    }
    
    // Default to 7d view
    const activeRange = '7d';
    
    return `
        <div class="charts-section">
            <h3>Growth & Trends</h3>
            <div class="toggle-group">
                <button class="toggle-btn" data-range="1d" onclick="switchHistoryRange('1d')">24 Hours</button>
                <button class="toggle-btn active" data-range="7d" onclick="switchHistoryRange('7d')">7 Days</button>
                <button class="toggle-btn" data-range="30d" onclick="switchHistoryRange('30d')">30 Days</button>
                <button class="toggle-btn" id="chart-visibility-toggle" onclick="toggleChartVisibility()" style="margin-left: auto;">
                    � Hide Charts
                </button>
            </div>
            <div id="history-content-1d" class="history-content" style="display: none;">${renderHistoryStats(history1d, '24h')}
                ${history1d && history1d.timeseries ? renderCharts(history1d, '1d') : '<p class="empty-state">No chart data available for 24 hours (need at least 2 data points)</p>'}
            </div>
            <div id="history-content-7d" class="history-content">
                ${renderHistoryStats(history7d, '7d')}
                ${history7d && history7d.timeseries ? renderCharts(history7d, '7d') : '<p class="empty-state">No chart data available for 7 days yet</p>'}
            </div>
            <div id="history-content-30d" class="history-content" style="display: none;">
                ${renderHistoryStats(history30d, '30d')}
                ${history30d && history30d.timeseries ? renderCharts(history30d, '30d') : '<p class="empty-state">No chart data available for 30 days yet</p>'}
            </div>
        </div>
    `;
}

function renderCharts(historyData, range) {
    if (!historyData || !historyData.timeseries || historyData.timeseries.length === 0) {
        return '';
    }
    
    return `
        <div class="charts-grid" id="charts-grid-${range}" style="display: grid;">
            <div class="chart-container">
                <h4>👁️ Viewers Over Time</h4>
                <div class="chart-wrapper">
                    <canvas id="viewers-chart-${range}"></canvas>
                </div>
            </div>
            <div class="chart-container">
                <h4>📺 Live Channels Over Time</h4>
                <div class="chart-wrapper">
                    <canvas id="channels-chart-${range}"></canvas>
                </div>
            </div>
        </div>
    `;
}

function renderHistoryStats(historyData, range) {
    if (!historyData || !historyData.summary) {
        return '<p class="empty-state">No historical data available for this period</p>';
    }
    
    const { summary, timeseries } = historyData;
    const current = summary.current || {};
    const averages = summary.averages || {};
    const peaks = summary.peaks || {};
    const lows = summary.lows || {};
    const change = summary.change || {};
    
    // Format percentage change
    const viewerChangePercent = change.viewer_percent || 0;
    const channelChangePercent = change.channel_percent || 0;
    const viewerChangeClass = viewerChangePercent >= 0 ? 'positive' : 'negative';
    const channelChangeClass = channelChangePercent >= 0 ? 'positive' : 'negative';
    const viewerChangeSymbol = viewerChangePercent >= 0 ? '+' : '';
    const channelChangeSymbol = channelChangePercent >= 0 ? '+' : '';
    
    // Get date range from timeseries
    const startDate = timeseries && timeseries.length > 0 ? new Date(timeseries[0].timestamp) : new Date();
    const endDate = timeseries && timeseries.length > 0 ? new Date(timeseries[timeseries.length - 1].timestamp) : new Date();
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Current Stats</h4>
                <p><strong>${(current.live_viewers || 0).toLocaleString()}</strong> viewers</p>
                <p><strong>${(current.live_channels || 0).toLocaleString()}</strong> channels</p>
                ${current.rank ? `<p>Rank <strong>#${current.rank}</strong></p>` : ''}
            </div>
            
            <div class="stat-card">
                <h4>Averages (${range})</h4>
                <p><strong>${(averages.avg_viewers || 0).toLocaleString()}</strong> avg viewers</p>
                <p><strong>${(averages.avg_channels || 0).toLocaleString()}</strong> avg channels</p>
            </div>
            
            <div class="stat-card">
                <h4>Peak Performance</h4>
                <p><strong>${(peaks.max_viewers || 0).toLocaleString()}</strong> peak viewers</p>
                <p><strong>${(peaks.max_channels || 0).toLocaleString()}</strong> peak channels</p>
            </div>
            
            <div class="stat-card">
                <h4>Growth (${range})</h4>
                <p class="${viewerChangeClass}">
                    ${viewerChangeSymbol}${(change.viewer_change || 0).toLocaleString()} viewers 
                    ${viewerChangePercent ? `<span style="font-size: 0.9em;">(${viewerChangeSymbol}${viewerChangePercent.toFixed(1)}%)</span>` : ''}
                </p>
                <p class="${channelChangeClass}">
                    ${channelChangeSymbol}${(change.channel_change || 0).toLocaleString()} channels
                    ${channelChangePercent ? `<span style="font-size: 0.9em;">(${channelChangeSymbol}${channelChangePercent.toFixed(1)}%)</span>` : ''}
                </p>
            </div>
        </div>
        <p style="margin-top: 1rem; font-size: 0.85em; color: #888; text-align: center;">
            Based on ${timeseries?.length || 0} data points from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}
        </p>
    `;
}

// Global chart instances
let chartInstances = {};

// Toggle between history ranges
window.switchHistoryRange = function(range) {
    // Update button states
    document.querySelectorAll('.charts-section .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
    });
    
    // Show/hide content
    document.querySelectorAll('.charts-section .history-content').forEach(content => {
        content.style.display = content.id === `history-content-${range}` ? 'block' : 'none';
    });
    
    // Initialize charts for the active range if not already done
    if (!chartInstances[`viewers-${range}`]) {
        initializeCharts(range);
    }
};

function initializeCharts(range) {
    const historyData = range === '1d' ? window.categoryHistory1d 
                      : range === '7d' ? window.categoryHistory7d 
                      : window.categoryHistory30d;
    
    if (!historyData || !historyData.timeseries || historyData.timeseries.length === 0) {
        return;
    }
    
    // Use timeseries from v2 API
    const timeseries = historyData.timeseries;
    const labels = timeseries.map(s => {
        const date = new Date(s.timestamp);
        if (range === '1d') {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (range === '7d') {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    });
    const viewersData = timeseries.map(s => s.live_viewers);
    const channelsData = timeseries.map(s => s.live_channels);
    
    // Viewers Chart
    const viewersCtx = document.getElementById(`viewers-chart-${range}`);
    if (viewersCtx) {
        chartInstances[`viewers-${range}`] = new Chart(viewersCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Viewers',
                    data: viewersData,
                    borderColor: '#00f3ff',
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00f3ff',
                    pointBorderColor: '#0a0a0f',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(19, 19, 26, 0.95)',
                        titleColor: '#00f3ff',
                        bodyColor: '#e0e0e0',
                        borderColor: '#00f3ff',
                        borderWidth: 2,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toLocaleString() + ' viewers';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#888',
                            font: {
                                family: "'Courier New', monospace"
                            },
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(0, 243, 255, 0.1)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#888',
                            font: {
                                family: "'Courier New', monospace"
                            },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(0, 243, 255, 0.05)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }
    
    // Channels Chart
    const channelsCtx = document.getElementById(`channels-chart-${range}`);
    if (channelsCtx) {
        chartInstances[`channels-${range}`] = new Chart(channelsCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Channels',
                    data: channelsData,
                    borderColor: '#00ff9f',
                    backgroundColor: 'rgba(0, 255, 159, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00ff9f',
                    pointBorderColor: '#0a0a0f',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(19, 19, 26, 0.95)',
                        titleColor: '#00ff9f',
                        bodyColor: '#e0e0e0',
                        borderColor: '#00ff9f',
                        borderWidth: 2,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toLocaleString() + ' channels';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#888',
                            font: {
                                family: "'Courier New', monospace"
                            },
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(0, 255, 159, 0.1)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#888',
                            font: {
                                family: "'Courier New', monospace"
                            },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(0, 255, 159, 0.05)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }
}

function renderCategoryPage(data, loading, content, categoryId, categoryName, historicalData = {}) {
    loading.style.display = 'none';
    content.style.display = 'block';
    
    // Store historical data globally for chart initialization
    window.categoryHistory1d = historicalData.history1d;
    window.categoryHistory7d = historicalData.history7d;
    window.categoryHistory30d = historicalData.history30d;
    
    // Replace {width}x{height} in box art URL
    const boxArtUrl = data.box_art_url.replace('{width}', '285').replace('{height}', '380');
    
    // Update SEO meta tags dynamically
    const catName = data.category_name || categoryName || 'Category';
    document.title = `${catName} - Twitch Stats & Analytics | gdb.gg`;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute('content', `View ${catName} Twitch statistics, live viewer counts, top streamers, and growth trends. Track ${catName} popularity on gdb.gg.`);
    }
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${catName} - Twitch Stats | gdb.gg`);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', `View ${catName} Twitch statistics, viewer counts, and top streamers.`);
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', boxArtUrl);
    
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', `${catName} - Twitch Stats | gdb.gg`);
    
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', `View ${catName} Twitch statistics and top streamers.`);
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute('content', boxArtUrl);
    
    // Prefer live stats from the current-v2 payload; fall back to history summary if needed
    const historyCurrent = historicalData?.history1d?.summary?.current || {};
    const currentBlock = data.current || {};
    const liveChannels = (typeof data.live_channels === 'number') ? data.live_channels
                        : (typeof currentBlock.live_channels === 'number') ? currentBlock.live_channels
                        : (typeof historyCurrent.live_channels === 'number') ? historyCurrent.live_channels
                        : 0;
    const liveViewers = (typeof data.live_viewers === 'number') ? data.live_viewers
                       : (typeof currentBlock.live_viewers === 'number') ? currentBlock.live_viewers
                       : (typeof historyCurrent.live_viewers === 'number') ? historyCurrent.live_viewers
                       : 0;
    const rank = (typeof data.rank === 'number') ? data.rank
               : (typeof currentBlock.rank === 'number') ? currentBlock.rank
               : (typeof historyCurrent.rank === 'number') ? historyCurrent.rank
               : undefined;
    
    content.innerHTML = `
        <div class="category-header">
            <img src="${boxArtUrl}" alt="${data.category_name}" class="category-box-art">
            <div class="category-info">
                <h2>${data.category_name}</h2>
                ${typeof rank === 'number' ? `<p class="category-rank">Rank #${rank}</p>` : ''}
                <div class="category-stats">
                    <div class="stat-item">
                        <span class="stat-value">${(liveChannels || 0).toLocaleString()}</span>
                        <span class="stat-label">Live Channels</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${(liveViewers || 0).toLocaleString()}</span>
                        <span class="stat-label">Viewers</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="category-actions" style="text-align:center; margin: 1rem 0 2rem;">
            <button class="btn-secondary" id="top-streamers-btn">Show Top Streamers</button>
        </div>
        <div id="top-streamers-panel" style="display:none;">
            <div id="top-streamers-list" class="leaderboard-table" style="margin-bottom:2rem;"></div>
        </div>
        
        ${renderCategoryHistory(historicalData)}
        
        <div class="category-metadata" style="text-align: center; margin: 2rem 0;">
            <button onclick="window.location.reload()" class="btn-secondary">🔄 Refresh Data</button>
        </div>
    `;
    
    // Initialize charts for the default range (7d) after DOM is ready
    setTimeout(() => {
        if (historicalData.history7d && historicalData.history7d.timeseries) {
            initializeCharts('7d');
        }
    }, 100);

    // Wire up Top Streamers button
    const btn = document.getElementById('top-streamers-btn');
    if (btn) {
        btn.addEventListener('click', () => toggleTopStreamers(categoryId));
    }
}

function renderCategoryPageWithFallback(data, loading, content, categoryId, categoryName) {
    loading.style.display = 'none';
    content.style.display = 'block';
    
    // Replace {width}x{height} in box art URL
    const boxArtUrl = data.box_art_url.replace('{width}', '285').replace('{height}', '380');
    
    content.innerHTML = `
        <div class="alert-notice" style="background: rgba(255, 0, 110, 0.2); border: 2px solid var(--neon-pink); padding: 1.5rem; margin-bottom: 2rem; text-align: center; clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
            <p style="color: var(--neon-pink); font-size: 1rem; font-weight: 900; margin-bottom: 0.5rem; letter-spacing: 2px;">⚠️ NEW CATEGORY</p>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">This category isn't tracked yet. Showing live data from Twitch. Historical data will be available after the next collection cycle.</p>
        </div>
        
        <div class="category-header">
            <img src="${boxArtUrl}" alt="${data.name}" class="category-box-art">
            <div class="category-info">
                <h2>${data.name}</h2>
                <div class="category-stats">
                    <div class="stat-item">
                        <span class="stat-value">${(data.live_channels || 0).toLocaleString()}</span>
                        <span class="stat-label">Live Channels</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${(data.live_viewers || 0).toLocaleString()}</span>
                        <span class="stat-label">Viewers</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="category-metadata" style="text-align: center; margin: 2rem 0;">
            <p style="color: var(--neon-cyan); margin-bottom: 1rem; font-weight: 900;">📊 Live Data from Twitch API</p>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">This category has been added to our tracking system. Check back soon for historical trends and charts!</p>
            <button onclick="window.location.reload()" class="btn-secondary">🔄 Refresh Data</button>
        </div>
    `;
}

// Toggle chart visibility
window.toggleChartVisibility = function() {
    const button = document.getElementById('chart-visibility-toggle');
    const chartsVisible = button.textContent.includes('Hide');
    
    // Get all chart grids
    const chartGrids = document.querySelectorAll('.charts-grid');
    
    chartGrids.forEach(grid => {
        if (chartsVisible) {
            grid.style.display = 'none';
            button.textContent = '📈 Show Charts';
        } else {
            grid.style.display = 'grid';
            button.textContent = '📉 Hide Charts';
        }
    });
    
    // If showing charts, make sure the current range's charts are initialized
    if (!chartsVisible) {
        const activeBtn = document.querySelector('.charts-section .toggle-btn.active');
        const range = activeBtn?.dataset?.range;
        if (range && !chartInstances[`viewers-${range}`]) {
            initializeCharts(range);
        }
    }
};

// Toggle and fetch top streamers for the category
window.toggleTopStreamers = async function(categoryId) {
    const panel = document.getElementById('top-streamers-panel');
    const list = document.getElementById('top-streamers-list');
    const btn = document.getElementById('top-streamers-btn');
    if (!panel || !list || !btn) return;

    const isHidden = panel.style.display === 'none' || panel.style.display === '';
    if (isHidden && !list.dataset.loaded) {
        // Load once
        try {
            btn.disabled = true;
            btn.textContent = 'Loading…';
            const res = await fetch(`https://twitch.gdb.gg/api/v2/categories/${categoryId}?max_pages=1&top=10`);
            if (!res.ok) throw new Error('Failed to load top streamers');
            const data = await res.json();
            const streams = data.streams || data.top || data.creators || data.top_streams || [];

            if (!Array.isArray(streams) || streams.length === 0) {
                list.innerHTML = '<p class="empty-state">No top streams available right now</p>';
            } else {
                // Render compact list
                list.innerHTML = `
                    <div class="table-header" style="display:grid;grid-template-columns:60px 1fr 160px 140px;gap:1rem;padding:0.75rem;border-bottom:2px solid var(--neon-cyan);margin-bottom:0.5rem;">
                        <div>#</div>
                        <div>Streamer</div>
                        <div>Game</div>
                        <div>Viewers</div>
                    </div>
                    ${streams.map((s, i) => {
                        const login = s.login || s.user_login || s.user?.login || '';
                        const name = s.display_name || s.user_name || s.user?.display_name || login;
                        const game = s.game_name || '';
                        const viewers = (s.viewer_count || 0).toLocaleString();
                        return `
                        <a href="/twitch/profile.html?username=${encodeURIComponent(login)}" class="table-row" style="display:grid;grid-template-columns:60px 1fr 160px 140px;gap:1rem;padding:0.75rem;border-bottom:1px solid rgba(0,243,255,0.2);text-decoration:none;color:inherit;">
                            <div>#${i+1}</div>
                            <div>${name}</div>
                            <div>${game || '-'}</div>
                            <div>👁️ ${viewers}</div>
                        </a>`;
                    }).join('')}
                `;
            }
            list.dataset.loaded = '1';
        } catch (e) {
            list.innerHTML = '<p class="error-text">Failed to load top streamers</p>';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Hide Top Streamers';
        }
    }

    // Toggle visibility and button label
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        btn.textContent = 'Hide Top Streamers';
    } else {
        panel.style.display = 'none';
        btn.textContent = 'Show Top Streamers';
    }
};
