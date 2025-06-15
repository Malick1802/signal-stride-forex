
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import AppContent from '../components/AppContent';

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
