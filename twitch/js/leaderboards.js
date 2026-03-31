// Leaderboards Page with Real API Data

let currentStreamersPage = 0;
let currentFollowedPage = 0;
const itemsPerPage = 25;
let allStreamsData = [];
let allFollowedData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboards();
});

async function loadLeaderboards() {
    // Load top streamers and most followed using cached endpoints
    const [topStreamsData, topFollowedData] = await Promise.all([
        fetch('https://twitch.gdb.gg/api/v2/creators/live?limit=100').then(r => r.json()),
        fetch('https://twitch.gdb.gg/api/v2/creators/top-followed?limit=100').then(r => r.json())
    ]);

    // Store full datasets
    allStreamsData = topStreamsData.creators || topStreamsData.streams || [];
    allFollowedData = topFollowedData.creators || [];

    renderLeaderboards();
}

// Removed enrichCreatorsWithLiveStatus - /top-followed now includes is_live and profile_image_url

function renderLeaderboards() {
    const content = document.querySelector('.leaderboards-page');
    
    // Get paginated data
    const streamsList = allStreamsData.slice(0, (currentStreamersPage + 1) * itemsPerPage);
    const followedList = allFollowedData.slice(0, (currentFollowedPage + 1) * itemsPerPage);
    
    const totalViewers = streamsList.reduce((sum, s) => sum + (s.viewer_count || 0), 0);
    const avgViewers = streamsList.length > 0 ? Math.round(totalViewers / streamsList.length) : 0;
    
    const totalFollowers = followedList.reduce((sum, c) => sum + (c.follower_count || 0), 0);
    const avgFollowers = followedList.length > 0 ? Math.round(totalFollowers / followedList.length) : 0;
    
    content.innerHTML = `
        <div class="leaderboards-header">
            <h2>gdb.gg Leaderboards</h2>
            <p>Top streamers ranked by current performance</p>
        </div>

        <!-- Tab Navigation -->
        <div class="leaderboard-tabs">
            <button class="leaderboard-tab" data-tab="streamers">Top Streamers</button>
            <button class="leaderboard-tab active" data-tab="followed">Most Followed</button>
        </div>

        <!-- Streamers Leaderboard -->
        <div class="leaderboard-content" id="streamers">
            <div class="leaderboard-table">
                <div class="table-header">
                    <div class="col-rank">Rank</div>
                    <div class="col-streamer">Streamer</div>
                    <div class="col-game">Game</div>
                    <div class="col-viewers">Viewers</div>
                    <div class="col-uptime">Uptime</div>
                </div>
                ${streamsList.map((stream, index) => {
                    const startTime = new Date(stream.started_at);
                    const now = new Date();
                    const hours = Math.floor((now - startTime) / (1000 * 60 * 60));
                    const minutes = Math.floor(((now - startTime) % (1000 * 60 * 60)) / (1000 * 60));
                    const uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                    
                    // Support both old and new API formats
                    const userLogin = stream.login || stream.user_login || '';
                    const userId = stream.id || stream.user_id || '';
                    const userName = stream.display_name || stream.user_name || userLogin;
                    const gameName = stream.game_name || '';
                    const subLine = (stream.title || stream.stream_title || gameName || '').toString();
                    
                    return `
                    <a href="/twitch/profile.html?username=${encodeURIComponent(userLogin)}" class="table-row">
                        <div class="col-rank">
                            <span class="rank-badge rank-${index + 1 <= 3 ? index + 1 : 'default'}">#${index + 1}</span>
                        </div>
                        <div class="col-streamer">
                            <img 
                                 src="https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png"
                                 alt="${userName}"
                                 class="streamer-avatar"
                                 data-user-id="${userId}"
                                 data-user-login="${encodeURIComponent(userLogin)}">
                            <div class="streamer-info">
                                <span class="streamer-name">${userName}</span>
                                ${subLine ? `<span class=\"stream-title\">${subLine.substring(0, 50)}${subLine.length > 50 ? '...' : ''}</span>` : ''}
                            </div>
                        </div>
                        <div class="col-game">${gameName || '-'}</div>
                        <div class="col-viewers">
                            <span class="viewer-count-badge">👁️ ${(stream.viewer_count || 0).toLocaleString()}</span>
                        </div>
                        <div class="col-uptime">⏱️ ${uptime}</div>
                    </a>
                    `;
                }).join('')}
            </div>
            ${streamsList.length < allStreamsData.length ? `
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn-primary" onclick="loadMoreStreamers()">Load More (${allStreamsData.length - streamsList.length} remaining)</button>
                </div>
            ` : ''}
        </div>

        <!-- Most Followed Leaderboard -->
        <div class="leaderboard-content active" id="followed">
            <div class="leaderboard-table">
                <div class="table-header">
                    <div class="col-rank">Rank</div>
                    <div class="col-streamer">Creator</div>
                    <div class="col-game">Status</div>
                    <div class="col-viewers">Followers</div>
                </div>
                ${followedList.map((creator, index) => {
                    const createdDate = creator.created_at ? new Date(creator.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '-';
                    // Build robust identifier for profile link
                    const userParam = creator.login || creator.user_login || creator.username || creator.user_id || creator.id || (creator.display_name ? creator.display_name.toLowerCase() : '');
                    // Prefer API-provided profile image URL if available
                    const avatarUrl = creator.profile_image_url || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png';
                    
                    return `
                    <a href="/twitch/profile.html?username=${encodeURIComponent(userParam)}" class="table-row">
                        <div class="col-rank">
                            <span class="rank-badge rank-${index + 1 <= 3 ? index + 1 : 'default'}">#${index + 1}</span>
                        </div>
                        <div class="col-streamer">
                            <img src="${avatarUrl}" 
                                 alt="${creator.display_name}" 
                                 onerror="this.src='https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'"
                                 class="streamer-avatar">
                            <div class="streamer-info">
                                <span class="streamer-name">${creator.display_name}</span>
                            </div>
                        </div>
                        <div class="col-game">${creator.is_live ? '<span class="live-indicator" style="position: static; padding: 4px 8px;">🔴 LIVE</span>' : 'Offline'}</div>
                        <div class="col-viewers">
                            <span class="viewer-count-badge">👥 ${(creator.follower_count || 0).toLocaleString()}</span>
                        </div>
                        <div class="col-uptime">${createdDate}</div>
                    </a>
                    `;
                }).join('')}
            </div>
            ${followedList.length < allFollowedData.length ? `
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn-primary" onclick="loadMoreFollowed()">Load More (${allFollowedData.length - followedList.length} remaining)</button>
                </div>
            ` : ''}
        </div>
    `;

    setupLeaderboardTabs();
    // Progressive enhancement: fetch profile images for top streamers
    enrichStreamerAvatars(streamsList);
}

// Pagination functions
window.loadMoreStreamers = function() {
    currentStreamersPage++;
    renderLeaderboards();
};

window.loadMoreFollowed = function() {
    currentFollowedPage++;
    renderLeaderboards();
};

function setupLeaderboardTabs() {
    const tabs = document.querySelectorAll('.leaderboard-tab');
    const contents = document.querySelectorAll('.leaderboard-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

// Fetch profile images for streamers and replace defaults
async function enrichStreamerAvatars(streamsList) {
    const CONCURRENCY = 8;
    const queue = [...streamsList];

    async function worker() {
        while (queue.length) {
            const stream = queue.shift();
            const id = stream.id || stream.user_id;
            if (!id) continue;
            try {
                const res = await fetch(`https://twitch.gdb.gg/api/v2/creators/${id}/current`);
                if (!res.ok) continue;
                const data = await res.json();
                if (data && data.profile_image_url) {
                    const img = document.querySelector(`img.streamer-avatar[data-user-id="${id}"]`);
                    if (img) img.src = data.profile_image_url.replace('300x300', '70x70');
                }
            } catch (_) {
                // Ignore individual failures
            }
        }
    }

    await Promise.all(new Array(CONCURRENCY).fill(0).map(() => worker()));
}
