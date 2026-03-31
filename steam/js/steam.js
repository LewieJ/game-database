/* ============================================
   Steam Tracker - Shared JavaScript Utilities
   gdb.gg
   ============================================ */

const API_BASE = 'https://steam.gdb.gg/steam/api';

/* ============================================
   Number & Price Formatting
   ============================================ */

/**
 * Format large numbers with commas
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    return num.toLocaleString();
}

/**
 * Format price in cents to locale-aware currency string
 * @param {number} cents - Price in cents
 * @param {string} currency - Currency code (USD, GBP, EUR, etc.)
 * @returns {string} Formatted price string
 */
function formatPrice(cents, currency = 'USD') {
    if (!cents || cents === 0) return 'Free';
    const amount = cents / 100;
    try {
        return new Intl.NumberFormat(navigator.language, {
            style: 'currency',
            currency: currency
        }).format(amount);
    } catch (e) {
        // Fallback if currency code is invalid
        return `$${amount.toFixed(2)}`;
    }
}

/**
 * Format percentage with optional decimal places
 * @param {number} value - The percentage value
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
function formatPercent(value, decimals = 1) {
    if (value == null || isNaN(value)) return '0%';
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format playtime from minutes to hours/minutes string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time string
 */
function formatPlaytime(minutes) {
    if (!minutes || minutes === 0) return '0h';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

/* ============================================
   Date & Time Formatting
   ============================================ */

/**
 * Format Unix timestamp to readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(navigator.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format Unix timestamp to relative time (e.g., "2 hours ago")
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const now = Date.now();
    const diff = now - (timestamp * 1000);
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    return formatDate(timestamp);
}

/* ============================================
   Warning Banner
   ============================================ */

/**
 * Dismiss the warning banner and save preference
 */
function dismissWarning() {
    const banner = document.querySelector('.warning-banner');
    if (banner) {
        banner.classList.add('hidden');
        localStorage.setItem('steam-warning-dismissed', 'true');
    }
}

/**
 * Check if warning should be shown on page load
 */
function checkWarningBanner() {
    const banner = document.querySelector('.warning-banner');
    if (banner && localStorage.getItem('steam-warning-dismissed') === 'true') {
        banner.classList.add('hidden');
    }
}

/* ============================================
   Modal Utilities
   ============================================ */

/**
 * Open a modal by ID
 * @param {string} modalId - The modal element ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close a modal by ID
 * @param {string} modalId - The modal element ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Pause any videos in the modal
        const videos = modal.querySelectorAll('video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }
}

/**
 * Initialize modal close handlers
 * - ESC key closes modal
 * - Clicking backdrop closes modal
 */
function initModals() {
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
    
    // Close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

/* ============================================
   API Helpers
   ============================================ */

/**
 * Fetch data from Steam API with error handling
 * @param {string} endpoint - API endpoint (without base URL)
 * @returns {Promise<Object>} API response data
 */
async function fetchSteamAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'API request failed');
        }
        return data.data;
    } catch (error) {
        console.error(`Steam API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Get URL parameter by name
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value or null
 */
function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/* ============================================
   Image Utilities
   ============================================ */

/**
 * Get Steam CDN URL for game header image
 * @param {string} appId - Steam App ID
 * @returns {string} Header image URL
 */
function getGameHeaderImage(appId) {
    return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
}

/**
 * Get Steam CDN URL for game capsule image
 * @param {string} appId - Steam App ID
 * @returns {string} Capsule image URL
 */
function getGameCapsuleImage(appId) {
    return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/capsule_616x353.jpg`;
}

/**
 * Handle image load error with fallback
 * @param {HTMLImageElement} img - Image element
 * @param {string} fallbackUrl - Fallback image URL
 */
function handleImageError(img, fallbackUrl) {
    img.onerror = null; // Prevent infinite loop
    img.src = fallbackUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215"><rect fill="%231b2838" width="460" height="215"/><text fill="%23666" font-family="sans-serif" font-size="20" x="50%" y="50%" text-anchor="middle">No Image</text></svg>';
}

/* ============================================
   DOM Utilities
   ============================================ */

/**
 * Create element with classes and optional content
 * @param {string} tag - HTML tag name
 * @param {string|string[]} classes - CSS class(es)
 * @param {string} content - Optional text content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, classes, content) {
    const el = document.createElement(tag);
    if (classes) {
        if (Array.isArray(classes)) {
            el.classList.add(...classes);
        } else {
            el.classList.add(classes);
        }
    }
    if (content) {
        el.textContent = content;
    }
    return el;
}

/**
 * Show loading state in a container
 * @param {HTMLElement|string} container - Container element or selector
 * @param {string} message - Loading message
 */
function showLoading(container, message = 'Loading...') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) {
        el.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p class="loading-text">${message}</p>
            </div>
        `;
    }
}

/**
 * Show error state in a container
 * @param {HTMLElement|string} container - Container element or selector
 * @param {string} message - Error message
 */
function showError(container, message = 'Something went wrong') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) {
        el.innerHTML = `
            <div class="error-state">
                <p>❌ ${message}</p>
            </div>
        `;
    }
}

/**
 * Show empty state in a container
 * @param {HTMLElement|string} container - Container element or selector
 * @param {string} message - Empty state message
 */
function showEmpty(container, message = 'No data found') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) {
        el.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
    }
}

/* ============================================
   Initialization
   ============================================ */

// Run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    checkWarningBanner();
    initModals();
});
