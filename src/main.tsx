
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import extensionDetector from './utils/extensionDetector'
import reactRecovery from './utils/reactRecovery'

// Initialize protection systems immediately
extensionDetector.init();
reactRecovery.init();

// Create a React reference holder that can't be nullified
const ReactHolder = {
  _react: null as any,
  _useState: null as any,
  
  get React() {
    if (!this._react) {
      return null;
    }
    return this._react;
  },
  
  set React(value: any) {
    if (value && value.useState) {
      this._react = value;
      this._useState = value.useState;
      // Ensure global React is protected
      if (typeof window !== 'undefined') {
        try {
          window.React = value;
          Object.defineProperty(window, 'React', {
            get: () => this._react,
            set: (newValue) => {
              if (newValue === null || newValue === undefined) {
                console.warn('🛡️ Blocked attempt to nullify React');
                return;
              }
              this._react = newValue;
            },
            configurable: false
          });
        } catch (error) {
          console.warn('Could not protect window.React:', error);
        }
      }
    }
  },
  
  get useState() {
    return this._useState;
  }
};

// Enhanced React protection against extension interference
if (typeof window !== 'undefined') {
  // Clear any extension-injected React references
  delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  
  // Protect React from being completely nullified
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
    if (prop === 'React' && obj === window && (descriptor.value === null || descriptor.value === undefined)) {
      console.warn('🛡️ Prevented React nullification attempt');
      return obj;
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  // Set up React holder
  import('react').then((React) => {
    ReactHolder.React = React;
    console.log('✅ React protection system initialized');
  }).catch((error) => {
    console.error('❌ Failed to initialize React protection:', error);
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
    let React, ReactDOM;
    
    try {
      React = await import('react');
      ReactDOM = await import('react-dom/client');
      
      // Update the React holder
      ReactHolder.React = React;
      
      if (!React.useState) {
        throw new Error('React hooks are not available - extension conflict detected');
      }
    } catch (importError) {
      console.error('❌ Failed to import React modules:', importError);
      throw new Error('React modules failed to load');
    }

    const root = ReactDOM.createRoot(rootElement);
    
    // Wrap App in error boundary
    const SafeApp = () => {
      try {
        return React.createElement(App);
      } catch (error) {
        console.error('❌ App rendering failed:', error);
        return React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e293b 0%, #1e40af 100%)',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textAlign: 'center',
            padding: '20px'
          }
        }, [
          React.createElement('div', { key: 'error-content' }, [
            React.createElement('h1', { key: 'title', style: { fontSize: '1.8rem', marginBottom: '1rem' } }, '⚠️ App Error'),
            React.createElement('p', { key: 'message' }, 'The app encountered an error. Please disable browser extensions and refresh.')
          ])
        ]);
      }
    };
    
    root.render(React.createElement(SafeApp));
    
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
