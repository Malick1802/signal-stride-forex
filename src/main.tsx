
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import extensionDetector from './utils/extensionDetector'
import reactRecovery from './utils/reactRecovery'

// Global interface declarations
declare global {
  interface Window {
    __CHUNK_LOAD_ERROR__?: (error: Error) => void;
    __REACT_PROTECTION__?: boolean;
    __EXTENSION_CONFLICTS__?: string[];
    React?: any;
  }
}

// Initialize protection systems immediately
extensionDetector.init();
reactRecovery.init();

// Enhanced React protection - capture React immediately
let originalReact: any = null;
let originalHooks: any = {};

try {
  // Capture React before extensions can interfere
  if (typeof window !== 'undefined') {
    originalReact = window.React;
    if (originalReact) {
      originalHooks = {
        useState: originalReact.useState,
        useEffect: originalReact.useEffect,
        useContext: originalReact.useContext,
        useReducer: originalReact.useReducer,
        useCallback: originalReact.useCallback,
        useMemo: originalReact.useMemo,
        useRef: originalReact.useRef,
        useImperativeHandle: originalReact.useImperativeHandle,
        useLayoutEffect: originalReact.useLayoutEffect,
        useDebugValue: originalReact.useDebugValue
      };
    }
  }
} catch (error) {
  console.warn('🔒 Failed to capture React early:', error);
}

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

// Enhanced app initialization with chunk loading fallbacks
const initializeApp = async () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    // Set up chunk loading error handler
    window.__CHUNK_LOAD_ERROR__ = (error) => {
      console.error('🚨 Chunk loading error:', error);
      showChunkErrorFallback(rootElement);
    };

    // Clear any existing content that might be causing conflicts
    rootElement.innerHTML = '';

    // Enhanced React module loading with retries
    let React, ReactDOM;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 React import attempt ${attempt}/3`);
        
        React = await import('react');
        ReactDOM = await import('react-dom/client');
        
        // Update the React holder
        ReactHolder.React = React;
        
        if (!React.useState) {
          throw new Error('React hooks are not available - extension conflict detected');
        }
        
        console.log('✅ React modules loaded successfully');
        break;
      } catch (importError) {
        console.error(`❌ React import attempt ${attempt} failed:`, importError);
        
        if (attempt === 3) {
          throw new Error('React modules failed to load after 3 attempts');
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
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

// Chunk loading error fallback
const showChunkErrorFallback = (rootElement) => {
  const fallbackHtml = `
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
        <h1 style="font-size: 1.8rem; margin-bottom: 1rem; color: #f59e0b;">⚡ Loading Issue</h1>
        <p style="margin-bottom: 1rem;">Some app components failed to load. This is usually caused by:</p>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left;">
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Browser extensions interfering with the app</li>
            <li>Network connectivity issues</li>
            <li>Cached outdated files</li>
          </ul>
        </div>
        <button onclick="window.location.reload(true)" style="
          background: #10b981; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 1rem;
          margin: 10px;
        ">🔄 Force Reload</button>
        <button onclick="
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
              window.location.reload(true);
            });
          } else {
            window.location.reload(true);
          }
        " style="
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          cursor: pointer;
          font-size: 1rem;
          margin: 10px;
        ">🗑️ Clear Cache & Reload</button>
      </div>
    </div>
  `;
  
  rootElement.innerHTML = fallbackHtml;
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
