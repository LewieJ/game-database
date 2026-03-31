// Standardized Error Handling for gdb.gg
// Provides consistent error handling across all platforms

class ErrorHandler {
  constructor() {
    this.errorContainer = null;
    this.toastContainer = null;
    this.initErrorUI();
  }

  // Initialize error UI elements
  initErrorUI() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('rnk-toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'rnk-toast-container';
      toastContainer.className = 'rnk-toast-container';
      document.body.appendChild(toastContainer);
      this.toastContainer = toastContainer;
    } else {
      this.toastContainer = document.getElementById('rnk-toast-container');
    }
  }

  // Handle API errors with appropriate user messaging
  handleError(error, context = {}) {
    const errorInfo = this.parseError(error);
    
    // Log error for debugging (if enabled)
    if (CONFIG?.FEATURES?.ENABLE_DEBUG_MODE || CONFIG?.DEV?.LOG_LEVEL === 'debug') {
      console.error('[RNK Error]', {
        message: errorInfo.message,
        code: errorInfo.code,
        context,
        originalError: error
      });
    }

    // Report error (if error reporting enabled)
    if (CONFIG?.FEATURES?.ENABLE_ERROR_REPORTING) {
      this.reportError(errorInfo, context);
    }

    // Show user-friendly error message
    this.showError(errorInfo.userMessage, errorInfo.type);

    return errorInfo;
  }

  // Parse error into structured format
  parseError(error) {
    let code = 'UNKNOWN';
    let message = 'An unexpected error occurred';
    let userMessage = CONFIG?.ERRORS?.GENERIC || 'Something went wrong. Please try again.';
    let type = 'error';

    if (!error) {
      return { code, message, userMessage, type };
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      code = 'NETWORK_ERROR';
      message = 'Network request failed';
      userMessage = CONFIG?.ERRORS?.NETWORK || 'Network error. Please check your connection.';
    }
    // Timeout errors
    else if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      code = 'TIMEOUT';
      message = 'Request timed out';
      userMessage = CONFIG?.ERRORS?.TIMEOUT || 'Request timed out. Please try again.';
    }
    // HTTP errors
    else if (error.status) {
      code = `HTTP_${error.status}`;
      
      switch (error.status) {
        case 400:
          message = 'Bad request';
          userMessage = CONFIG?.ERRORS?.INVALID_INPUT || 'Invalid input. Please check your entry.';
          break;
        case 404:
          message = 'Resource not found';
          userMessage = CONFIG?.ERRORS?.NOT_FOUND || 'The requested resource was not found.';
          type = 'warning';
          break;
        case 429:
          message = 'Rate limit exceeded';
          userMessage = CONFIG?.ERRORS?.RATE_LIMIT || 'Too many requests. Please wait a moment.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          message = 'Server error';
          userMessage = CONFIG?.ERRORS?.SERVER_ERROR || 'Server error. Please try again later.';
          break;
        default:
          message = `HTTP error ${error.status}`;
          userMessage = error.statusText || CONFIG?.ERRORS?.GENERIC;
      }
    }
    // Custom application errors
    else if (error.code) {
      code = error.code;
      message = error.message || message;
      userMessage = error.userMessage || CONFIG?.ERRORS?.GENERIC;
    }
    // Generic errors
    else if (error.message) {
      message = error.message;
    }

    return { code, message, userMessage, type };
  }

  // Show error message to user
  showError(message, type = 'error') {
    this.showToast(message, type);
  }

  // Show toast notification
  showToast(message, type = 'info', duration = null) {
    const toast = document.createElement('div');
    toast.className = `rnk-toast rnk-toast-${type}`;
    
    const icon = this.getToastIcon(type);
    toast.innerHTML = `
      <span class="rnk-toast-icon">${icon}</span>
      <span class="rnk-toast-message">${message}</span>
      <button class="rnk-toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    this.toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('rnk-toast-show'), 10);

    // Auto remove
    const toastDuration = duration || CONFIG?.UI?.TOAST_DURATION || 3000;
    setTimeout(() => {
      toast.classList.remove('rnk-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, toastDuration);
  }

  // Get icon for toast type
  getToastIcon(type) {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return 'ℹ';
    }
  }

  // Display inline error in a container
  showInlineError(container, message, type = 'error') {
    if (!container) return;

    const errorEl = document.createElement('div');
    errorEl.className = `rnk-inline-error rnk-inline-${type}`;
    errorEl.innerHTML = `
      <div class="rnk-inline-error-icon">${this.getToastIcon(type)}</div>
      <div class="rnk-inline-error-message">${message}</div>
    `;

    // Clear existing content
    container.innerHTML = '';
    container.appendChild(errorEl);
  }

  // Clear inline errors from container
  clearInlineError(container) {
    if (!container) return;
    const errorEl = container.querySelector('.rnk-inline-error');
    if (errorEl) errorEl.remove();
  }

  // Report error to analytics/monitoring service
  reportError(errorInfo, context) {
    // Placeholder for error reporting service integration
    // Could integrate with Sentry, LogRocket, or custom analytics
    if (CONFIG?.DEV?.LOG_LEVEL === 'debug') {
      console.log('[Error Report]', { errorInfo, context, timestamp: new Date().toISOString() });
    }
  }

  // Retry handler for failed requests
  async retry(fn, options = {}) {
    const {
      maxAttempts = CONFIG?.API?.RETRY_ATTEMPTS || 3,
      delay = 1000,
      backoff = 2,
      onRetry = null
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const waitTime = delay * Math.pow(backoff, attempt - 1);
        
        if (onRetry) {
          onRetry(attempt, maxAttempts, waitTime);
        }

        if (CONFIG?.DEV?.LOG_LEVEL === 'debug') {
          console.log(`Retry attempt ${attempt}/${maxAttempts} after ${waitTime}ms`);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler, errorHandler };
}
