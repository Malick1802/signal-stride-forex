import React from 'react'
import { createRoot } from 'react-dom/client'

// DIRECT IMPORT - Bypass all exports to avoid any bundling issues
console.log('=== DIRECT ULTRA MINIMAL TEST STARTING ===');

function DirectMinimalTest() {
  console.log('DirectMinimalTest rendering...');
  
  try {
    const [working, setWorking] = React.useState(true);
    
    return React.createElement('div', { 
      style: { 
        padding: '40px', 
        textAlign: 'center',
        fontFamily: 'system-ui',
        backgroundColor: working ? '#d4edda' : '#f8d7da',
        color: working ? '#155724' : '#721c24',
        border: `3px solid ${working ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '8px',
        margin: '20px'
      }
    }, [
      React.createElement('h1', { key: 'h1' }, working ? '✅ DIRECT React useState WORKS!' : '❌ React useState FAILED'),
      React.createElement('p', { key: 'p' }, 'This bypasses ALL app components and bundling.'),
      React.createElement('button', { 
        key: 'btn',
        onClick: () => setWorking(!working),
        style: {
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, 'Toggle Status')
    ]);
  } catch (error) {
    console.error('useState failed:', error);
    return React.createElement('div', {
      style: { color: 'red', padding: '20px' }
    }, `Error: ${error.message}`);
  }
}

try {
  console.log('Creating root directly...');
  const root = createRoot(document.getElementById("root")!);
  console.log('Root created, rendering direct test...');
  root.render(React.createElement(DirectMinimalTest));
  console.log('✅ DIRECT TEST SUCCESS');
} catch (error) {
  console.error('❌ DIRECT TEST FAILED:', error);
}
