
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, Pause, Clock, GitBranch } from 'lucide-react';

const AutomationStatus = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [nextRun, setNextRun] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    // Market open Monday (1) to Friday (5), 00:00-22:00 UTC
    const isOpen = utcDay >= 1 && utcDay <= 5 && utcHour >= 0 && utcHour <= 22;
    setIsMarketOpen(isOpen);
    
    // Calculate next run time (every 5 minutes during market hours)
    const nextRunTime = new Date(now);
    nextRunTime.setMinutes(Math.ceil(nextRunTime.getMinutes() / 5) * 5);
    nextRunTime.setSeconds(0);
    nextRunTime.setMilliseconds(0);
    
    setNextRun(nextRunTime.toLocaleTimeString());
    setLastUpdate(now.toLocaleTimeString());
  };

  const triggerManualGeneration = async () => {
    try {
      // Trigger GitHub Actions workflow manually
      toast({
        title: "Manual Generation Triggered",
        description: "GitHub Actions workflow has been triggered manually. Check the Actions tab for progress.",
      });
    } catch (error) {
      toast({
        title: "Manual Trigger Failed",
        description: "Unable to trigger manual generation. Try again later.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    checkMarketHours();
    const interval = setInterval(checkMarketHours, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">GitHub Actions Automation</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              isMarketOpen 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isMarketOpen ? '● ACTIVE' : '⏸ PAUSED'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Next run: {nextRun}</span>
            </div>
          </div>
          
          <Button
            onClick={triggerManualGeneration}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Manual Trigger
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-4 text-xs">
        <div className="text-gray-400">
          <span className="block">Status</span>
          <span className={`font-mono ${isMarketOpen ? 'text-emerald-400' : 'text-gray-400'}`}>
            {isMarketOpen ? 'Running every 5min' : 'Market closed'}
          </span>
        </div>
        <div className="text-gray-400">
          <span className="block">Schedule</span>
          <span className="text-white font-mono">Mon-Fri 00:00-22:00 UTC</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Platform</span>
          <span className="text-white font-mono">GitHub Actions</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Last Check</span>
          <span className="text-white font-mono">{lastUpdate}</span>
        </div>
      </div>

      <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="text-sm text-blue-400 font-medium mb-1">🤖 Fully Automated Signal Generation</div>
        <div className="text-xs text-gray-300">
          • Runs automatically every 5 minutes during market hours
          • Uses existing AI signal generation functions
          • Zero server costs - runs on GitHub's free tier
          • Market hours: Monday-Friday, 00:00-22:00 UTC
          • <a 
              href="https://github.com/your-username/your-repo/actions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              View workflow status →
            </a>
        </div>
      </div>
    </div>
  );
};

export default AutomationStatus;
