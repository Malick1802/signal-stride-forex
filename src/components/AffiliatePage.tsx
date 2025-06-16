
import React from 'react';
import { AffiliateDashboard } from './affiliate/AffiliateDashboard';

interface AffiliatePageProps {
  onNavigate?: (view: string) => void;
}

const AffiliatePage = ({ onNavigate }: AffiliatePageProps) => {
  return <AffiliateDashboard onNavigate={onNavigate} />;
};

export default AffiliatePage;
