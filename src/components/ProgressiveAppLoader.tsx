
import React from 'react';

const ProgressiveAppLoader: React.FC = () => {
  console.log('🚀 ProgressiveAppLoader: Rendering minimal app');

  // Absolute minimal React app without any external libraries
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333' }}>React is Working</h1>
      <p style={{ color: '#666' }}>
        This is a minimal React component without any external dependencies.
      </p>
      <p style={{ color: '#666' }}>
        Current time: {new Date().toLocaleString()}
      </p>
      <button 
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer' 
        }}
        onClick={() => alert('React is working!')}
      >
        Test Button
      </button>
    </div>
  );
};

export default ProgressiveAppLoader;
