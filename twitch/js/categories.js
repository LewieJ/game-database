// Top Categories Page

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

let currentPage = 0;
const itemsPerPage = 50;
let allCategoriesData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
});

async function loadCategories() {
    try {
        // Using /current endpoint which includes live_viewers and live_channels
        // Note: This is cached data, so it may have fewer categories than the live endpoint
        const response = await fetchWithRetry('https://twitch.gdb.gg/api/v2/top-categories/current?limit=250');
        const data = await response.json();
        
        allCategoriesData = data.categories || [];
        
        document.getElementById('loading-spinner').style.display = 'none';
        
        if (allCategoriesData.length === 0) {
            document.getElementById('categories-content').innerHTML = '<p class="empty-state">No categories found</p>';
            return;
        }
        
        renderCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('loading-spinner').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p class="error-text">Unable to load categories. The API may be temporarily unavailable.</p>
                <button class="btn-primary" onclick="location.reload()" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

function renderCategories() {
    const content = document.getElementById('categories-content');
    const displayCategories = allCategoriesData.slice(0, (currentPage + 1) * itemsPerPage);
    
    content.innerHTML = `
        <div class="categories-grid">
            ${displayCategories.map((cat, index) => `
                <a href="/twitch/category.html?id=${cat.id}&name=${encodeURIComponent(cat.name)}" 
                   class="category-card">
                    <div class="category-card-image">
                        <img src="${(cat.box_art_url || '').replace('{width}', '144').replace('{height}', '192')}" 
                             alt="${cat.name || 'Category'}"
                             onerror="this.style.display='none'">
                    </div>
                    <div class="category-card-name">${cat.name || 'Unknown'}</div>
                    <div class="category-card-stats">
                        <span class="category-viewers">👁️ ${(cat.live_viewers || 0).toLocaleString()}</span>
                        <span class="category-channels">📺 ${(cat.live_channels || 0).toLocaleString()}</span>
                    </div>
                </a>
            `).join('')}
        </div>
        ${displayCategories.length < allCategoriesData.length ? `
            <div style="text-align: center; margin-top: 3rem; margin-bottom: 2rem;">
                <button class="btn-primary" id="load-more-btn">Load More (${allCategoriesData.length - displayCategories.length} remaining)</button>
            </div>
        ` : ''}
    `;
    
    // Re-attach event listener to the new button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreCategories);
    }
}

function loadMoreCategories() {
    currentPage++;
    renderCategories();
    // Smooth scroll to the newly loaded content
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}
