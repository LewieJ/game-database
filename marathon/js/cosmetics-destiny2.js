/**
 * Destiny 2 Cross-Promo Items Page
 * Displays the 3 D2 exotic items from Marathon pre-order
 */

const API_BASE = 'https://helpbot.marathondb.gg';

// Store item data for lightbox access
let itemsData = [];

/**
 * Initialize the page
 */
async function init() {
    await loadD2Items();
    initCountdown();
    initLightbox();
}

/**
 * Initialize countdown timer
 */
function initCountdown() {
    // TODO: Fetch from API when available
    // For now, use a placeholder date (game release or pre-order end)
    const endDate = null; // Will be populated from API
    
    updateCountdown(endDate);
}

/**
 * Update countdown display
 */
function updateCountdown(endDate) {
    const container = document.getElementById('d2Countdown');
    if (!container) return;

    if (!endDate) {
        container.innerHTML = `
            <span class="countdown-date">GAME LAUNCH</span>
        `;
        return;
    }

    const end = new Date(endDate);
    
    function update() {
        const now = new Date();
        const diff = end - now;

        if (diff <= 0) {
            container.innerHTML = `<span class="countdown-expired">OFFER EXPIRED</span>`;
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        container.innerHTML = `
            <div class="countdown-unit">
                <span class="countdown-value">${String(days).padStart(2, '0')}</span>
                <span class="countdown-label">DAYS</span>
            </div>
            <span class="countdown-separator">:</span>
            <div class="countdown-unit">
                <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
                <span class="countdown-label">HRS</span>
            </div>
            <span class="countdown-separator">:</span>
            <div class="countdown-unit">
                <span class="countdown-value">${String(minutes).padStart(2, '0')}</span>
                <span class="countdown-label">MIN</span>
            </div>
            <span class="countdown-separator">:</span>
            <div class="countdown-unit">
                <span class="countdown-value">${String(seconds).padStart(2, '0')}</span>
                <span class="countdown-label">SEC</span>
            </div>
        `;
    }

    update();
    setInterval(update, 1000);
}

/**
 * Load Destiny 2 items from API
 */
async function loadD2Items() {
    const container = document.getElementById('d2ItemsContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/api/cosmetics/destiny2`);
        const result = await response.json();

        if (result.success && result.data) {
            itemsData = result.data.map(item => ({
                ...item,
                name: item.name
            })); // Store for lightbox
            renderD2Items(itemsData, container);
            
            // Check if API provides availability end date
            if (itemsData[0]?.available_until) {
                updateCountdown(itemsData[0].available_until);
            }
        } else {
            showError(container, 'Failed to load items');
        }
    } catch (error) {
        console.error('Failed to load D2 items:', error);
        showError(container, 'Failed to connect to API');
    }
}

/**
 * Get optimized image path (w400 WebP for initial load)
 */
function getOptimizedImagePath(iconPath) {
    // Convert /assets/cosmetics/destiny2/item.png to w400 webp version
    const basePath = iconPath.replace(/\.png$/, '');
    return `${basePath}-400.webp`;
}

/**
 * Get full resolution image path (WebP with PNG fallback)
 */
function getFullImagePath(iconPath) {
    return iconPath.replace(/\.png$/, '.webp');
}

/**
 * Build URL handling both full URLs and relative paths
 */
function buildUrl(path) {
    return path ? (path.startsWith('http') ? path : `${API_BASE}${path}`) : '';
}

/**
 * Render the D2 items as feature cards
 */
function renderD2Items(items, container) {
    container.innerHTML = items.map((item, index) => `
        <article class="d2-item-card" data-type="${item.d2_item_type}" data-index="${index}">
            <div class="d2-item-image" onclick="openLightbox(${index})" role="button" tabindex="0" aria-label="View full size image of ${item.name}">
                <picture>
                    <source srcset="${buildUrl(getOptimizedImagePath(item.icon_path))}" type="image/webp">
                    <img src="${buildUrl(item.icon_path.replace('.png', '-400.png'))}" 
                         alt="${item.name}"
                         loading="lazy"
                         onerror="this.src='${buildUrl(item.icon_path)}'">
                </picture>
                <span class="d2-item-type-badge">${formatD2ItemType(item.d2_item_type)}</span>
                <span class="d2-zoom-hint">[+] CLICK TO EXPAND</span>
            </div>
            <div class="d2-item-content">
                <div class="d2-item-header">
                    <h2 class="d2-item-name">${item.name}</h2>
                    <span class="d2-rarity-badge exotic">EXOTIC</span>
                </div>
                <p class="d2-item-description">${item.description}</p>
                <p class="d2-item-flavor">"${item.flavor_text}"</p>
                
                <div class="d2-item-lore">
                    <button class="d2-lore-toggle" onclick="toggleLore(this)">
                        <span>[+] READ LORE</span>
                    </button>
                    <div class="d2-lore-content">
                        <pre>${formatLore(item.lore)}</pre>
                    </div>
                </div>

                <div class="d2-item-footer">
                    <span class="d2-source">${item.source_detail}</span>
                </div>
            </div>
        </article>
    `).join('');
}

/**
 * Format D2 item type for display
 */
function formatD2ItemType(type) {
    const types = {
        'ghost_shell': 'Ghost Shell',
        'ship': 'Ship',
        'sparrow': 'Sparrow',
        'emblem': 'Emblem',
        'shader': 'Shader',
        'ornament': 'Ornament'
    };
    return types[type] || type;
}

/**
 * Format lore text (handle \r\n)
 */
function formatLore(lore) {
    if (!lore) return '';
    return lore
        .replace(/\\r\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/>> /g, '');
}

/**
 * Toggle lore accordion
 */
function toggleLore(button) {
    const loreSection = button.closest('.d2-item-lore');
    const isExpanding = !loreSection.classList.contains('expanded');
    loreSection.classList.toggle('expanded');
    
    // Update button text
    const span = button.querySelector('span');
    span.textContent = isExpanding ? '[-] HIDE LORE' : '[+] READ LORE';
}

// Make toggleLore available globally
window.toggleLore = toggleLore;

/**
 * Initialize lightbox modal
 */
function initLightbox() {
    // Create lightbox HTML if not exists
    if (document.getElementById('d2Lightbox')) return;
    
    const lightbox = document.createElement('div');
    lightbox.id = 'd2Lightbox';
    lightbox.className = 'd2-lightbox';
    lightbox.innerHTML = `
        <div class="d2-lightbox-backdrop" onclick="closeLightbox()"></div>
        <div class="d2-lightbox-content">
            <button class="d2-lightbox-close" onclick="closeLightbox()" aria-label="Close">[×] CLOSE</button>
            <div class="d2-lightbox-image-container">
                <div class="d2-lightbox-loading">
                    <div class="loading-spinner"></div>
                    <p>LOADING HIGH-RES IMAGE...</p>
                </div>
                <picture class="d2-lightbox-picture">
                    <source id="lightboxWebp" type="image/webp">
                    <img id="lightboxImg" alt="" loading="eager">
                </picture>
            </div>
            <div class="d2-lightbox-info">
                <h3 id="lightboxTitle"></h3>
                <p id="lightboxType"></p>
            </div>
            <div class="d2-lightbox-nav">
                <button class="d2-lightbox-prev" onclick="navigateLightbox(-1)">[←] PREV</button>
                <button class="d2-lightbox-next" onclick="navigateLightbox(1)">NEXT [→]</button>
            </div>
        </div>
    `;
    document.body.appendChild(lightbox);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });
}

