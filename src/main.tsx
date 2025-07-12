import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import extensionDetector from './utils/extensionDetector'

// Initialize extension detection
extensionDetector.init();

// Force clear any cached React references that extensions might have corrupted
if (typeof window !== 'undefined') {
  // Clear any extension-injected React references
  delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  
  // Ensure React is properly available
  import('react').then((React) => {
    (window as any).React = React;
  });
}

// Defensive React rendering with extension conflict handling
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  // Clear any existing content that might be causing conflicts
  rootElement.innerHTML = '';

  const root = createRoot(rootElement);
  root.render(<App />);
  
  console.log('🚀 ForexAlert Pro initialized successfully');
} catch (error) {
  console.error('🚨 Failed to initialize app:', error);
  
  // Fallback error display
  document.body.innerHTML = `
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
      <div>
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">ForexAlert Pro</h1>
        <p style="margin-bottom: 1rem;">Unable to start due to browser extension conflict</p>
        <button onclick="window.location.reload()" style="
          background: #10b981; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
        ">Reload Page</button>
        <br><br>
        <small style="opacity: 0.7;">Try disabling browser extensions or use incognito mode</small>
      </div>
    </div>
  `;
}
