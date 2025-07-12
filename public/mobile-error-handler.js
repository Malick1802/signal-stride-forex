// Mobile error handler - loads before React
(function() {
  console.log('📱 Mobile error handler loaded');
  
  // Block browser extension scripts
  if (window.chrome) {
    window.chrome = undefined;
  }
  if (window.browser) {
    window.browser = undefined;
  }
  
  // Global error handler for mobile
  window.addEventListener('error', function(e) {
    console.error('📱 Global error:', e.error);
    
    // Block extension-related errors
    if (e.message && (
      e.message.includes('extension') ||
      e.message.includes('message port') ||
      e.message.includes('chrome-extension') ||
      e.filename && e.filename.includes('extension')
    )) {
      console.log('📱 Blocked extension error:', e.message);
      e.preventDefault();
      return false;
    }
  });
  
  // Block unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && (
      e.reason.message.includes('extension') ||
      e.reason.message.includes('message port') ||
      e.reason.message.includes('chrome-extension')
    )) {
      console.log('📱 Blocked extension promise rejection:', e.reason.message);
      e.preventDefault();
      return false;
    }
  });
  
  console.log('📱 Mobile error handler initialized');
})();