let currentLightboxIndex = 0;

/**
 * Open lightbox with high-res image
 */
function openLightbox(index) {
    const lightbox = document.getElementById('d2Lightbox');
    if (!lightbox || !itemsData[index]) return;
    
    currentLightboxIndex = index;
    const item = itemsData[index];
    
    // Show loading state
    lightbox.classList.add('open', 'loading');
    document.body.style.overflow = 'hidden';
    
    // Update info
    document.getElementById('lightboxTitle').textContent = item.name;
    document.getElementById('lightboxType').textContent = formatD2ItemType(item.d2_item_type).toUpperCase() + ' • EXOTIC';
    
    // Get full-res paths
    const fullWebp = buildUrl(getFullImagePath(item.icon_path));
    const fullPng = buildUrl(item.icon_path);
    
    // Lazy load high-res image
    const img = document.getElementById('lightboxImg');
    const webpSource = document.getElementById('lightboxWebp');
    
    img.onload = () => {
        lightbox.classList.remove('loading');
    };
    
    img.onerror = () => {
        // Fallback to PNG if WebP fails
        webpSource.srcset = '';
        img.src = fullPng;
    };
    
    webpSource.srcset = fullWebp;
    img.src = fullPng;
    img.alt = item.name;
}

/**
 * Close lightbox
 */
function closeLightbox() {
    const lightbox = document.getElementById('d2Lightbox');
    if (!lightbox) return;
    
    lightbox.classList.remove('open', 'loading');
    document.body.style.overflow = '';
    
    // Clear image src to stop loading
    document.getElementById('lightboxImg').src = '';
    document.getElementById('lightboxWebp').srcset = '';
}

/**
 * Navigate between items in lightbox
 */
function navigateLightbox(direction) {
    const newIndex = currentLightboxIndex + direction;
    if (newIndex >= 0 && newIndex < itemsData.length) {
        openLightbox(newIndex);
    }
}

// Make lightbox functions available globally
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateLightbox = navigateLightbox;

/**
 * Show error state
 */
function showError(container, message) {
    container.innerHTML = `
        <div class="error-state">
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        </div>
    `;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
