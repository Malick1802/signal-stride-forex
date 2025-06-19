
import React from 'react';
import TestSignalGeneration from '@/components/TestSignalGeneration';

const TestPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Signal Generation Testing
          </h1>
          <p className="text-gray-300 text-lg">
            Test the improved signal generation system with Phase 1 & 2 optimizations
          </p>
        </div>
        
        <TestSignalGeneration />
      </div>
    </div>
  );
};

export default TestPage;
