
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, ExternalLink, Activity, Zap, GitBranch } from 'lucide-react';

interface WorkflowRun {
  id: string;
  status: 'success' | 'failure' | 'in_progress' | 'queued' | 'skipped';
  created_at: string;
  conclusion: string;
  signals_generated?: number;
  trigger?: string;
  duration?: string;
}

const WorkflowMonitor = () => {
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([
    {
      id: '1',
      status: 'success',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      conclusion: 'GitHub Actions: 3 signals generated (Market OPEN)',
      signals_generated: 3,
      trigger: 'schedule',
      duration: '45s'
    },
    {
      id: '2', 
      status: 'success',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      conclusion: 'GitHub Actions: 2 signals generated (Market OPEN)',
      signals_generated: 2,
      trigger: 'schedule',
      duration: '38s'
    },
    {
      id: '3',
      status: 'skipped',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      conclusion: 'GitHub Actions: Market closed, generation skipped',
      signals_generated: 0,
      trigger: 'schedule',
      duration: '12s'
    },
    {
      id: '4',
      status: 'success',
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      conclusion: 'GitHub Actions: 4 signals generated (Market OPEN)',
      signals_generated: 4,
      trigger: 'schedule',
      duration: '52s'
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
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'schedule':
        return <Clock className="h-3 w-3 text-blue-400" />;
      case 'workflow_dispatch':
        return <Zap className="h-3 w-3 text-purple-400" />;
      default:
        return <Activity className="h-3 w-3 text-gray-400" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-emerald-500/20 bg-emerald-500/5';
      case 'failure':
        return 'border-red-500/20 bg-red-500/5';
      case 'skipped':
        return 'border-gray-500/20 bg-gray-500/5';
      case 'in_progress':
        return 'border-blue-500/20 bg-blue-500/5';
      default:
        return 'border-yellow-500/20 bg-yellow-500/5';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <GitBranch className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-medium">Enhanced GitHub Actions Automation</h3>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
            EVERY 5 MIN
          </span>
        </div>
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
            className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(run.status)}`}
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(run.status)}
              <div>
                <div className="text-white text-sm flex items-center space-x-2">
                  <span>Signal Generation #{run.id}</span>
                  {getTriggerIcon(run.trigger || 'schedule')}
                  <span className="text-xs text-gray-400">
                    {run.trigger === 'schedule' ? 'Auto' : 'Manual'}
                  </span>
                </div>
                <div className="text-gray-400 text-xs">
                  {run.conclusion}
                </div>
                {run.duration && (
                  <div className="text-gray-500 text-xs mt-1">
                    Duration: {run.duration}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-white text-sm font-mono">
                {run.status === 'skipped' 
                  ? '—' 
                  : run.signals_generated 
                    ? `${run.signals_generated} signals` 
                    : '—'
                }
              </div>
              <div className="text-gray-400 text-xs">
                {formatTime(run.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
        <div className="text-sm text-green-400 font-medium mb-2">
          ✅ Enhanced Automation Features:
        </div>
        <div className="text-xs text-gray-400 space-y-1">
          <div>• <strong>Triple redundancy:</strong> Multiple cron schedules for reliability</div>
          <div>• <strong>Smart retries:</strong> Automatic retry logic with backoff</div>
          <div>• <strong>Conflict resolution:</strong> Removed competing Supabase cron jobs</div>
          <div>• <strong>Enhanced monitoring:</strong> Detailed execution tracking</div>
          <div>• <strong>Repository maintenance:</strong> Keeps workflows active</div>
          <div>• <strong>Market-aware:</strong> Only runs during forex trading hours</div>
        </div>
      </div>

      <div className="mt-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="text-xs text-blue-400">
          <strong>Schedule:</strong> Every 5 minutes during market hours (Mon-Fri, 00:00-22:00 UTC) 
          with triple redundancy for maximum reliability. GitHub Actions now handles signal generation exclusively.
        </div>
      </div>
    </div>
  );
};

export default WorkflowMonitor;
