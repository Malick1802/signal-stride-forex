
import React from 'react';

// Simple fallback component - just renders children without additional wrapping
const ProgressiveAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default ProgressiveAuthProvider;
