// Marathon API Client
// Provides API access for all database pages

// ─── Session Cache ────────────────────────────────────────────────
// Thin sessionStorage layer — caches GET responses with a 5-min TTL
// so repeat visits within the same tab session avoid redundant fetches.
const ApiCache = (function () {
    const TTL = 5 * 60 * 1000; // 5 minutes
    const PREFIX = 'mdb_';

    function _key(url) { return PREFIX + url; }

    return {
        get(url) {
            try {
                const raw = sessionStorage.getItem(_key(url));
                if (!raw) return null;
                const entry = JSON.parse(raw);
                if (Date.now() - entry.ts > TTL) {
                    sessionStorage.removeItem(_key(url));
                    return null;
                }
                return entry.data;
            } catch { return null; }
        },
        set(url, data) {
            try {
                sessionStorage.setItem(_key(url), JSON.stringify({ ts: Date.now(), data }));
            } catch { /* quota exceeded — silently skip */ }
        },
        clear() {
            try {
                Object.keys(sessionStorage)
                    .filter(k => k.startsWith(PREFIX))
                    .forEach(k => sessionStorage.removeItem(k));
            } catch { /* ignore */ }
        }
    };
})();

const DISPLAY_NAME_KEYS = new Set([
    'name',
    'display_name',
    'weapon_name',
    'runner_name',
    'collection_name',
    'faction_name'
]);

