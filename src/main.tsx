import React from 'react'
import { createRoot } from 'react-dom/client'

// COMPLETELY ISOLATED TEST - NO CSS IMPORTS AT ALL
const IsolatedTestApp = () => {
  console.log('IsolatedTestApp rendering...');
  console.log('React object:', React);
  console.log('React.useState:', React.useState);
  
  const [count, setCount] = React.useState(0);
  
  return React.createElement('div', { 
    style: { 
      padding: '32px', 
      fontFamily: 'sans-serif',
      maxWidth: '400px',
      margin: '64px auto',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }
  }, [
    React.createElement('h1', { 
      key: 'title',
      style: { fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }
    }, 'React Isolation Test'),
    React.createElement('p', { 
      key: 'count',
      style: { marginBottom: '16px' }
    }, `Count: ${count}`),
    React.createElement('button', {
      key: 'button',
      onClick: () => {
        console.log('Button clicked, incrementing count');
        setCount(c => c + 1);
      },
      style: {
        padding: '8px 16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }
    }, 'Increment'),
    React.createElement('p', { 
      key: 'description',
      style: { marginTop: '16px', fontSize: '14px', color: '#666' }
    }, 'If this works, React hooks are functioning properly.')
  ]);
};

console.log('About to render isolated test app...');
createRoot(document.getElementById("root")!).render(
  React.createElement(React.StrictMode, {}, 
    React.createElement(IsolatedTestApp, {})
  )
);
