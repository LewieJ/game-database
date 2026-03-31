// Twitch Statistics Page JavaScript

const TWITCH_API_BASE = 'https://twitch.gdb.gg/api/v2/categories/407314011';

let currentRange = '1d';
let historyData = null;
let twitchChart = null;
let showViewers = true;
let showChannels = true;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentStats();
    loadHistoryData(currentRange);
    setupEventListeners();
    
    // Auto-refresh every 60 seconds
    setInterval(loadCurrentStats, 60000);
});

// Setup event listeners
function setupEventListeners() {
    // Range selector
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentRange = this.dataset.range;
            loadHistoryData(currentRange);
            updateRangeLabel();
        });
    });
    
    // Chart toggles
    document.querySelectorAll('.chart-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            this.classList.toggle('active');
            if (this.dataset.series === 'viewers') {
                showViewers = this.classList.contains('active');
            } else {
                showChannels = this.classList.contains('active');
            }
            updateChartVisibility();
        });
    });
    
    // Streamers accordion
    document.getElementById('streamersToggle')?.addEventListener('click', function() {
        document.getElementById('streamersCard').classList.toggle('open');
    });
}

// Load current stats
async function loadCurrentStats() {
    try {
        const response = await fetch(`${TWITCH_API_BASE}/current-v2`);
        const data = await response.json();
        
        if (data) {
            updateElement('liveViewers', formatNumber(data.live_viewers || 0));
            updateElement('liveChannels', formatNumber(data.live_channels || 0));
            updateElement('categoryRank', data.rank ? `#${data.rank}` : '--');
            
            if (data.snapshot_at) {
                const time = new Date(data.snapshot_at);
                updateElement('lastUpdated', time.toLocaleTimeString('en-GB'));
            }
        }
    } catch (error) {
        console.error('Error loading current stats:', error);
    }
}

// Load history data
async function loadHistoryData(range) {
    try {
        const response = await fetch(`${TWITCH_API_BASE}/history-v2?range=${range}`);
        const data = await response.json();
        
        if (data) {
            historyData = data;
            updateSummaryStats(data.summary);
            updateChart(data.timeseries);
            updateChartDates(data.timeseries);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Update summary statistics
function updateSummaryStats(summary) {
    if (!summary) return;
    
    updateElement('peakViewers', formatNumber(summary.peaks?.max_viewers || 0));
    updateElement('avgViewers', formatNumber(summary.averages?.avg_viewers || 0));
    updateElement('peakChannels', formatNumber(summary.peaks?.max_channels || 0));
    
    const change = summary.change?.viewer_change || 0;
    const changeEl = document.getElementById('viewerChange');
    if (changeEl) {
        changeEl.textContent = change >= 0 ? `+${change}` : change;
        changeEl.classList.remove('positive', 'negative');
        changeEl.classList.add(change >= 0 ? 'positive' : 'negative');
    }
}

// Update or create chart
function updateChart(timeseries) {
    if (!timeseries || timeseries.length === 0) return;
    
    const ctx = document.getElementById('twitchChart');
    if (!ctx) return;
    
    const labels = timeseries.map(point => {
        const date = new Date(point.timestamp);
        if (currentRange === '1d') {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } else if (currentRange === '7d') {
            return date.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit' });
        } else {
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        }
    });
    
    const viewersData = timeseries.map(point => point.live_viewers || 0);
    const channelsData = timeseries.map(point => point.live_channels || 0);
    
    if (twitchChart) {
        twitchChart.data.labels = labels;
        twitchChart.data.datasets[0].data = viewersData;
        twitchChart.data.datasets[1].data = channelsData;
        twitchChart.update();
    } else {
        twitchChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Live Viewers',
                        data: viewersData,
                        borderColor: '#d4ff00',
                        backgroundColor: 'rgba(212, 255, 0, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: '#d4ff00'
                    },
                    {
                        label: 'Live Channels',
                        data: channelsData,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: '#00d4ff'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#0d0d0d',
                        borderColor: '#1a1a1a',
                        borderWidth: 1,
                        titleColor: '#fff',
                        bodyColor: '#888',
                        padding: 12,
                        displayColors: true,
                        boxPadding: 4
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#555',
                            maxTicksLimit: 8,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#555',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
}

// Update chart visibility based on toggles
function updateChartVisibility() {
    if (!twitchChart) return;
    twitchChart.data.datasets[0].hidden = !showViewers;
    twitchChart.data.datasets[1].hidden = !showChannels;
    twitchChart.update();
}

// Update chart date labels
function updateChartDates(timeseries) {
    if (!timeseries || timeseries.length === 0) return;
    
    const startDate = new Date(timeseries[0].timestamp);
    const endDate = new Date(timeseries[timeseries.length - 1].timestamp);
    
    updateElement('chartDateStart', startDate.toLocaleDateString('en-GB'));
    updateElement('chartDateEnd', endDate.toLocaleDateString('en-GB'));
}

// Update range label
function updateRangeLabel() {
    const labels = {
        '1d': '24 Hours',
        '7d': '7 Days',
        '30d': '30 Days',
        'all': 'All Time'
    };
    updateElement('chartRangeLabel', labels[currentRange] || '24 Hours');
}

// Helper: Update element text
function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Helper: Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}