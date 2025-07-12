
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import extensionDetector from './utils/extensionDetector'

// Initialize extension detection
extensionDetector.init();

// Enhanced React protection against extension interference
if (typeof window !== 'undefined') {
  // Clear any extension-injected React references
  delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  
  // Ensure React hooks are properly available
  import('react').then((React) => {
    // Protect React from being nullified
    Object.defineProperty(window, 'React', {
      value: React,
      writable: false,
      configurable: false
    });
    
    // Ensure useState is available
    if (!React.useState) {
      console.error('🚨 Critical: React.useState is not available');
    }
  });
}

// Defensive React rendering with comprehensive error handling
const initializeApp = async () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    // Clear any existing content that might be causing conflicts
    rootElement.innerHTML = '';

    // Verify React is available before creating root
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');
    
    if (!React.useState) {
      throw new Error('React hooks are not available - extension conflict detected');
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    
    console.log('✅ ForexAlert Pro initialized successfully');
  } catch (error) {
    console.error('🚨 Failed to initialize app:', error);
    
    // Enhanced fallback error display with extension guidance
    const errorHtml = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 100vh; 
        background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%);
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="max-width: 500px;">
          <h1 style="font-size: 1.8rem; margin-bottom: 1rem; color: #ef4444;">⚠️ App Loading Failed</h1>
          <p style="margin-bottom: 1rem; font-size: 1.1rem;">Browser extension conflict detected</p>
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left;">
            <h3 style="color: #fbbf24; margin: 0 0 8px 0;">🔧 Quick Fix:</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Disable browser extensions (especially shopping/coupon extensions)</li>
              <li>Use incognito/private browsing mode</li>
              <li>Clear browser cache and cookies</li>
              <li>Try a different browser</li>
            </ul>
          </div>
          <button onclick="window.location.reload()" style="
            background: #10b981; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 1rem;
            margin: 10px;
          ">🔄 Reload Page</button>
          <button onclick="window.open(window.location.href, '_blank')" style="
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 1rem;
            margin: 10px;
          ">🔗 Open in New Tab</button>
          <br><br>
          <details style="text-align: left; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 4px;">
            <summary style="cursor: pointer; color: #94a3b8;">🐛 Technical Details</summary>
            <pre style="margin-top: 8px; font-size: 0.8rem; color: #e2e8f0; overflow-x: auto;">${error.message}</pre>
          </details>
        </div>
      </div>
    `;
    
    document.body.innerHTML = errorHtml;
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
