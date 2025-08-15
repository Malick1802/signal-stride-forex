
import React, { useState } from 'react';
import AppContent from '../components/AppContent';
import MobileAppWrapper from '../components/MobileAppWrapper';
import MobileFeatureInitializer from '../components/MobileFeatureInitializer';

const Index = () => {
  const [activeTab, setActiveTab] = useState('signals');

  return (
    <MobileAppWrapper activeTab={activeTab} onTabChange={setActiveTab}>
      <AppContent activeTab={activeTab} onTabChange={setActiveTab} />
      <MobileFeatureInitializer />
    </MobileAppWrapper>
  );
};

export default Index;
