import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

console.log('main.tsx: React object:', React);
console.log('main.tsx: React version:', React?.version);

// Test if React hooks work at this level
try {
  const TestComponent = () => {
    console.log('TestComponent rendering...');
    const [test] = React.useState('working');
    return React.createElement('div', null, `React hooks ${test}`);
  };
  
  console.log('main.tsx: About to render TestComponent');
  
  createRoot(document.getElementById("root")!).render(
    React.createElement(React.StrictMode, null,
      React.createElement(TestComponent)
    )
  );
  
  console.log('main.tsx: Rendering completed successfully');
} catch (error) {
  console.error('main.tsx: Error during render:', error);
  
  // Fallback to minimal HTML if React fails
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>React Initialization Error</h1>
        <p>Error: ${error.message}</p>
        <p>Check the console for more details.</p>
      </div>
    `;
  }
}
