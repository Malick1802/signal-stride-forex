
import React from 'react';

const App: React.FC = () => {
  console.log('App component rendering...');
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">ForexAlert Pro</h1>
        <p>Application is loading...</p>
      </div>
    </div>
  );
};

export default App;
