/**
 * Ratings System (Runners & Weapons)
 * Handles device token management, API calls, and rating widget functionality
 * API Base: https://helpbot.marathondb.gg/api/ratings
 */

const RatingsAPI = {
    BASE_URL: 'https://helpbot.marathondb.gg/api/ratings',
    STORAGE_KEY: 'marathondb_device_token',
    
    /**
     * Get or create a device token for anonymous identification
     * @returns {string} 48-character alphanumeric token
     */
    getDeviceToken() {
        let token = localStorage.getItem(this.STORAGE_KEY);
        
        // Validate existing token
        if (token && /^[a-zA-Z0-9]{32,64}$/.test(token)) {
            return token;
        }
        
        // Generate new token
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        token = Array.from({ length: 48 }, () => 
            chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
        
        localStorage.setItem(this.STORAGE_KEY, token);
        return token;
    },
    
    /**
     * Get ratings for all runners
     * @param {Object} options - Query options
     * @param {string} options.sort - Sort by: 'rating', 'votes', 'name'
     * @param {string} options.order - Order: 'asc' or 'desc'
     * @param {number} options.limit - Max results
     * @param {number} options.season_id - Specific season ID
     * @returns {Promise<Object>} API response
     */
    async getAllRunnerRatings(options = {}) {
        const params = new URLSearchParams();
        if (options.sort) params.append('sort', options.sort);
        if (options.order) params.append('order', options.order);
        if (options.limit) params.append('limit', options.limit);
        if (options.season_id) params.append('season_id', options.season_id);
        
        const url = `${this.BASE_URL}/runners${params.toString() ? '?' + params : ''}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'X-Device-Token': this.getDeviceToken()
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching all runner ratings:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Get ratings for a specific runner
     * @param {string} slug - Runner slug (e.g., 'assassin', 'nova')
     * @param {number} seasonId - Optional specific season
     * @returns {Promise<Object>} API response with ratings and user's rating
     */
    async getRunnerRating(slug, seasonId = null) {
        let url = `${this.BASE_URL}/runners/${slug}`;
        if (seasonId) url += `?season_id=${seasonId}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'X-Device-Token': this.getDeviceToken()
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching runner rating:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Submit or update a rating for a runner
     * @param {string} slug - Runner slug
     * @param {number} rating - Rating value (1-5)
     * @returns {Promise<Object>} API response
     */
    async submitRating(slug, rating) {
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return { success: false, error: 'invalid_rating', message: 'Rating must be an integer between 1 and 5' };
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/runners/${slug}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Token': this.getDeviceToken()
                },
                body: JSON.stringify({ rating })
            });
            return await response.json();
        } catch (error) {
            console.error('Error submitting rating:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Delete user's rating for a runner
     * @param {string} slug - Runner slug
     * @returns {Promise<Object>} API response
     */
    async deleteRating(slug) {
        try {
            const response = await fetch(`${this.BASE_URL}/runners/${slug}`, {
                method: 'DELETE',
                headers: {
                    'X-Device-Token': this.getDeviceToken()
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting rating:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Get rating history across seasons for a runner
     * @param {string} slug - Runner slug
     * @returns {Promise<Object>} API response with seasonal history
     */
    async getRunnerRatingHistory(slug) {
        try {
            const response = await fetch(`${this.BASE_URL}/runners/${slug}/history`, {
                headers: {
                    'X-Device-Token': this.getDeviceToken()
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching rating history:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },

    /**
     * Get daily rating timeline for a single runner
     * Uses GET /runners/:slug/timeline from the Ratings API
     * @param {string} slug - Runner slug
     * @param {Object} options - Query options
     * @param {number} options.days - Days to look back (default 90, max 365)
     * @param {string} options.granularity - 'day' | 'week' | 'month' (default 'day')
     * @returns {Promise<Object>} API response with timeline data points
     */
    async getRunnerTimeline(slug, options = {}) {
        const params = new URLSearchParams();
        if (options.days) params.append('days', options.days);
        if (options.granularity) params.append('granularity', options.granularity);

        const qs = params.toString() ? '?' + params : '';
        const url = `${this.BASE_URL}/runners/${encodeURIComponent(slug)}/timeline${qs}`;
        try {
            const response = await fetch(url, {
                headers: { 'X-Device-Token': this.getDeviceToken() }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching runner timeline:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Get leaderboard of top-rated runners
     * @param {Object} options - Query options
     * @param {number} options.limit - Max results (default 10, max 20)
     * @param {number} options.min_votes - Minimum votes required (default 5)
     * @returns {Promise<Object>} API response with leaderboard
     */
    async getLeaderboard(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.min_votes) params.append('min_votes', options.min_votes);
        
        const url = `${this.BASE_URL}/leaderboard${params.toString() ? '?' + params : ''}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'X-Device-Token': this.getDeviceToken()
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    // ==================== WEAPON RATINGS API ====================
    // Now backed by https://weapons.marathondb.gg (Weapons API)
    
    WEAPONS_API_URL: 'https://weapons.marathondb.gg',
    
    /**
     * Get ratings for all weapons (current season, ranked by average)
     * Uses GET /api/weapons/all from the Weapons API
     * @param {Object} options - Query options
     * @param {string} options.category - Filter by category slug (e.g., 'shotguns')
     * @returns {Promise<Object>} API response
     */
    async getAllWeaponRatings(options = {}) {
        const params = new URLSearchParams();
        if (options.category) params.append('category', options.category);
        
        const url = `${this.WEAPONS_API_URL}/api/weapons/all${params.toString() ? '?' + params : ''}`;
        
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching all weapon ratings:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Get ratings for a specific weapon
     * Uses GET /api/weapons/:slug/ratings from the Weapons API
     * @param {string} slug - Weapon slug (e.g., 'longshot', 'ce-tactical-sidearm')
     * @param {number} seasonId - Optional specific season (unused — API defaults to current)
     * @returns {Promise<Object>} API response with ratings and user's rating
     */
    async getWeaponRating(slug, seasonId = null) {
        const deviceToken = this.getDeviceToken();
        const params = new URLSearchParams();
        params.append('device_token', deviceToken);
        
        const url = `${this.WEAPONS_API_URL}/api/weapons/${encodeURIComponent(slug)}/ratings?${params}`;
        
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching weapon rating:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Submit or update a rating for a weapon
     * Uses POST /api/weapons/:slug/rate from the Weapons API
     * @param {string} slug - Weapon slug
     * @param {number} rating - Rating value (1-5)
     * @returns {Promise<Object>} API response
     */
    async submitWeaponRating(slug, rating) {
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return { success: false, error: 'invalid_rating', message: 'Rating must be an integer between 1 and 5' };
        }
        
        const deviceToken = this.getDeviceToken();
        
        try {
            const response = await fetch(`${this.WEAPONS_API_URL}/api/weapons/${encodeURIComponent(slug)}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating, device_token: deviceToken })
            });
            return await response.json();
        } catch (error) {
            console.error('Error submitting weapon rating:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },
    
    /**
     * Get weapon rating overview / leaderboard
     * Uses GET /api/weapons/overview from the Weapons API
     * @param {Object} options - Query options
     * @param {string} options.category - Filter by category slug
     * @param {number} options.min_votes - Minimum votes required (default 0)
     * @returns {Promise<Object>} API response with ranked leaderboard
     */
    async getWeaponLeaderboard(options = {}) {
        const params = new URLSearchParams();
        if (options.category) params.append('category', options.category);
        if (options.min_votes) params.append('min_votes', options.min_votes);
        
        const url = `${this.WEAPONS_API_URL}/api/weapons/overview${params.toString() ? '?' + params : ''}`;
        
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching weapon leaderboard:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },

    /**
     * Get rating history across all seasons for a weapon
     * Uses GET /api/weapons/:slug/history from the Weapons API
     * @param {string} slug - Weapon slug
     * @returns {Promise<Object>} API response with per-season rating history
     */
    async getWeaponHistory(slug) {
        const url = `${this.WEAPONS_API_URL}/api/weapons/${encodeURIComponent(slug)}/history`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching weapon history:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },

    /**
     * Get daily rating timeline for a single weapon
     * Uses GET /api/weapons/:slug/timeline from the Weapons API
     * @param {string} slug - Weapon slug
     * @param {Object} options - Query options
     * @param {number} options.days - Days to look back (default 90, max 365)
     * @param {string} options.granularity - 'day' | 'week' | 'month' (default 'day')
     * @param {number} options.season_id - Specific season (defaults to current)
     * @returns {Promise<Object>} API response with timeline data points
     */
    async getWeaponTimeline(slug, options = {}) {
        const params = new URLSearchParams();
        if (options.days) params.append('days', options.days);
        if (options.granularity) params.append('granularity', options.granularity);
        if (options.season_id) params.append('season_id', options.season_id);

        const qs = params.toString() ? '?' + params : '';
        const url = `${this.WEAPONS_API_URL}/api/weapons/${encodeURIComponent(slug)}/timeline${qs}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching weapon timeline:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },

    /**
     * Get daily rating timeline for all weapons (comparison)
     * Uses GET /api/weapons/timeline from the Weapons API
     * @param {Object} options - Query options
     * @param {number} options.days - Days to look back (default 30, max 365)
     * @param {string} options.granularity - 'day' | 'week' | 'month' (default 'day')
     * @returns {Promise<Object>} API response with per-weapon timeline arrays
     */
    async getAllWeaponsTimeline(options = {}) {
        const params = new URLSearchParams();
        if (options.days) params.append('days', options.days);
        if (options.granularity) params.append('granularity', options.granularity);

        const qs = params.toString() ? '?' + params : '';
        const url = `${this.WEAPONS_API_URL}/api/weapons/timeline${qs}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching all weapons timeline:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    },

    /**
     * Batch fetch combined all-time votes for multiple weapons in one request
     * Uses POST /api/weapons/combined-votes from the Weapons API
     * @param {string[]} slugs - Array of weapon slugs
     * @returns {Promise<Object>} { success, data: [{ weapon_slug, total_votes, average_rating }] }
     */
    async getCombinedVotesBatch(slugs) {
        const url = `${this.WEAPONS_API_URL}/api/weapons/combined-votes`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slugs })
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching combined votes batch:', error);
            return { success: false, error: 'network_error', message: error.message };
        }
    }
};

/**
 * Rating Widget Component
 * Creates and manages interactive star rating UI
 * Supports both runners and weapons
 */
class RatingWidget {
    constructor(containerElement, slug, options = {}) {
        this.container = containerElement;
        this.slug = slug;
        this.type = options.type || 'runner'; // 'runner' or 'weapon'
        this.options = {
            showDistribution: options.showDistribution ?? true,
            showVoteCount: options.showVoteCount ?? true,
            onRatingChange: options.onRatingChange || null,
            ...options
        };
        
        this.currentRating = 0;
        this.userRating = null;
        this.aggregate = null;
        this.hoveredStar = 0;
        this.isLoading = false;
        
        // Determine label based on type
        this.itemLabel = this.type === 'weapon' ? 'weapon' : 'runner';
        
        this.init();
    }
    
    async init() {
        this.render();
        await this.fetchRating();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="rating-widget">
                <div class="rating-widget-header">
                    <h3 class="rating-widget-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        Community Rating
                    </h3>
                    <div class="rating-season-badge" id="ratingSeasonBadge"></div>
                </div>
                
                <div class="rating-widget-content">
                    <div class="rating-stars-section">
                        <div class="rating-stars-container">
                            <div class="rating-average" id="ratingAverage">
                                <span class="rating-average-value">-</span>
                                <span class="rating-average-label">/ 5</span>
                            </div>
                            <div class="rating-vote-count" id="ratingVoteCount">
                                <span class="vote-count-value">-</span> votes
                            </div>
                        </div>
                    </div>
                    
                    <div class="rating-interactive-section">
                        <div class="rating-interactive-label" id="ratingInteractiveLabel">
                            <span class="rating-cta-icon">👆</span>
                            <span class="rating-cta-text">Tap a star to rate this ${this.itemLabel}</span>
                        </div>
                        <div class="rating-stars-wrapper">
                            <div class="rating-stars" id="ratingStars">
                                ${this.renderStars()}
                            </div>
                        </div>
                        <div class="rating-user-section" id="ratingUserSection"></div>
                    </div>
                    
                    ${this.options.showDistribution ? `
                    <div class="rating-distribution" id="ratingDistribution">
                        ${this.renderDistribution()}
                    </div>
                    ` : ''}
                </div>
                
                <div class="rating-widget-loading" id="ratingLoading" style="display: none;">
                    <div class="loading-spinner small"></div>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    renderStars() {
        return [1, 2, 3, 4, 5].map(star => `
            <button class="rating-star" data-star="${star}" aria-label="Rate ${star} star${star > 1 ? 's' : ''}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            </button>
        `).join('');
    }
    
    renderDistribution() {
        return [5, 4, 3, 2, 1].map(rating => `
            <div class="distribution-row" data-rating="${rating}">
                <span class="distribution-label">${rating}</span>
                <div class="distribution-bar-container">
                    <div class="distribution-bar" style="width: 0%"></div>
                </div>
                <span class="distribution-percent">0%</span>
            </div>
        `).join('');
    }
    
    attachEventListeners() {
        const starsContainer = this.container.querySelector('#ratingStars');
        const stars = starsContainer.querySelectorAll('.rating-star');
        
        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                if (!this.isLoading) {
                    this.setHoveredStar(parseInt(star.dataset.star));
                }
            });
            
            star.addEventListener('mouseleave', () => {
                this.setHoveredStar(0);
            });
            
            star.addEventListener('click', () => {
                if (!this.isLoading) {
                    this.submitRating(parseInt(star.dataset.star));
                }
            });
        });
    }
    
    setHoveredStar(star) {
        this.hoveredStar = star;
        this.updateStarDisplay();
    }
    
    updateStarDisplay() {
        const stars = this.container.querySelectorAll('.rating-star');
        const displayRating = this.hoveredStar || this.userRating || 0;
        
        stars.forEach(star => {
            const starValue = parseInt(star.dataset.star);
            star.classList.toggle('filled', starValue <= displayRating);
            star.classList.toggle('hovered', this.hoveredStar > 0 && starValue <= this.hoveredStar);
            star.classList.toggle('user-rated', this.userRating && starValue <= this.userRating && !this.hoveredStar);
        });
    }
    
    async fetchRating() {
        this.setLoading(true);
        
        // Use appropriate API based on type
        const response = this.type === 'weapon' 
            ? await RatingsAPI.getWeaponRating(this.slug)
            : await RatingsAPI.getRunnerRating(this.slug);
        
        if (response.success) {
            this.aggregate = response.ratings;
            // Weapons API returns user_rating as a number; Runners API as { rating: n }
            if (this.type === 'weapon') {
                this.userRating = (typeof response.user_rating === 'number') ? response.user_rating : null;
            } else {
                this.userRating = response.user_rating?.rating || null;
            }
            this.currentRating = this.userRating || 0;
            
            this.updateDisplay(response);
        } else {
            this.showError(response.message || response.error || 'Failed to load ratings');
        }
        
        this.setLoading(false);
    }
    
    async submitRating(rating) {
        this.setLoading(true);
        
        // Use appropriate API based on type
        const response = this.type === 'weapon'
            ? await RatingsAPI.submitWeaponRating(this.slug, rating)
            : await RatingsAPI.submitRating(this.slug, rating);
        
        if (response.success) {
            this.userRating = rating;
            this.currentRating = rating;
            
            // Weapons API returns aggregate in response.aggregate; Runners API in response.updated_aggregate
            const newAgg = response.aggregate || response.updated_aggregate;
            if (newAgg) {
                this.aggregate = {
                    ...this.aggregate,
                    average_rating: newAgg.average_rating,
                    total_votes: newAgg.total_votes,
                    distribution: newAgg.distribution || this.aggregate?.distribution
                };
            }
            
            this.updateDisplay({ ratings: this.aggregate, user_rating: this.userRating, season: response.season_id ? { id: response.season_id } : null });
            
            const isUpdate = response.message === 'Rating updated' || response.previous_rating != null;
            this.showSuccess(isUpdate ? 'Rating updated!' : 'Rating submitted!');
            
            if (this.options.onRatingChange) {
                this.options.onRatingChange(rating, this.aggregate);
            }
        } else {
            this.showError(response.message || response.error || 'Failed to submit rating');
        }
        
        this.setLoading(false);
    }
    
    updateDisplay(data) {
        // Update average
        const avgEl = this.container.querySelector('.rating-average-value');
        if (avgEl && data.ratings) {
            avgEl.textContent = data.ratings.average_rating?.toFixed(2) || '-';
        }
        
        // Update vote count
        const voteEl = this.container.querySelector('.vote-count-value');
        if (voteEl && data.ratings) {
            voteEl.textContent = data.ratings.total_votes?.toLocaleString() || '0';
        }
        
        // Update season badge — handle both { name, version } and { id }
        const seasonBadge = this.container.querySelector('#ratingSeasonBadge');
        if (seasonBadge && data.season) {
            const label = data.season.name || (data.season.version ? `Season ${data.season.version}` : '');
            if (label) {
                seasonBadge.textContent = label;
                seasonBadge.style.display = 'inline-flex';
            }
        }
        
        // Update user section
        const userSection = this.container.querySelector('#ratingUserSection');
        const interactiveLabel = this.container.querySelector('#ratingInteractiveLabel');
        
        if (userSection) {
            if (this.userRating) {
                // User has rated - show their rating with option to change
                userSection.innerHTML = `
                    <div class="rating-user-current">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="rating-check-icon">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span class="user-rating-label">Your rating:</span>
                        <span class="user-rating-stars">${'★'.repeat(this.userRating)}${'☆'.repeat(5 - this.userRating)}</span>
                        <span class="user-rating-change">(tap to change)</span>
                    </div>
                `;
                // Hide the CTA when user has already rated
                if (interactiveLabel) {
                    interactiveLabel.style.display = 'none';
                }
            } else {
                userSection.innerHTML = '';
                // Show the CTA when user hasn't rated
                if (interactiveLabel) {
                    interactiveLabel.style.display = 'flex';
                }
            }
        }
        
        // Update distribution
        if (this.options.showDistribution && data.ratings?.distribution) {
            this.updateDistribution(data.ratings.distribution);
        }
        
        // Update star display
        this.updateStarDisplay();
    }
    
    updateDistribution(distribution) {
        const container = this.container.querySelector('#ratingDistribution');
        if (!container) return;
        
        [5, 4, 3, 2, 1].forEach(rating => {
            const row = container.querySelector(`[data-rating="${rating}"]`);
            if (row) {
                const data = distribution[rating] || { count: 0, percent: 0 };
                const percent = typeof data === 'object' ? data.percent : 0;
                
                const bar = row.querySelector('.distribution-bar');
                const percentEl = row.querySelector('.distribution-percent');
                
                if (bar) bar.style.width = `${percent}%`;
                if (percentEl) percentEl.textContent = `${percent.toFixed(0)}%`;
            }
        });
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        const loadingEl = this.container.querySelector('#ratingLoading');
        if (loadingEl) {
            loadingEl.style.display = loading ? 'flex' : 'none';
        }
        
        const stars = this.container.querySelectorAll('.rating-star');
        stars.forEach(star => {
            star.disabled = loading;
            star.style.opacity = loading ? '0.5' : '1';
        });
    }
    
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'info') {
        // Remove existing toast
        const existing = this.container.querySelector('.rating-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `rating-toast rating-toast-${type}`;
        toast.textContent = message;
        
        this.container.querySelector('.rating-widget').appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Export for use in other files
window.RatingsAPI = RatingsAPI;
window.RatingWidget = RatingWidget;
