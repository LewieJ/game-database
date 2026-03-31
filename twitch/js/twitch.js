// Twitch page functionality

// Utility function for API calls with retry logic
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            // If we get a non-ok response, throw to trigger retry
            if (i === retries - 1) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Search functionality (only if elements exist on the page)
    const searchInput = document.getElementById('creator-search');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    const searchType = document.getElementById('search-type');

    if (searchInput && searchBtn && searchResults && searchType) {
        // Update placeholder based on search type
        searchType.addEventListener('change', () => {
            if (searchType.value === 'creators') {
                searchInput.placeholder = 'SEARCH FOR A CREATOR...';
            } else {
                searchInput.placeholder = 'SEARCH FOR A CATEGORY...';
            }
            // Clear results when switching types
            searchResults.innerHTML = '';
            searchInput.value = '';
        });

        // Handle search with discovery API
        const performSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) {
                searchResults.innerHTML = '';
                return;
            }

            const isCreatorSearch = searchType.value === 'creators';

            try {
                searchResults.innerHTML = '<p class="loading-text">Searching...</p>';
                
                const endpoint = isCreatorSearch 
                    ? `https://twitch.gdb.gg/api/v2/creators/search?query=${encodeURIComponent(query)}&limit=5`
                    : `https://twitch.gdb.gg/api/v2/search/categories?query=${encodeURIComponent(query)}`;
                
                const response = await fetch(endpoint);
                
                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const data = await response.json();
                
                if (isCreatorSearch) {
                    if (data.creators && data.creators.length > 0) {
                        searchResults.innerHTML = `
                            <div class="search-results-header">
                                <h4>Found ${data.total_results} creator${data.total_results !== 1 ? 's' : ''}</h4>
                            </div>
                            <div class="search-results-grid">
                                ${data.creators.map(creator => createSearchResultCard(creator)).join('')}
                            </div>
                        `;
                    } else {
                        searchResults.innerHTML = '<p class="empty-state">No creators found for "' + query + '"</p>';
                    }
                } else {
                    // Category search
                    if (data.categories && data.categories.length > 0) {
                        searchResults.innerHTML = `
                            <div class="search-results-header">
                                <h4>Found ${data.total_results} categor${data.total_results !== 1 ? 'ies' : 'y'}</h4>
                            </div>
                            <div class="search-results-grid">
                                ${data.categories.map(category => createCategorySearchResultCard(category)).join('')}
                            </div>
                        `;
                    } else {
                        searchResults.innerHTML = '<p class="empty-state">No categories found for "' + query + '"</p>';
                    }
                }
            } catch (error) {
                const searchTypeText = isCreatorSearch ? 'creators' : 'categories';
                searchResults.innerHTML = `<p class="error-text">Error searching ${searchTypeText}. Please try again.</p>`;
            }
        };

        searchBtn.addEventListener('click', performSearch);
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Clear results when input is cleared
        searchInput.addEventListener('input', (e) => {
            if (!e.target.value.trim()) {
                searchResults.innerHTML = '';
            }
        });
    }

    // Load top streams
    loadTopStreams();

    // Load top categories
    loadTopCategories();

    // Load most followed creators
    loadMostFollowed();
});

function createSearchResultCard(creator) {
    const avatarUrl = creator.profile_image_url || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png';
    const userLogin = creator.user_login || creator.login || '';
    const displayName = creator.display_name || userLogin;
    const followerCount = (creator.follower_count || 0).toLocaleString();
    const description = creator.description || '';
    const gameName = creator.game_name || '';
    const isLive = creator.is_live || false;
    
    return `
        <a href="/twitch/profile.html?username=${encodeURIComponent(userLogin)}" class="search-result-card">
            <div class="search-result-avatar">
                <img src="${avatarUrl.replace('300x300', '70x70')}" 
                     alt="${displayName}"
                     onerror="this.src='https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'">
                ${isLive ? '<span class="live-badge">🔴 LIVE</span>' : ''}
            </div>
            <div class="search-result-info">
                <h4>${displayName}</h4>
                <p class="search-result-followers">👥 ${followerCount} followers</p>
                ${gameName ? `<p class="search-result-game">🎮 ${gameName}</p>` : ''}
                ${description && description.length > 0 ? `<p class="search-result-desc">${description.substring(0, 80)}${description.length > 80 ? '...' : ''}</p>` : ''}
            </div>
        </a>
    `;
}

