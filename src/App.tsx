import React from 'react';

// Import mobile app CSS
import './mobile-app.css';

const App = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">ForexAlert Pro</h1>
        <p className="text-muted-foreground">Mobile app is loading successfully...</p>
        <div className="mt-4 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">Status</h2>
          <p className="text-green-600">✅ React initialized correctly</p>
          <p className="text-green-600">✅ Mobile app running</p>
        </div>
      </div>
    </div>
  );
};

export default App;