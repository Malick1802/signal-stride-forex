import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Minimal test app to isolate React issues
const TestApp = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-8 max-w-md mx-auto mt-16 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">React Test</h1>
      <p className="mb-4">Count: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Increment
      </button>
      <p className="mt-4 text-sm text-gray-600">
        If you can click this button and see the count increase, React is working properly.
      </p>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
