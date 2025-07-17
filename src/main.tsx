// Ultra-minimal main.tsx to debug React initialization
console.log('=== MAIN.TSX LOADING ===');

// Check if React is available at import time
try {
  const React = require('react');
  console.log('React imported successfully:', React);
  console.log('React.version:', React.version);
  console.log('React.useState:', typeof React.useState);
  
  const { createRoot } = require('react-dom/client');
  console.log('ReactDOM createRoot imported successfully:', typeof createRoot);
  
  // Import CSS
  require('./index.css');
  
  const rootElement = document.getElementById("root");
  console.log('Root element found:', !!rootElement);
  
  if (rootElement) {
    console.log('Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('Rendering ultra-minimal component...');
    root.render(
      React.createElement('div', {
        style: { 
          padding: '20px', 
          fontFamily: 'sans-serif',
          backgroundColor: '#f0f0f0',
          minHeight: '100vh'
        }
      }, [
        React.createElement('h1', { key: 'title' }, 'ForexAlert Pro - Emergency Mode'),
        React.createElement('p', { key: 'status' }, 'React is working at basic level'),
        React.createElement('p', { key: 'debug' }, 'React version: ' + React.version),
        React.createElement('div', { 
          key: 'info',
          style: { 
            marginTop: '20px', 
            padding: '10px', 
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50' 
          }
        }, [
          React.createElement('h3', { key: 'info-title' }, 'Debug Information'),
          React.createElement('p', { key: 'info-react' }, '✅ React core working'),
          React.createElement('p', { key: 'info-dom' }, '✅ ReactDOM working'),
          React.createElement('p', { key: 'info-render' }, '✅ Basic rendering working')
        ])
      ])
    );
    
    console.log('=== RENDERING COMPLETED ===');
  } else {
    console.error('Root element not found!');
  }
  
} catch (error) {
  console.error('=== CRITICAL ERROR IN MAIN.TSX ===', error);
  
  // Fallback to pure DOM manipulation
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; background: #ffebee;">
        <h1>Critical React Error</h1>
        <p>React failed to initialize properly.</p>
        <p>Error: ${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}