function normalizeDisplayName(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;

    return trimmed
        .split(/\s+/)
        .map(token => token
            .split(/([\-/'’])/)
            .map(part => {
                if (!part || /[\-/'’]/.test(part)) return part;
                if (!/[A-Za-z]/.test(part)) return part;
                if (/^[ivxlcdm]+$/i.test(part) && part.length <= 6) return part.toUpperCase();
                if (/^[A-Z0-9]+$/.test(part) && part.length <= 5) return part;
                return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join(''))
        .join(' ');
}

function normalizeDisplayNamesInPayload(payload) {
    if (Array.isArray(payload)) {
        return payload.map(normalizeDisplayNamesInPayload);
    }
    if (!payload || typeof payload !== 'object') {
        return payload;
    }

    const normalized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (DISPLAY_NAME_KEYS.has(key) && typeof value === 'string') {
            normalized[key] = normalizeDisplayName(value);
        } else {
            normalized[key] = normalizeDisplayNamesInPayload(value);
        }
    }
    return normalized;
}

if (typeof window !== 'undefined') {
    window.MarathonNameUtils = window.MarathonNameUtils || {};
    window.MarathonNameUtils.normalizeDisplayName = normalizeDisplayName;
    window.MarathonNameUtils.normalizeDisplayNamesInPayload = normalizeDisplayNamesInPayload;
}

const MarathonAPI = (function() {
    const API_BASE = 'https://helpbot.marathondb.gg';
    const CORES_API_BASE = 'https://cores.marathondb.gg';
    const IMPLANTS_API_BASE = 'https://implants.marathondb.gg';
    const MODS_API_BASE = 'https://mods.marathondb.gg';
    const CONTRACTS_API_BASE = 'https://marathon-contracts-api.heymarathondb.workers.dev';
    
    // Generic fetch wrapper (with session cache for GETs)
    async function fetchAPI(endpoint, options = {}) {
        try {
            const { headers: extraHeaders, ...rest } = options;
            const method = (rest.method || 'GET').toUpperCase();
            const url = `${API_BASE}${endpoint}`;

            // Cache hit — return immediately for safe methods
            if (method === 'GET') {
                const cached = ApiCache.get(url);
                if (cached) return cached;
            }

            const needsContentType = method !== 'GET' && method !== 'HEAD';
            const headers = {
                ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
                ...(extraHeaders || {}),
            };
            const response = await fetch(url, {
                ...rest,
                headers,
            });
            
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const err = new Error(`API Error: ${response.status}`);
                err.status = response.status;
                err.body = data;
                throw err;
            }

            if (method === 'GET' && data) ApiCache.set(url, data);
            return data;
        } catch (error) {
            if (error.status) throw error; // Re-throw API errors with body attached
            console.error('API fetch error:', error);
            return null;
        }
    }

    // Cores-specific fetch wrapper (uses cores.marathondb.gg exclusively)
    async function fetchCoresAPI(endpoint, options = {}) {
        try {
            const { headers: extraHeaders, ...rest } = options;
            const method = (rest.method || 'GET').toUpperCase();
            const url = `${CORES_API_BASE}${endpoint}`;

            if (method === 'GET') {
                const cached = ApiCache.get(url);
                if (cached) return cached;
            }

            const needsContentType = method !== 'GET' && method !== 'HEAD';
            const headers = {
                ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
                ...(extraHeaders || {}),
            };
            const response = await fetch(url, {
                ...rest,
                headers,
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const err = new Error(`Cores API Error: ${response.status}`);
                err.status = response.status;
                err.body = data;
                throw err;
            }

            if (method === 'GET' && data) ApiCache.set(url, data);
            return data;
        } catch (error) {
            if (error.status) throw error;
            console.error('Cores API fetch error:', error);
            return null;
        }
    }

    // Implants-specific fetch wrapper (uses implants.marathondb.gg exclusively)
    async function fetchImplantsAPI(endpoint, options = {}) {
        try {
            const { headers: extraHeaders, ...rest } = options;
            const method = (rest.method || 'GET').toUpperCase();
            const url = `${IMPLANTS_API_BASE}${endpoint}`;

            if (method === 'GET') {
                const cached = ApiCache.get(url);
                if (cached) return cached;
            }

            const needsContentType = method !== 'GET' && method !== 'HEAD';
            const headers = {
                ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
                ...(extraHeaders || {}),
            };
            const response = await fetch(url, {
                ...rest,
                headers,
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const err = new Error(`Implants API Error: ${response.status}`);
                err.status = response.status;
                err.body = data;
                throw err;
            }

            if (method === 'GET' && data) ApiCache.set(url, data);
            return data;
        } catch (error) {
            if (error.status) throw error;
            console.error('Implants API fetch error:', error);
            return null;
        }
    }

    // Mods-specific fetch wrapper (uses mods.marathondb.gg exclusively)
    async function fetchModsAPI(endpoint, options = {}) {
        try {
            const { headers: extraHeaders, ...rest } = options;
            const method = (rest.method || 'GET').toUpperCase();
            const url = `${MODS_API_BASE}${endpoint}`;

            if (method === 'GET') {
                const cached = ApiCache.get(url);
                if (cached) return cached;
            }

            const needsContentType = method !== 'GET' && method !== 'HEAD';
            const headers = {
                ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
                ...(extraHeaders || {}),
            };
            const response = await fetch(url, {
                ...rest,
                headers,
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const err = new Error(`Mods API Error: ${response.status}`);
                err.status = response.status;
                err.body = data;
                throw err;
            }

            if (method === 'GET' && data) ApiCache.set(url, data);
            return data;
        } catch (error) {
            if (error.status) throw error;
            console.error('Mods API fetch error:', error);
            return null;
        }
    }
    
    // Contracts-specific fetch wrapper (uses marathon-contracts-api.heymarathondb.workers.dev)
    async function fetchContractsAPI(endpoint) {
        try {
            const url = `${CONTRACTS_API_BASE}${endpoint}`;
            const cached = ApiCache.get(url);
            if (cached) return cached;

            const response = await fetch(url);
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const err = new Error(`Contracts API Error: ${response.status}`);
                err.status = response.status;
                err.body = data;
                throw err;
            }

            if (data) ApiCache.set(url, data);
            return data;
        } catch (error) {
            if (error.status) throw error;
            console.error('Contracts API fetch error:', error);
            return null;
        }
    }

    return {
        // ============ API BASE ============
        getApiBase: function() {
            return API_BASE;
        },
        
        // ============ GENERIC GET ============
        get: async function(endpoint) {
            const result = await fetchAPI(`/api${endpoint}`);
            // API already returns { success, data } format
            if (result && result.success !== undefined) {
                return result;
            }
            // Wrap raw data in standard format
            return { success: !!result, data: result };
        },
        
        // ============ WEAPONS ============
        getWeapons: async function(category = null) {
            const endpoint = category ? `/api/weapons?category=${category}` : '/api/weapons';
            return await fetchAPI(endpoint);
        },
        
        getWeaponBySlug: async function(slug) {
            return await fetchAPI(`/api/weapons/${slug}`);
        },
        
        getWeaponHistory: async function(slug) {
            return await fetchAPI(`/api/weapons/${slug}/history`);
        },
        
        // ============ CATEGORIES ============
        getCategories: async function() {
            return await fetchAPI('/api/categories');
        },
        
        // ============ RUNNERS ============
        getRunners: async function() {
            return await fetchAPI('/api/runners');
        },
        
        getRunnerBySlug: async function(slug) {
            return await fetchAPI(`/api/runners/${slug}`);
        },
        
        getRunnerHistory: async function(slug) {
            return await fetchAPI(`/api/runners/${slug}/history`);
        },
        
        compareRunners: async function(season = null) {
            const endpoint = season ? `/api/runners/compare?season=${season}` : '/api/runners/compare';
            return await fetchAPI(endpoint);
        },
        
        // ============ ITEMS ============
        // Unified endpoint - returns all items from all tables
        getAllItems: async function() {
            return await fetchAPI('/api/items/all');
        },
        
        getItems: async function(type = null, rarity = null) {
            let endpoint = '/api/items';
            const params = [];
            if (type) params.push(`type=${type}`);
            if (rarity) params.push(`rarity=${rarity}`);
            if (params.length) endpoint += '?' + params.join('&');
            return await fetchAPI(endpoint);
        },
        
        getItemsByType: async function(type) {
            return await fetchAPI(`/api/items/types/${type}`);
        },
        
        getItemBySlug: async function(slug) {
            return await fetchAPI(`/api/items/${slug}`);
        },
        
        // Get available item types for filter dropdowns (API v2.0.0)
        getItemTypes: async function() {
            return await fetchAPI('/api/items/types');
        },
        
        // ============ MODS ============
        getMods: async function() {
            return await fetchModsAPI('/api/mods');
        },
        
        getModBySlug: async function(slug) {
            return await fetchModsAPI(`/api/mods/${slug}`);
        },
        
        getModsForWeapon: async function(weaponSlug) {
            return await fetchModsAPI(`/api/weapons/${encodeURIComponent(weaponSlug)}/mods`);
        },
        
        getModSlotsForWeapon: async function(weaponSlug) {
            return await fetchModsAPI(`/api/weapons/${encodeURIComponent(weaponSlug)}/slots`);
        },
        
        // ============ SEASONS ============
        getSeasons: async function() {
            return await fetchAPI('/api/seasons');
        },

        getCurrentSeason: async function() {
            return await fetchAPI('/api/seasons/current');
        },

        // ============ LOADOUTS ============
        createLoadout: async function(loadout) {
            return await fetchAPI('/api/loadouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loadout),
            });
        },

        getLoadout: async function(shareCode) {
            return await fetchAPI(`/api/loadouts/${shareCode}`);
        },

        getLoadouts: async function(params = {}) {
            const qs = Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            return await fetchAPI(`/api/loadouts${qs ? '?' + qs : ''}`);
        },

        deleteLoadout: async function(shareCode, adminKey) {
            return await fetchAPI(`/api/loadouts/${shareCode}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Key': adminKey },
            });
        },

        // ============ STAT RANGES ============
        getWeaponStatRanges: async function() {
            return await fetchAPI('/api/weapons/stat-ranges');
        },

        getRunnerStatRanges: async function() {
            return await fetchAPI('/api/runners/stat-ranges');
        },
        
        // ============ ASSET URLs ============
        getWeaponIconUrl: function(iconPath, resolution = 'low') {
            if (!iconPath) return `${API_BASE}/assets/weapons/placeholder.png`;
            const filename = iconPath.split('/').pop();
            return `${API_BASE}/assets/weapons/${encodeURIComponent(filename)}`;
        },
        
        // Get weapon icon with resolution option ('low' = 180x135, 'high' = 800x600)
        getWeaponIconUrlBySlug: function(slug, resolution = 'low') {
            if (!slug) return `${API_BASE}/assets/weapons/placeholder.png`;
            const suffix = resolution === 'high' ? '800x600' : '180x135';
            return `${API_BASE}/assets/weapons/${slug}-${suffix}.png`;
        },
        
        getRunnerIconUrl: function(iconPath) {
            if (!iconPath) return `${API_BASE}/assets/runners/placeholder.png`;
            // If it's already a full path from API (e.g., "assets/runners/thief-300x460.png")
            if (iconPath.startsWith('assets/')) {
                return `${API_BASE}/${iconPath}`;
            }
            // If slug is passed instead of full path, construct the URL
            const slug = iconPath.toLowerCase().replace(/\.png$/, '');
            return `${API_BASE}/assets/runners/${slug}-300x460.png`;
        },
        
        // Get runner icon with resolution option ('low' = 150x230, 'high' = 300x460)
        getRunnerIconUrlBySlug: function(slug, resolution = 'high') {
            if (!slug) return `${API_BASE}/assets/runners/placeholder.png`;
            const suffix = resolution === 'low' ? '150x230' : '300x460';
            return `${API_BASE}/assets/runners/${slug}-${suffix}.png`;
        },
        
        getItemIconUrl: function(iconPath) {
            if (!iconPath) return `${API_BASE}/assets/items/placeholder.png`;
            // If it's already a full path from API (e.g., "assets/items/consumables/patch-kit-64x64.png")
            if (iconPath.startsWith('assets/')) {
                return `${API_BASE}/${iconPath}`;
            }
            // Fallback: assume it's just a filename or slug
            return `${API_BASE}/assets/items/${encodeURIComponent(iconPath)}`;
        },
        
        getStatIconUrl: function(statKey) {
            // Map stat keys to icon filenames
            const statIcons = {
                'heat_capacity': 'heat-capacity.jpg',
                'agility': 'agility.jpg',
                'loot_speed': 'loot-speed.jpg',
                'self_repair_speed': 'self-repair-speed.jpg',
                'finisher_siphon': 'finisher-siphon.jpg',
                'revive_speed': 'revive-speed.jpg',
                'hardware': 'hardware.jpg',
                'firewall': 'firewall.jpg'
            };
            const filename = statIcons[statKey] || 'placeholder.png';
            return `/assets/icons/${filename}`;
        },
        
        // ============ CONSUMABLES ============
        getConsumables: async function(type = null, rarity = null) {
            let endpoint = '/api/consumables';
            const params = [];
            if (type) params.push(`type=${type}`);
            if (rarity) params.push(`rarity=${rarity}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return await fetchAPI(endpoint);
        },
        
        // ============ CORES ============
        getCores: async function(runnerType = null, rarity = null, purchaseable = null, activeOnly = null) {
            let endpoint = '/api/cores';
            const params = [];
            if (runnerType) params.push(`runner=${runnerType}`);
            if (rarity) params.push(`rarity=${rarity}`);
            if (purchaseable) params.push(`purchaseable=true`);
            if (activeOnly !== null) params.push(`active=${activeOnly}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return await fetchCoresAPI(endpoint);
        },
        
        getCoresByRunner: async function(runnerType) {
            return await fetchCoresAPI(`/api/cores/runner/${runnerType}`);
        },
        
        getCoreBySlug: async function(slug) {
            // Returns detailed core info with full balance history
            return await fetchCoresAPI(`/api/cores/${slug}`);
        },
        
        getCoreChangelog: async function() {
            // Chronological changelog of all balance changes
            return await fetchCoresAPI('/api/cores/changelog');
        },
        
        getCoreIconUrl: function(iconPath) {
            if (!iconPath) return `${CORES_API_BASE}/assets/items/cores/placeholder.png`;
            // If it's already a full URL from the API response
            if (iconPath.startsWith('http')) return iconPath;
            // If it's a relative path from API
            if (iconPath.startsWith('assets/')) {
                return `${CORES_API_BASE}/${iconPath}`;
            }
            // Fallback: assume it's a slug and construct the path
            return `${CORES_API_BASE}/assets/items/cores/${encodeURIComponent(iconPath)}-72x72.png`;
        },
        
        // ============ IMPLANTS ============
        getImplants: async function(slot = null, rarity = null, page = null, limit = null) {
            let endpoint = '/api/implants';
            const params = [];
            if (slot) params.push(`slot=${slot}`);
            if (rarity) params.push(`rarity=${rarity}`);
            if (page) params.push(`page=${page}`);
            if (limit) params.push(`limit=${limit}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return await fetchImplantsAPI(endpoint);
        },
        
        getImplantBySlug: async function(slug) {
            return await fetchImplantsAPI(`/api/implants/${slug}`);
        },
        
        getImplantSlots: async function() {
            return await fetchImplantsAPI('/api/implants/slots');
        },
        
        getImplantsBySlot: async function(slot) {
            return await fetchImplantsAPI(`/api/implants/slot/${slot}`);
        },

        getTraits: async function() {
            return await fetchImplantsAPI('/api/traits');
        },
        
        // ============ FACTIONS (Contracts API) ============
        getFactions: async function() {
            return await fetchContractsAPI('/api/factions');
        },
        
        getFactionBySlug: async function(slug) {
            return await fetchContractsAPI(`/api/factions/${slug}`);
        },
        
        getFactionContracts: async function(slug, type = null) {
            let endpoint = `/api/factions/${slug}/contracts`;
            const params = [];
            if (type) params.push(`type=${type}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return await fetchContractsAPI(endpoint);
        },
        
        getFactionUpgrades: async function(slug, category = null, tier = null) {
            let endpoint = `/api/factions/${slug}/upgrades`;
            const params = [];
            if (category) params.push(`category=${category}`);
            if (tier) params.push(`tier=${tier}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return await fetchContractsAPI(endpoint);
        },

        getFactionReputation: async function(slug) {
            return await fetchContractsAPI(`/api/factions/${slug}/reputation`);
        },
        
        // ============ CONTRACTS (Contracts API) ============
        getContracts: async function(options = {}) {
            let endpoint = '/api/contracts';
            const params = [];
            if (options.type) params.push(`type=${options.type}`);
            if (options.faction) params.push(`faction=${options.faction}`);
            if (options.difficulty) params.push(`difficulty=${options.difficulty}`);
            if (options.map) params.push(`map=${options.map}`);
            if (options.scope) params.push(`scope=${options.scope}`);
            if (options.tag) params.push(`tag=${options.tag}`);
            if (options.chain) params.push(`chain=${options.chain}`);
            if (options.season) params.push(`season=${options.season}`);
            if (options.active !== undefined) params.push(`active=${options.active}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return await fetchContractsAPI(endpoint);
        },
        
        getContractBySlug: async function(slug) {
            return await fetchContractsAPI(`/api/contracts/${slug}`);
        },

        getContractRotation: async function() {
            return await fetchContractsAPI('/api/contracts/rotation');
        },

        getContractTags: async function() {
            return await fetchContractsAPI('/api/contract-tags');
        },
        
        // ============ DATABASE STATS ============
        // New unified stats endpoint (API v2.0.0)
        getStats: async function() {
            return await fetchAPI('/api/stats');
        },
        
        // Legacy method - now uses the new /api/stats endpoint
        getDbStats: async function() {
            try {
                const stats = await this.getStats();
                if (stats) {
                    return {
                        weapons: stats.weapons?.total || 0,
                        runners: stats.runners?.total || 0,
                        items: stats.items?.total || 0,
                        mods: stats.mods?.total || 0,
                        cores: stats.cores?.total || 0,
                        factions: stats.factions?.total || 0,
                        cosmetics: stats.cosmetics?.total || 0,
                        maps: stats.maps?.total || 0,
                        implants: stats.implants?.total || 0,
                        contracts: stats.contracts?.total || 0
                    };
                }
                return { weapons: 0, runners: 0, items: 0, mods: 0 };
            } catch (error) {
                console.error('Error fetching stats:', error);
                return { weapons: 0, runners: 0, items: 0, mods: 0 };
            }
        }
    };
})();

// Weapons API Client — https://weapons.marathondb.gg
const WeaponsAPI = (function() {
    const BASE = 'https://weapons.marathondb.gg';

    async function fetchAPI(endpoint) {
        try {
            const url = `${BASE}${endpoint}`;
            const cached = ApiCache.get(url);
            if (cached) return cached;

            const response = await fetch(url);
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const err = new Error(`Weapons API Error: ${response.status}`);
                err.status = response.status;
                err.body = data;
                throw err;
            }
            if (data) ApiCache.set(url, data);
            return data;
        } catch (error) {
            if (error.status) throw error;
            console.error('WeaponsAPI fetch error:', error);
            return null;
        }
    }

    // Pick the current-season stats row and flatten into weapon object.
    // Prefer is_current === true; fall back to the row with the highest season_id (latest).
    function normalizeWeapon(weapon) {
        if (!weapon) return weapon;
        if (!Array.isArray(weapon.stats) || weapon.stats.length === 0) return weapon;
        const current = weapon.stats.reduce((a, b) => (b.season_id > a.season_id ? b : a));
        return { ...weapon, stats: current };
    }

    return {
        getWeapons: async function(category = null) {
            const qs = category ? `?category=${encodeURIComponent(category)}` : '';
            return await fetchAPI(`/api/weapons${qs}`);
        },
        getCategories: async function() {
            return await fetchAPI('/api/weapons/categories');
        },
        getWeaponBySlug: async function(slug) {
            const result = await fetchAPI(`/api/weapons/${encodeURIComponent(slug)}`);
            if (result?.data) result.data = normalizeWeapon(result.data);
            return result;
        },
        getStatRanges: async function() {
            return await fetchAPI('/api/weapons/stat-ranges');
        },
        normalizeWeapon,
    };
})();

// Twitch API Client (separate endpoint — 2-min cache for live data)
const TwitchAPI = (function() {
    const API_BASE = 'https://twitch.gdb.gg/api/v2/categories/407314011';
    const TWITCH_TTL = 2 * 60 * 1000;
    const _twitchCache = {};

    async function fetchAPI(endpoint) {
        try {
            const url = `${API_BASE}${endpoint}`;
            const hit = _twitchCache[url];
            if (hit && Date.now() - hit.ts < TWITCH_TTL) return hit.data;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Twitch API Error: ${response.status}`);
            const data = await response.json();
            _twitchCache[url] = { ts: Date.now(), data };
            return data;
        } catch (error) {
            console.error('Twitch API error:', error);
            return null;
        }
    }
    
    return {
        getCurrentStats: async function() {
            return await fetchAPI('/current-v2');
        },
        
        getHistory: async function(range = '7d') {
            return await fetchAPI(`/history-v2?range=${range}`);
        }
    };
})();
