
import React from 'react';
import { AdminDashboard } from './admin/AdminDashboard';

interface AdminPageProps {
  onNavigate?: (view: string) => void;
}

const AdminPage = ({ onNavigate }: AdminPageProps) => {
  return <AdminDashboard onNavigate={onNavigate} />;
};

export default AdminPage;
