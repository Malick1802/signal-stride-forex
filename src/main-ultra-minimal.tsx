// ULTRA MINIMAL React test - no dependencies at all
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('=== ULTRA MINIMAL TEST STARTING ===');
console.log('React:', React);
console.log('React.useState:', React.useState);

function UltraMinimalTest() {
  console.log('UltraMinimalTest rendering...');
  
  // Test useState directly
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
    React.createElement('h1', { key: 'h1' }, working ? '✅ React useState WORKS!' : '❌ React useState FAILED'),
    React.createElement('p', { key: 'p' }, 'This is the most minimal possible React test.'),
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
}

try {
  console.log('Creating root...');
  const root = createRoot(document.getElementById("root")!);
  console.log('Root created, rendering...');
  root.render(React.createElement(UltraMinimalTest));
  console.log('✅ ULTRA MINIMAL TEST SUCCESS');
} catch (error) {
  console.error('❌ ULTRA MINIMAL TEST FAILED:', error);
}