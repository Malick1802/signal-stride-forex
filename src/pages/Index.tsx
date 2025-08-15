
import React, { useState } from 'react';
import AppContent from '../components/AppContent';

const Index = () => {
  const [activeTab, setActiveTab] = useState('signals');

  return (
    <AppContent activeTab={activeTab} onTabChange={setActiveTab} />
  );
};

export default Index;
