// Logging middleware for extensive logging integration as required
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
  }

  // Format log entry with timestamp and context
  formatLogEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('app_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('app_session_id', sessionId);
    }
    return sessionId;
  }

  // Log info level messages
  info(message, context = {}) {
    const logEntry = this.formatLogEntry('info', message, context);
    console.info(`[${logEntry.timestamp}] INFO:`, message, context);
    this.addToMemoryLog(logEntry);
  }

  // Log warning level messages
  warn(message, context = {}) {
    const logEntry = this.formatLogEntry('warn', message, context);
    console.warn(`[${logEntry.timestamp}] WARN:`, message, context);
    this.addToMemoryLog(logEntry);
  }

  // Log error level messages
  error(message, context = {}) {
    const logEntry = this.formatLogEntry('error', message, context);
    console.error(`[${logEntry.timestamp}] ERROR:`, message, context);
    this.addToMemoryLog(logEntry);
  }

  // Log debug level messages
  debug(message, context = {}) {
    const logEntry = this.formatLogEntry('debug', message, context);
    console.debug(`[${logEntry.timestamp}] DEBUG:`, message, context);
    this.addToMemoryLog(logEntry);
  }

  // Log API requests
  logApiRequest(method, url, payload = null) {
    this.info('API Request initiated', {
      method,
      url,
      payload,
      requestId: 'req_' + Date.now()
    });
  }

  // Log API responses
  logApiResponse(method, url, status, response = null, duration = null) {
    const level = status >= 400 ? 'error' : 'info';
    this[level]('API Response received', {
      method,
      url,
      status,
      response,
      duration: duration ? `${duration}ms` : null
    });
  }

  // Log user interactions
  logUserAction(action, details = {}) {
    this.info('User action performed', {
      action,
      details,
      timestamp: Date.now()
    });
  }

  // Log application state changes
  logStateChange(component, previousState, newState) {
    this.debug('State change occurred', {
      component,
      previousState,
      newState
    });
  }

  // Add log to memory storage
  addToMemoryLog(logEntry) {
    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Store in localStorage for persistence across sessions
    try {
      const storedLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      storedLogs.push(logEntry);
      
      // Keep only last 500 logs in localStorage to prevent storage overflow
      const trimmedLogs = storedLogs.slice(-500);
      localStorage.setItem('app_logs', JSON.stringify(trimmedLogs));
    } catch (e) {
      console.warn('Failed to store log in localStorage:', e);
    }
  }

  // Get all logs from memory
  getLogs() {
    return [...this.logs];
  }

  // Get logs from localStorage
  getStoredLogs() {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch (e) {
      console.warn('Failed to retrieve logs from localStorage:', e);
      return [];
    }
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('app_logs');
    this.info('Logs cleared');
  }

  // Export logs as JSON
  exportLogs() {
    const allLogs = this.getStoredLogs();
    const dataStr = JSON.stringify(allLogs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `app_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.info('Logs exported');
  }
}

// Create singleton instance
const logger = new Logger();

// Log application startup
logger.info('Application initialized', {
  appName: 'URL Shortener',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
});

export default logger;