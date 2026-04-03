/**
 * gdb.gg Feedback Widget
 * Allows users to submit feedback, bug reports, and feature requests
 */

class FeedbackWidget {
  constructor() {
    this.isOpen = false;
    this.apiEndpoint = 'https://gdb.gg/api/feedback'; // Production endpoint
    this.init();
  }

  init() {
    this.injectHTML();
    this.attachEventListeners();
  }

  injectHTML() {
    const widgetHTML = `
      <!-- Feedback Button -->
      <button id="feedback-button" class="feedback-btn" aria-label="Submit Feedback">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Feedback</span>
      </button>

      <!-- Feedback Modal -->
      <div id="feedback-modal" class="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <div class="feedback-modal-content">
          <div class="feedback-header">
            <h2 id="feedback-title">Send Feedback</h2>
            <button id="feedback-close" class="feedback-close" aria-label="Close feedback form">&times;</button>
          </div>

          <form id="feedback-form" class="feedback-form">
            <div class="feedback-field">
              <label for="feedback-category">Category *</label>
              <select id="feedback-category" name="category" required>
                <option value="">Select a category</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="feature">✨ Feature Request</option>
                <option value="improvement">💡 Improvement</option>
                <option value="general">💬 General Feedback</option>
                <option value="other">📝 Other</option>
              </select>
            </div>

            <div class="feedback-field">
              <label for="feedback-message">Message *</label>
              <textarea 
                id="feedback-message" 
                name="message" 
                rows="6" 
                placeholder="Tell us what's on your mind..."
                required
                minlength="5"
                maxlength="2000"
              ></textarea>
              <div class="feedback-char-count">
                <span id="feedback-char-counter">0</span> / 2000 <span class="feedback-min-chars">(minimum 5 characters)</span>
              </div>
            </div>

            <div class="feedback-field">
              <label for="feedback-epic-id">In-game username (optional)</label>
              <input 
                type="text" 
                id="feedback-epic-id" 
                name="epicId" 
                placeholder="Your in-game name"
                maxlength="50"
              >
              <small>🏆 Users who help improve the site will be granted achievements/awards in the future!</small>
            </div>

            <div class="feedback-field">
              <label for="feedback-email">Email (optional)</label>
              <input 
                type="email" 
                id="feedback-email" 
                name="email" 
                placeholder="your@email.com (for follow-up)"
              >
              <small>We'll only use this to respond to your feedback</small>
            </div>

            <div class="feedback-actions">
              <button type="button" id="feedback-cancel" class="feedback-btn-secondary">Cancel</button>
              <button type="submit" id="feedback-submit" class="feedback-btn-primary">
                <span class="feedback-submit-text">Send Feedback</span>
                <span class="feedback-submit-loading" style="display: none;">
                  <svg class="feedback-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                  </svg>
                  Sending...
                </span>
              </button>
            </div>

            <div id="feedback-status" class="feedback-status" style="display: none;"></div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  attachEventListeners() {
    const button = document.getElementById('feedback-button');
    const modal = document.getElementById('feedback-modal');
    const closeBtn = document.getElementById('feedback-close');
    const cancelBtn = document.getElementById('feedback-cancel');
    const form = document.getElementById('feedback-form');
    const messageField = document.getElementById('feedback-message');
    const charCounter = document.getElementById('feedback-char-counter');

    // Open modal
    button.addEventListener('click', () => this.openModal());

    // Close modal
    closeBtn.addEventListener('click', () => this.closeModal());
    cancelBtn.addEventListener('click', () => this.closeModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.closeModal();
    });

    // Character counter
    messageField.addEventListener('input', () => {
      charCounter.textContent = messageField.value.length;
    });

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitFeedback();
    });
  }

  openModal() {
    const modal = document.getElementById('feedback-modal');
    modal.classList.add('feedback-modal-open');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
      document.getElementById('feedback-category').focus();
    }, 100);
  }

  closeModal() {
    const modal = document.getElementById('feedback-modal');
    modal.classList.remove('feedback-modal-open');
    this.isOpen = false;
    document.body.style.overflow = '';
    this.resetForm();
  }

  resetForm() {
    const form = document.getElementById('feedback-form');
    form.reset();
    document.getElementById('feedback-char-counter').textContent = '0';
    this.hideStatus();
  }

  async submitFeedback() {
    const form = document.getElementById('feedback-form');
    const submitBtn = document.getElementById('feedback-submit');
    const submitText = submitBtn.querySelector('.feedback-submit-text');
    const submitLoading = submitBtn.querySelector('.feedback-submit-loading');

    // Get form data
    const formData = {
      category: document.getElementById('feedback-category').value,
      message: document.getElementById('feedback-message').value,
      epicId: document.getElementById('feedback-epic-id').value || null,
      email: document.getElementById('feedback-email').value || null,
      page: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: 'gdb'
    };

    // Frontend validation
    const validationErrors = this.validateFeedback(formData);
    if (validationErrors.length > 0) {
      this.showStatus('error', '✗ ' + validationErrors.join('. '));
      return;
    }

    // Disable form
    submitBtn.disabled = true;
    submitText.style.display = 'none';
    submitLoading.style.display = 'inline-flex';

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.showStatus('success', '✓ Feedback sent successfully! Thank you for helping us improve.');
        setTimeout(() => {
          this.closeModal();
        }, 2000);
      } else {
        // Handle specific error codes
        let errorMessage = result.error || 'Failed to submit feedback';
        
        if (response.status === 429) {
          errorMessage = 'You\'ve submitted too much feedback recently. Please try again in an hour.';
        } else if (response.status === 400) {
          errorMessage = result.error || 'Invalid input. Please check your submission.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.showStatus('error', '✗ ' + errorMessage);
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      this.showStatus('error', '✗ Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      submitLoading.style.display = 'none';
    }
  }

  validateFeedback(data) {
    const errors = [];
    
    // Category validation
    const validCategories = ['bug', 'feature', 'improvement', 'general', 'other'];
    if (!data.category || !validCategories.includes(data.category)) {
      errors.push('Please select a valid category');
    }
    
    // Message validation
    if (!data.message || data.message.trim().length < 5) {
      errors.push('Message must be at least 5 characters');
    }
    if (data.message && data.message.length > 2000) {
      errors.push('Message must be less than 2000 characters');
    }
    
    // Email validation (if provided)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Please enter a valid email address');
    }
    
    return errors;
  }

  showStatus(type, message) {
    const status = document.getElementById('feedback-status');
    status.className = `feedback-status feedback-status-${type}`;
    status.textContent = message;
    status.style.display = 'block';
  }

  hideStatus() {
    const status = document.getElementById('feedback-status');
    status.style.display = 'none';
  }
}

// Initialize feedback widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FeedbackWidget();
  });
} else {
  new FeedbackWidget();
}
