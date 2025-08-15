
import React, { useState } from 'react';
import AppContent from '../components/AppContent';
import MobileAppWrapper from '../components/MobileAppWrapper';

const Index = () => {
  const [activeTab, setActiveTab] = useState('signals');

  return (
    <MobileAppWrapper activeTab={activeTab} onTabChange={setActiveTab}>
      <AppContent activeTab={activeTab} onTabChange={setActiveTab} />
    </MobileAppWrapper>
  );
};

export default Index;
