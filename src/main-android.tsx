import React from 'react';
import { createRoot } from 'react-dom/client';
import AndroidApp from './AndroidApp';

// Ultra-minimal Android entry point
console.log('🚀 Android entry point starting');

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

const root = createRoot(container);
root.render(<AndroidApp />);

console.log('✅ Android app rendered');