function createCategorySearchResultCard(category) {
    const boxArtUrl = category.box_art_url.replace('52x72', '144x192');
    const categoryName = category.name;
    const categoryId = category.id;
    
    return `
        <a href="/twitch/category.html?id=${encodeURIComponent(categoryId)}&name=${encodeURIComponent(categoryName)}" class="search-result-card category-result-card">
            <div class="search-result-avatar category-avatar">
                <img src="${boxArtUrl}" 
                     alt="${categoryName}"
                     onerror="this.src='https://static-cdn.jtvnw.net/ttv-static/404_boxart-144x192.jpg'">
            </div>
            <div class="search-result-info">
                <h4>${categoryName}</h4>
                <p class="search-result-game">🎮 Category</p>
            </div>
        </a>
    `;
}

async function loadTopStreams() {
    const container = document.getElementById('top-streams');
    
    try {
        container.innerHTML = '<p class="loading-text">Loading top streams...</p>';
        
        // Load only 10 creators for preview with retry logic
        const response = await fetchWithRetry('https://twitch.gdb.gg/api/v2/creators/live?limit=10');
        const data = await response.json();
        
        // Update to use 'creators' array from new cached endpoint
        if (data.creators && data.creators.length > 0) {
            container.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'streams-grid-horizontal';
            
            data.creators.forEach(stream => {
                const streamCard = createStreamCard(stream);
                grid.appendChild(streamCard);
            });
            
            container.appendChild(grid);
            
            // Add "Show More" button to header
            const showMoreDiv = document.getElementById('streams-show-more');
            if (showMoreDiv) {
                showMoreDiv.innerHTML = '<a href="/twitch/leaderboards.html" class="btn-primary">Show More</a>';
            }
        } else {
            container.innerHTML = '<p class="empty-state">No streams available</p>';
        }
    } catch (error) {
        console.error('Error loading streams:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p class="error-text">Unable to load streams. The API may be temporarily unavailable.</p>
                <button class="btn-primary" onclick="loadTopStreams()" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

function createStreamCard(stream) {
    const card = document.createElement('a');
    card.href = `/twitch/profile.html?username=${stream.login}`;
    card.className = 'stream-card';
    
    // Calculate live duration
    const startTime = new Date(stream.started_at);
    const now = new Date();
    const durationMs = now - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const liveDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    // Use profile_image_url from API if available, otherwise fallback to default
    const profileImageUrl = stream.profile_image_url || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png';
    
    card.innerHTML = `
        <div class="stream-card-avatar">
            <img src="${profileImageUrl}" alt="${stream.display_name}" onerror="this.src='https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'">
        </div>
        <div class="stream-card-info">
            <div class="stream-card-name">${stream.display_name}</div>
            <div class="stream-card-game">${stream.game_name}</div>
            <div class="stream-card-stats">
                <span class="viewer-count">👁️ ${stream.viewer_count.toLocaleString()}</span>
                <span class="live-duration">⏱️ ${liveDuration}</span>
            </div>
        </div>
    `;
    
    return card;
}

async function loadTopCategories(limit = 5) {
    const container = document.getElementById('top-categories');
    const showMoreContainer = document.getElementById('categories-show-more');
    const showMoreBtn = document.getElementById('show-more-btn');
    
    try {
        container.innerHTML = '<p class="loading-text">Loading top categories...</p>';
        
        // Use cached top-categories/current endpoint with retry
        const response = await fetchWithRetry(`https://twitch.gdb.gg/api/v2/top-categories/current?limit=${limit}`);
        const data = await response.json();
        renderCategories(data, container, showMoreContainer, showMoreBtn, limit);
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p class="error-text">Unable to load categories. The API may be temporarily unavailable.</p>
                <button class="btn-primary" onclick="loadTopCategories(${limit})" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

function renderCategories(data, container, showMoreContainer, showMoreBtn, limit) {
    if (data.categories && data.categories.length > 0) {
        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'categories-grid';
        
        data.categories.forEach(category => {
            const categoryCard = createCategoryCard(category);
            grid.appendChild(categoryCard);
        });
        
        container.appendChild(grid);
        
        // Show "Show More" button if we're at 5 items
        if (limit === 5) {
            showMoreContainer.style.display = 'block';
            showMoreBtn.onclick = () => {
                loadTopCategories(10);
                showMoreContainer.style.display = 'none';
            };
        } else {
            showMoreContainer.style.display = 'none';
        }
    } else {
        container.innerHTML = '<p>No categories available</p>';
    }
}

function createCategoryCard(category) {
    const card = document.createElement('a');
    card.href = `/twitch/category.html?id=${category.id}&name=${encodeURIComponent(category.name)}`;
    card.className = 'category-card';
    
    // Replace {width}x{height} with actual dimensions
    const boxArtUrl = category.box_art_url.replace('{width}', '144').replace('{height}', '192');
    
    // Handle both cached endpoint (has live_viewers/live_channels) and live endpoint (doesn't)
    const hasStats = category.live_viewers !== undefined && category.live_channels !== undefined;
    
    card.innerHTML = `
        <div class="category-card-image">
            <img src="${boxArtUrl}" alt="${category.name}">
        </div>
        <div class="category-card-name">${category.name}</div>
        ${hasStats ? `
        <div class="category-card-stats">
            <span class="category-viewers">👁️ ${category.live_viewers.toLocaleString()}</span>
            <span class="category-channels">📺 ${category.live_channels.toLocaleString()}</span>
        </div>
        ` : ''}
    `;
    
    return card;
}

async function loadMostFollowed() {
    const container = document.getElementById('most-followed');
    
    try {
        container.innerHTML = '<p class="loading-text">Loading most followed creators...</p>';
        
        const response = await fetch('https://twitch.gdb.gg/api/v2/creators/top-followed?limit=10');
        
        if (!response.ok) {
            throw new Error('Failed to load most followed creators');
        }

        const data = await response.json();
        
        if (data.creators && data.creators.length > 0) {
            container.innerHTML = '';
            const grid = document.createElement('div');
            grid.className = 'streams-grid';
            
            data.creators.forEach(creator => {
                const creatorCard = createFollowedCreatorCard(creator);
                grid.appendChild(creatorCard);
            });
            
            container.appendChild(grid);
            
            // Add "Show More" button to header
            const showMoreDiv = document.getElementById('followed-show-more');
            if (showMoreDiv) {
                showMoreDiv.innerHTML = '<a href="/twitch/leaderboards.html" class="btn-primary">Show More</a>';
            }
        } else {
            container.innerHTML = '<p class="empty-state">No data available</p>';
        }
    } catch (error) {
        console.error('Error loading most followed:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p class="error-text">Unable to load most followed creators. The API may be temporarily unavailable.</p>
                <button class="btn-primary" onclick="loadMostFollowed()" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

// Removed enrichCreatorsWithLiveStatus function - no longer needed since /top-followed returns is_live

function createFollowedCreatorCard(creator) {
    const card = document.createElement('a');
    card.href = `/twitch/profile.html?username=${encodeURIComponent(creator.login || creator.user_login)}`;
    card.className = 'stream-card';
    
    // Use profile_image_url from API (now always provided by backend)
    const profileImageUrl = creator.profile_image_url || 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png';
    
    card.innerHTML = `
        <div class="stream-card-avatar">
            <img src="${profileImageUrl}" alt="${creator.display_name}" onerror="this.src='https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'">
        </div>
        <div class="stream-card-info">
            <div class="stream-card-name">${creator.display_name}</div>
            <div class="stream-card-game">${creator.follower_count.toLocaleString()} followers</div>
            ${creator.is_live ? '<div class="stream-card-stats"><span class="live-indicator" style="position: static;">LIVE</span></div>' : ''}
        </div>
    `;
    
    return card;
}
