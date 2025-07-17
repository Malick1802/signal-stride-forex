
import React from 'react';

console.log('Index.tsx: React object:', React);
console.log('Index.tsx: React version:', React?.version);

const Index = () => {
  console.log('Index component rendering...');
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">ForexAlert Pro - Index Page</h1>
        <p className="text-muted-foreground">App running from Index.tsx</p>
        <div className="mt-4 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">Status</h2>
          <p className="text-green-600">✅ React working from Index page</p>
          <p className="text-green-600">✅ No complex components loaded</p>
          <p className="text-blue-600">🔧 Simplified Index component</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
