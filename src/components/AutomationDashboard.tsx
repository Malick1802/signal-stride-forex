
import React from 'react';
import AutomationStatus from './AutomationStatus';
import WorkflowMonitor from './WorkflowMonitor';

const AutomationDashboard = () => {
  return (
    <div className="space-y-6">
      <AutomationStatus />
      <WorkflowMonitor />
    </div>
  );
};

export default AutomationDashboard;
