
import React from 'react';

const TestPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Test Page Loading
          </h1>
          <p className="text-gray-300 text-lg">
            Testing React without complex components
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            React is Working
          </h2>
          <p className="text-gray-600">
            This is a minimal test page without hooks or complex components.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
