// ============================================
// SECURITY MONITORING - OPSIONAL
// ============================================

const SecurityMonitor = {
  failedAttempts: {},
  warnings: [],
  maxWarnings: 10,

  logFailedAttempt(identifier, ip = null) {
    const key = identifier || 'anonymous';
    if (!this.failedAttempts[key]) {
      this.failedAttempts[key] = [];
    }

    this.failedAttempts[key].push({
      timestamp: new Date().toISOString(),
      ip: ip || 'unknown',
      userAgent: navigator.userAgent
    });

    try {
      localStorage.setItem('login_attempts', JSON.stringify(this.failedAttempts));
    } catch (e) {}

    console.warn(`⚠️ Failed login attempt for: ${key}`);

    if (this.failedAttempts[key].length > 5) {
      this.sendAlert(`🚨 Multiple failed login attempts for ${key}`);
    }
  },

  sendAlert(message) {
    const warning = {
      message,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    this.warnings.push(warning);
    if (this.warnings.length > this.maxWarnings) {
      this.warnings.shift();
    }

    console.warn('🔔 SECURITY ALERT:', message);
  },

  reset(identifier) {
    if (identifier) {
      delete this.failedAttempts[identifier];
    } else {
      this.failedAttempts = {};
    }
    try {
      localStorage.removeItem('login_attempts');
    } catch (e) {}
  }
};

window.SecurityMonitor = SecurityMonitor;
console.log('✅ Security monitoring initialized');