// Environment Configuration for gdb.gg
// Copy this file to config.js and update with your values
// DO NOT commit config.js to version control

const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: 'https://api.gdb.gg',
    VERSION: 'v2',
    TIMEOUT: 10000, // Request timeout in ms
    RETRY_ATTEMPTS: 3,
    CACHE_TTL: 300 // Cache time-to-live in seconds
  },

  // Platform-Specific API Endpoints
  PLATFORMS: {
    FORTNITE: {
      BASE_URL: 'https://api.gdb.gg/fortnite',
      ENDPOINTS: {
        PROFILE: '/profile',
        RANKED: '/ranked',
        LEADERBOARDS: '/leaderboards',
        EVENTS: '/events',
        SHOP: '/shop',
        CCU: '/ccu',
        POPULATION: '/population',
        PLAYLISTS: '/playlists',
        METRICS: '/metrics'
      }
    },
    STEAM: {
      BASE_URL: 'https://api.gdb.gg/steam',
      ENDPOINTS: {
        PROFILE: '/user',
        GAMES: '/games',
        POPULAR: '/games/popular',
        FEATURED: '/games/featured',
        TRENDING: '/games/trending',
        NEW_RELEASES: '/games/new-releases',
        TOP_SELLERS: '/games/top-sellers',
        SPECIALS: '/games/specials',
        SEARCH_GAMES: '/search/games',
        SEARCH_PROFILES: '/search/profiles',
        METRICS: '/metrics',
        LEADERBOARDS: '/leaderboards'
      }
    },
    TWITCH: {
      BASE_URL: 'https://api.gdb.gg/api/v2',
      ENDPOINTS: {
        TOP_CATEGORIES: '/top-categories/current',
        CATEGORY: '/categories',
        PROFILE: '/streamers',
        LEADERBOARDS: '/leaderboards',
        STREAMS: '/streams'
      }
    },
    XBOX: {
      BASE_URL: 'https://api.gdb.gg/xbox',
      ENDPOINTS: {
        PROFILE: '/profile'
      }
    },
    PLAYSTATION: {
      BASE_URL: 'https://api.gdb.gg/playstation',
      ENDPOINTS: {
        PROFILE: '/profile'
      }
    }
  },

  // Feature Flags
  FEATURES: {
    ENABLE_ANALYTICS: true,
    ENABLE_ERROR_REPORTING: true,
    ENABLE_DEBUG_MODE: false,
    ENABLE_CACHE: true,
    ENABLE_LIVE_DATA: true
  },

  // UI Configuration
  UI: {
    ITEMS_PER_PAGE: 20,
    MAX_SEARCH_RESULTS: 50,
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    LOADING_DELAY: 200 // Delay before showing loader to avoid flashing
  },

  // Error Messages
  ERRORS: {
    NETWORK: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
    INVALID_INPUT: 'Invalid input. Please check your entry and try again.',
    GENERIC: 'Something went wrong. Please try again.'
  },

  // Development
  DEV: {
    MOCK_DATA: false,
    LOG_LEVEL: 'info', // 'debug' | 'info' | 'warn' | 'error'
    SHOW_RESPONSE_TIMES: false
  }
};

// Freeze config to prevent accidental modifications
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG.API);
  Object.freeze(CONFIG.PLATFORMS);
  Object.freeze(CONFIG.FEATURES);
  Object.freeze(CONFIG.UI);
  Object.freeze(CONFIG.ERRORS);
  Object.freeze(CONFIG.DEV);
  Object.freeze(CONFIG);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
