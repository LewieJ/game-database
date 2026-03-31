// Item Detail Page JavaScript

let item = null;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const slug = getItemSlug();
    
    if (!slug) {
        showError();
        return;
    }
    
    // Load item data
    await loadItem(slug);
});

// Get item slug from URL - supports clean URLs (/items/[slug]/) and query params
function getItemSlug() {
    // Try clean URL format first: /items/[slug]/
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'items') {
        return decodeURIComponent(pathParts[1]);
    }
    // Fallback to query params
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || params.get('id');
}

// Load item data
async function loadItem(slug) {
    try {
        const response = await MarathonAPI.getItemBySlug(slug);
        
        if (response?.data) {
            item = response.data;
            renderItem();
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error loading item:', error);
        showError();
    }
}

// Render item details
function renderItem() {
    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('itemDetail').style.display = 'block';
    
    // Update page title and SEO meta tags
    updateMetaTags();
    
    // Add structured data for rich search results
    addStructuredData();
    
    // Update breadcrumb
    updateBreadcrumb();
    
    // Image
    const iconUrl = MarathonAPI.getItemIconUrl(item.icon_path || item.slug || item.name);
    const imgEl = document.getElementById('itemImage');
    imgEl.src = iconUrl;
    imgEl.alt = item.name;
    imgEl.onerror = () => imgEl.style.display = 'none';
    
    // Name and description
    document.getElementById('itemName').textContent = item.name;
    document.getElementById('itemDescription').textContent = item.description || '';
    
    // Type badge
    const typeBadge = document.getElementById('typeBadge');
    typeBadge.textContent = (item.type || 'Unknown').toUpperCase();
    
    // Rarity badge
    const rarityBadge = document.getElementById('rarityBadge');
    if (item.rarity) {
        rarityBadge.textContent = item.rarity.toUpperCase();
        rarityBadge.className = `badge badge-rarity ${item.rarity.toLowerCase()}`;
        rarityBadge.style.display = 'inline-flex';
    } else {
        rarityBadge.style.display = 'none';
    }
    
    // Render properties
    renderProperties();
    
    // Render metadata (dates)
    renderMetadata();
    
    // Render patch history (if available)
    renderPatchHistory();
}

// Render item properties
function renderProperties() {
    const container = document.getElementById('propertiesContainer');
    
    const properties = [];
    
    // Add basic properties
    if (item.value !== null && item.value !== undefined) {
        properties.push({ label: 'VALUE', value: `${item.value} Credits` });
    }
    
    if (item.stack_size !== null && item.stack_size !== undefined) {
        properties.push({ label: 'STACK SIZE', value: item.stack_size });
    }
    
    if (item.weight !== null && item.weight !== undefined) {
        properties.push({ label: 'WEIGHT', value: item.weight });
    }
    
    if (item.slot_type) {
        properties.push({ label: 'SLOT', value: item.slot_type.toUpperCase() });
    }
    
    // Add metadata fields if present
    const metadata = item.metadata || {};
    Object.entries(metadata).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            properties.push({ 
                label: formatLabel(key), 
                value: value 
            });
        }
    });
    
    if (properties.length === 0) {
        container.innerHTML = '<p class="no-data">No additional properties</p>';
        return;
    }
    
    container.innerHTML = properties.map(prop => `
        <div class="stat-bar-row stat-no-bar">
            <div class="stat-bar-label">${prop.label}</div>
            <div class="stat-bar-value">${escapeHtml(String(prop.value))}</div>
        </div>
    `).join('');
}

// Render metadata
function renderMetadata() {
    const addedEl = document.getElementById('addedDate');
    const updatedEl = document.getElementById('updatedDate');
    
    // Format dates
    if (item.created_at) {
        addedEl.textContent = formatDate(item.created_at);
    }
    
    if (item.updated_at) {
        updatedEl.textContent = formatDate(item.updated_at);
    }
}

// Render patch history
function renderPatchHistory() {
    const section = document.getElementById('patchHistory');
    const list = document.getElementById('patchList');
    
    // Check if item has patch history data
    const patchNotes = item.patch_notes || item.changes || [];
    
    if (patchNotes.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    list.innerHTML = patchNotes.map(patch => `
        <div class="patch-item">
            <div class="patch-header">
                <span class="patch-version">${escapeHtml(patch.version || patch.season || '')}</span>
                <span class="patch-date">${patch.date ? formatDate(patch.date) : ''}</span>
            </div>
            <div class="patch-changes">
                ${(patch.changes || [patch.description]).map(change => `
                    <div class="patch-change ${getChangeType(change)}">
                        <span class="change-icon">${getChangeIcon(change)}</span>
                        <span class="change-text">${escapeHtml(change)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Format label from key name
function formatLabel(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toUpperCase();
}

// Get change type (buff/nerf/change)
function getChangeType(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('increase') || lower.includes('buff') || lower.includes('improved') || lower.includes('added')) {
        return 'buff';
    }
    if (lower.includes('decrease') || lower.includes('nerf') || lower.includes('reduced') || lower.includes('removed')) {
        return 'nerf';
    }
    return 'change';
}

// Get change icon
function getChangeIcon(text) {
    const type = getChangeType(text);
    if (type === 'buff') return '↑';
    if (type === 'nerf') return '↓';
    return '•';
}

// Format date
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

// Show error state
function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update meta tags for SEO
function updateMetaTags() {
    const title = `${item.name} - ${item.type || 'Item'} | MarathonDB`;
    const itemDescBase = item.description ? `${item.description} ` : '';
    const typeLower = (item.type || 'item').toLowerCase();
    const description = `${itemDescBase}${item.name} is a Marathon ${typeLower}. Find detailed stats, properties, and usage info on MarathonDB.`;
    const pageUrl = `https://marathondb.gg/items/${item.slug}/`;
    const imageUrl = MarathonAPI.getItemIconUrl(item.icon_path || item.slug || item.name);
    
    document.title = title;
    
    // Update meta tags
    updateMetaTag('description', description);
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', pageUrl);
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', imageUrl);
    
    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.href = pageUrl;
    }
}

// Update or create meta tag
function updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (meta) {
        meta.setAttribute('content', content);
    }
}

// Update breadcrumb with item name
function updateBreadcrumb() {
    const breadcrumbName = document.getElementById('breadcrumbName');
    if (breadcrumbName && item) {
        breadcrumbName.textContent = item.name;
    }
}

// Add structured data for SEO (schema.org JSON-LD)
function addStructuredData() {
    if (!item) return;
    
    const imageUrl = MarathonAPI.getItemIconUrl(item.icon_path || item.slug || item.name);
    
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": item.name,
        "description": item.description || `${item.name} item details for Marathon`,
        "image": imageUrl,
        "brand": {
            "@type": "Brand",
            "name": "Marathon"
        },
        "category": item.type || "Item"
    };
    
    // Add rating data if available
    if (item.average_rating && item.rating_count) {
        structuredData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": item.average_rating,
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": item.rating_count
        };
    }
    
    // Add additional properties
    const additionalProperties = [];
    
    if (item.rarity) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Rarity",
            "value": item.rarity
        });
    }
    
    if (item.value !== null && item.value !== undefined) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Value",
            "value": `${item.value} Credits`
        });
    }
    
    if (item.stack_size !== null && item.stack_size !== undefined) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Stack Size",
            "value": item.stack_size.toString()
        });
    }
    
    if (additionalProperties.length > 0) {
        structuredData.additionalProperty = additionalProperties;
    }
    
    // Inject or update the script tag
    let script = document.getElementById('structured-data');
    if (!script) {
        script = document.createElement('script');
        script.id = 'structured-data';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
}
