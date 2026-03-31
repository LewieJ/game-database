/**
 * Cosmetic Emoji Rating System (v2)
 * 5-emoji reaction system: 🔥😍😐👎💩
 * API: POST/GET /api/ratings/cosmetics/{slug}
 */

// ─── Emoji Tiers ───
const EMOJI_TIERS = [
    { value: 5, emoji: '🔥', label: 'Fire',  color: '#ff4500' },
    { value: 4, emoji: '😍', label: 'Love',  color: '#ff69b4' },
    { value: 3, emoji: '😐', label: 'Meh',   color: '#ffa500' },
    { value: 2, emoji: '👎', label: 'Nah',   color: '#808080' },
    { value: 1, emoji: '💩', label: 'Trash', color: '#8b4513' }
];

function getEmojiTier(value) {
    return EMOJI_TIERS.find(t => t.value === value) || null;
}

function getScoreColor(pct) {
    if (pct === null || pct === undefined) return '#666';
    if (pct >= 80) return '#ff4500';
    if (pct >= 60) return '#ff69b4';
    if (pct >= 40) return '#ffa500';
    if (pct >= 20) return '#808080';
    return '#8b4513';
}

function getScoreTierName(pct) {
    if (pct === null || pct === undefined) return 'none';
    if (pct >= 80) return 'fire';
    if (pct >= 60) return 'love';
    if (pct >= 40) return 'meh';
    if (pct >= 20) return 'nah';
    return 'trash';
}

