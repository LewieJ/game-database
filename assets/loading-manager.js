// Standardized Loading States for gdb.gg
// Provides consistent loading indicators across all platforms

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.loadingDelayTimers = new Map();
  }

  // Show loading state in a container
  show(container, options = {}) {
    if (!container) return;

    const {
      type = 'spinner', // 'spinner', 'skeleton', 'bar'
      message = 'Loading...',
      delay = CONFIG?.UI?.LOADING_DELAY || 200,
      overlay = false
    } = options;

    const loaderId = this.generateLoaderId(container);

    // Clear any existing delay timer
    if (this.loadingDelayTimers.has(loaderId)) {
      clearTimeout(this.loadingDelayTimers.get(loaderId));
    }

    // Add delay to prevent flash of loading state for fast requests
    const timer = setTimeout(() => {
      this._showLoader(container, type, message, overlay, loaderId);
      this.loadingDelayTimers.delete(loaderId);
    }, delay);

    this.loadingDelayTimers.set(loaderId, timer);
    this.activeLoaders.add(loaderId);

    return loaderId;
  }

  // Internal method to show loader
  _showLoader(container, type, message, overlay, loaderId) {
    if (!this.activeLoaders.has(loaderId)) return;

    const loaderEl = document.createElement('div');
    loaderEl.className = `rnk-loader ${overlay ? 'rnk-loader-overlay' : ''}`;
    loaderEl.dataset.loaderId = loaderId;

    switch (type) {
      case 'spinner':
        loaderEl.innerHTML = this.getSpinnerHTML(message);
        break;
      case 'skeleton':
        loaderEl.innerHTML = this.getSkeletonHTML();
        break;
      case 'bar':
        loaderEl.innerHTML = this.getBarHTML(message);
        break;
      default:
        loaderEl.innerHTML = this.getSpinnerHTML(message);
    }

    if (overlay) {
      container.style.position = 'relative';
    }

    container.appendChild(loaderEl);
  }

  // Hide loading state
  hide(container, loaderId = null) {
    if (!container) return;

    // If loaderId provided, remove specific loader
    if (loaderId) {
      // Clear delay timer if still pending
      if (this.loadingDelayTimers.has(loaderId)) {
        clearTimeout(this.loadingDelayTimers.get(loaderId));
        this.loadingDelayTimers.delete(loaderId);
      }

      this.activeLoaders.delete(loaderId);
      
      const loader = container.querySelector(`[data-loader-id="${loaderId}"]`);
      if (loader) {
        loader.classList.add('rnk-loader-fade-out');
        setTimeout(() => loader.remove(), 200);
      }
    } 
    // Otherwise remove all loaders in container
    else {
      const loaders = container.querySelectorAll('.rnk-loader');
      loaders.forEach(loader => {
        const id = loader.dataset.loaderId;
        if (id) {
          this.activeLoaders.delete(id);
          if (this.loadingDelayTimers.has(id)) {
            clearTimeout(this.loadingDelayTimers.get(id));
            this.loadingDelayTimers.delete(id);
          }
        }
        loader.classList.add('rnk-loader-fade-out');
        setTimeout(() => loader.remove(), 200);
      });
    }
  }

  // Generate unique loader ID
  generateLoaderId(container) {
    return `loader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Spinner HTML
  getSpinnerHTML(message) {
    return `
      <div class="rnk-spinner-container">
        <div class="rnk-spinner">
          <div class="rnk-spinner-ring"></div>
          <div class="rnk-spinner-ring"></div>
          <div class="rnk-spinner-ring"></div>
        </div>
        ${message ? `<p class="rnk-spinner-message">${message}</p>` : ''}
      </div>
    `;
  }

  // Skeleton loader HTML
  getSkeletonHTML() {
    return `
      <div class="rnk-skeleton">
        <div class="rnk-skeleton-header"></div>
        <div class="rnk-skeleton-line"></div>
        <div class="rnk-skeleton-line"></div>
        <div class="rnk-skeleton-line short"></div>
      </div>
    `;
  }

  // Progress bar HTML
  getBarHTML(message) {
    return `
      <div class="rnk-progress-container">
        ${message ? `<p class="rnk-progress-message">${message}</p>` : ''}
        <div class="rnk-progress-bar">
          <div class="rnk-progress-fill"></div>
        </div>
      </div>
    `;
  }

  // Show loading state on specific element (e.g., button)
  showOnElement(element, text = 'Loading...') {
    if (!element) return;

    element.dataset.originalContent = element.innerHTML;
    element.disabled = true;
    element.classList.add('rnk-loading');
    element.innerHTML = `
      <span class="rnk-button-spinner"></span>
      <span>${text}</span>
    `;
  }

  // Hide loading state on element
  hideOnElement(element) {
    if (!element) return;

    element.disabled = false;
    element.classList.remove('rnk-loading');
    
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
  }

  // Wrapper for async operations with automatic loading state
  async wrap(container, asyncFn, options = {}) {
    const loaderId = this.show(container, options);
    
    try {
      const result = await asyncFn();
      this.hide(container, loaderId);
      return result;
    } catch (error) {
      this.hide(container, loaderId);
      throw error;
    }
  }
}

// Create global loading manager instance
const loadingManager = new LoadingManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LoadingManager, loadingManager };
}
