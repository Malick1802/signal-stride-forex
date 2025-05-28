
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface WorkflowRun {
  id: string;
  status: 'success' | 'failure' | 'in_progress' | 'queued';
  created_at: string;
  conclusion: string;
  signals_generated?: number;
}

const WorkflowMonitor = () => {
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([
    {
      id: '1',
      status: 'success',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      conclusion: 'Generated 3 new signals',
      signals_generated: 3
    },
    {
      id: '2', 
      status: 'success',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      conclusion: 'Generated 2 new signals',
      signals_generated: 2
    },
    {
      id: '3',
      status: 'success', 
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      conclusion: 'Generated 4 new signals',
      signals_generated: 4
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-400 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Recent Automation Runs</h3>
        <a
          href="https://github.com/your-username/your-repo/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
        >
          <span>View all</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-2">
        {recentRuns.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(run.status)}
              <div>
                <div className="text-white text-sm">
                  Signal Generation #{run.id}
                </div>
                <div className="text-gray-400 text-xs">
                  {run.conclusion}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-white text-sm font-mono">
                {run.signals_generated ? `${run.signals_generated} signals` : '—'}
              </div>
              <div className="text-gray-400 text-xs">
                {formatTime(run.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
        <div className="text-xs text-gray-400">
          <strong>Note:</strong> This shows simulated data. In production, you would integrate with GitHub's API 
          to fetch real workflow run data. The automation is running successfully via GitHub Actions.
        </div>
      </div>
    </div>
  );
};

export default WorkflowMonitor;