// ─── API Client ───
const CosmeticRatingsAPI = {
    BASE_URL: 'https://helpbot.marathondb.gg/api/ratings/cosmetics',
    STORAGE_KEY: 'marathondb_device_token',

    getDeviceToken() {
        let token = localStorage.getItem(this.STORAGE_KEY);
        if (token && /^[a-zA-Z0-9]{32,64}$/.test(token)) return token;

        token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
            .map(b => b.toString(36).padStart(2, '0'))
            .join('')
            .substring(0, 48);
        localStorage.setItem(this.STORAGE_KEY, token);
        return token;
    },

    async getRating(slug) {
        try {
            const res = await fetch(`${this.BASE_URL}/${slug}`, {
                cache: 'no-store',
                headers: { 'X-Device-Token': this.getDeviceToken() }
            });
            return await res.json();
        } catch (err) {
            console.error('Error fetching cosmetic rating:', err);
            return { success: false, error: 'network_error' };
        }
    },

    async submitRating(slug, rating, type) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return { success: false, error: 'invalid_rating', message: 'Rating must be 1-5' };
        }
        if (!type) {
            return { success: false, error: 'missing_type', message: 'Cosmetic type is required' };
        }
        try {
            const res = await fetch(`${this.BASE_URL}/${slug}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Token': this.getDeviceToken()
                },
                body: JSON.stringify({ rating, type })
            });
            return await res.json();
        } catch (err) {
            console.error('Error submitting cosmetic rating:', err);
            return { success: false, error: 'network_error' };
        }
    },

    async deleteRating(slug) {
        try {
            const res = await fetch(`${this.BASE_URL}/${slug}`, {
                method: 'DELETE',
                headers: { 'X-Device-Token': this.getDeviceToken() }
            });
            return await res.json();
        } catch (err) {
            console.error('Error deleting cosmetic rating:', err);
            return { success: false, error: 'network_error' };
        }
    },

    async getListRatings(type, options = {}) {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (options.sort) params.append('sort', options.sort);
        if (options.order) params.append('order', options.order);
        if (options.limit) params.append('limit', options.limit);
        if (options.min_votes) params.append('min_votes', options.min_votes);
        try {
            const res = await fetch(`${this.BASE_URL}${params.toString() ? '?' + params : ''}`, {
                cache: 'no-store'
            });
            return await res.json();
        } catch (err) {
            console.error('Error fetching cosmetic ratings list:', err);
            return { success: false, error: 'network_error' };
        }
    },

    async getHottest(options = {}) {
        const params = new URLSearchParams();
        if (options.type) params.append('type', options.type);
        if (options.limit) params.append('limit', options.limit);
        if (options.min_votes) params.append('min_votes', options.min_votes);
        try {
            const res = await fetch(`${this.BASE_URL}/hottest${params.toString() ? '?' + params : ''}`, {
                cache: 'no-store'
            });
            return await res.json();
        } catch (err) {
            console.error('Error fetching hottest cosmetics:', err);
            return { success: false, error: 'network_error' };
        }
    }
};

// ─── Emoji Rating Widget (for detail pages) ───
class EmojiRatingWidget {
    constructor(container, slug, options = {}) {
        this.container = container;
        this.slug = slug;
        this.cosmeticType = options.cosmeticType || 'weapon-skin';
        this.options = {
            onRatingChange: options.onRatingChange || null,
            skinName: options.skinName || 'this skin',
            ...options
        };

        this.scorePercent = null;
        this.totalVotes = 0;
        this.distribution = null;
        this.userRating = null;
        this.isLoading = false;

        this.init();
    }

    async init() {
        this.render();
        await this.fetchRating();
    }

    render() {
        const tierName = getScoreTierName(this.scorePercent);

        this.container.innerHTML = `
            <div class="emoji-rating-widget" data-tier="${tierName}">
                <div class="emoji-rating-header">
                    <h3 class="emoji-rating-title">
                        COMMUNITY RATING
                    </h3>
                    <div class="emoji-rating-votes" id="emojiVotes">
                        <span class="emoji-votes-count">${this.totalVotes}</span> ${this.totalVotes === 1 ? 'vote' : 'votes'}
                    </div>
                </div>

                <div class="emoji-rating-body">
                    <!-- Score Display -->
                    <div class="emoji-score-display" id="emojiScoreDisplay">
                        <span class="emoji-score-number" id="emojiScoreNum">${this.scorePercent !== null ? Math.round(this.scorePercent) + '%' : '—'}</span>
                    </div>

                    <!-- Emoji Buttons -->
                    <div class="emoji-rating-bar" id="emojiBar">
                        ${EMOJI_TIERS.map(t => `
                            <button class="emoji-rate-btn" data-value="${t.value}" title="${t.label}">
                                <span class="emoji-rate-icon">${t.emoji}</span>
                                <span class="emoji-rate-label">${t.label}</span>
                                <span class="emoji-rate-count" id="emojiCount${t.value}">0</span>
                            </button>
                        `).join('')}
                    </div>

                    <!-- Distribution Bars -->
                    <div class="emoji-distribution" id="emojiDistribution">
                        ${EMOJI_TIERS.map(t => `
                            <div class="emoji-dist-row" data-value="${t.value}">
                                <span class="emoji-dist-icon">${t.emoji}</span>
                                <div class="emoji-dist-bar-bg">
                                    <div class="emoji-dist-bar-fill" id="emojiBar${t.value}" style="width: 0%; background-color: ${t.color};"></div>
                                </div>
                                <span class="emoji-dist-count" id="emojiDistCount${t.value}">0</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- User's existing rating -->
                    <div class="emoji-user-rating" id="emojiUserRating" style="display: none;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="emoji-check-icon">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span>Your vote: <strong id="emojiUserVote">—</strong></span>
                        <span class="emoji-change-hint">(click another to change)</span>
                    </div>
                </div>

                <!-- Loading overlay -->
                <div class="emoji-rating-loading" id="emojiLoading" style="display: none;">
                    <div class="loading-spinner small"></div>
                </div>
            </div>
        `;

        this.attachEvents();
    }

    attachEvents() {
        this.container.querySelectorAll('.emoji-rate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const value = parseInt(btn.dataset.value);
                if (value >= 1 && value <= 5) {
                    this.submitVote(value);
                }
            });
        });
    }

    async fetchRating() {
        this.setLoading(true);
        const res = await CosmeticRatingsAPI.getRating(this.slug);

        if (res.success && res.data) {
            this.scorePercent = res.data.score_percent;
            this.totalVotes = res.data.total_votes || 0;
            this.distribution = res.data.distribution || null;
            this.userRating = res.data.user_rating || null;

            this.updateDisplay();

            if (this.userRating !== null) {
                this.highlightUserVote(this.userRating);
            }
        }
        this.setLoading(false);
    }

    async submitVote(value) {
        // If clicking the same emoji again, do nothing
        if (this.userRating === value) return;

        this.setLoading(true);

        // Optimistic: highlight immediately
        this.highlightUserVote(value);

        const res = await CosmeticRatingsAPI.submitRating(this.slug, value, this.cosmeticType);

        if (res.success) {
            this.userRating = value;

            if (res.data) {
                this.scorePercent = res.data.score_percent;
                this.totalVotes = res.data.total_votes || this.totalVotes;
                this.distribution = res.data.distribution || this.distribution;
            }

            this.updateDisplay();
            this.showToast(res.action === 'created' ? 'Vote submitted!' : 'Vote updated!', 'success');

            if (this.options.onRatingChange) {
                this.options.onRatingChange(value, this.scorePercent);
            }
        } else {
            // Revert highlight on error
            if (this.userRating) {
                this.highlightUserVote(this.userRating);
            } else {
                this.container.querySelectorAll('.emoji-rate-btn').forEach(b => b.classList.remove('selected'));
            }
            this.showToast(res.message || 'Failed to submit vote', 'error');
        }
        this.setLoading(false);
    }

    updateDisplay() {
        const tierName = getScoreTierName(this.scorePercent);
        const widget = this.container.querySelector('.emoji-rating-widget');
        if (widget) widget.dataset.tier = tierName;

        // Score
        const scoreNum = this.container.querySelector('#emojiScoreNum');
        if (scoreNum) {
            scoreNum.textContent = this.scorePercent !== null ? Math.round(this.scorePercent) + '%' : '—';
            scoreNum.style.color = getScoreColor(this.scorePercent);
        }

        // Votes badge
        const votesEl = this.container.querySelector('#emojiVotes');
        if (votesEl) {
            votesEl.innerHTML = `<span class="emoji-votes-count">${this.totalVotes}</span> ${this.totalVotes === 1 ? 'vote' : 'votes'}`;
        }

        // Distribution
        if (this.distribution) {
            EMOJI_TIERS.forEach(t => {
                const d = this.distribution[t.value] || { count: 0, percent: 0 };
                const pct = d.percent ?? (this.totalVotes > 0 ? (d.count / this.totalVotes) * 100 : 0);

                // Bar
                const bar = this.container.querySelector(`#emojiBar${t.value}`);
                if (bar) bar.style.width = `${pct}%`;

                // Distribution count
                const distCount = this.container.querySelector(`#emojiDistCount${t.value}`);
                if (distCount) distCount.textContent = d.count;

                // Button count
                const btnCount = this.container.querySelector(`#emojiCount${t.value}`);
                if (btnCount) btnCount.textContent = d.count;
            });
        }
    }

    highlightUserVote(value) {
        // Highlight the selected emoji button
        this.container.querySelectorAll('.emoji-rate-btn').forEach(btn => {
            const v = parseInt(btn.dataset.value);
            btn.classList.toggle('selected', v === value);
        });

        // Show user rating notice
        const userEl = this.container.querySelector('#emojiUserRating');
        const userVoteEl = this.container.querySelector('#emojiUserVote');
        if (userEl && userVoteEl) {
            const tier = getEmojiTier(value);
            userEl.style.display = 'flex';
            userVoteEl.textContent = tier ? `${tier.emoji} ${tier.label}` : '—';
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const el = this.container.querySelector('#emojiLoading');
        if (el) el.style.display = loading ? 'flex' : 'none';
    }

    showToast(message, type = 'info') {
        const existing = this.container.querySelector('.emoji-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `emoji-toast emoji-toast-${type}`;
        toast.textContent = message;
        this.container.querySelector('.emoji-rating-widget').appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

window.CosmeticRatingsAPI = CosmeticRatingsAPI;
window.EmojiRatingWidget = EmojiRatingWidget;
window.EMOJI_TIERS = EMOJI_TIERS;
window.getEmojiTier = getEmojiTier;
window.getScoreColor = getScoreColor;
window.getScoreTierName = getScoreTierName;
