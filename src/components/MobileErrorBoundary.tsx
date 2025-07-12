import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Shield, Wifi, WifiOff, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOnline: boolean;
  debugInfo: string[];
  isExtensionConflict: boolean;
  retryCount: number;
}

class MobileErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private extensionDetectionTimer?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: navigator.onLine,
      debugInfo: [],
      isExtensionConflict: false,
      retryCount: 0
    };
  }

  componentDidMount() {
    // Enhanced extension conflict detection
    this.detectExtensionConflicts();
    
    // Network status monitoring
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Global error handling for extension conflicts
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    // Message port error detection (extension conflicts)
    this.detectMessagePortErrors();
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    if (this.extensionDetectionTimer) {
      clearTimeout(this.extensionDetectionTimer);
    }
  }

  detectExtensionConflicts = () => {
    const indicators = [
      // Check for common extension script injection
      () => document.querySelector('script[src*="extension://"]'),
      () => document.querySelector('div[class*="expansion-alids"]'),
      () => (window as any).chrome?.runtime?.getManifest,
      () => document.querySelector('[data-extension-id]'),
      // Check for modified DOM by shopping extensions
      () => document.querySelector('[class*="expansion"]'),
      () => document.querySelector('[data-alids]')
    ];

    const conflictDetected = indicators.some(check => {
      try {
        return check();
      } catch {
        return false;
      }
    });

    if (conflictDetected && !this.state.isExtensionConflict) {
      this.addDebugInfo('🔍 Browser extension conflict detected');
      this.setState({ isExtensionConflict: true });
    }
  };

  detectMessagePortErrors = () => {
    // Detect runtime.lastError messages (extension conflicts)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('runtime.lastError') || 
          message.includes('message port closed') ||
          message.includes('Cannot read properties of null')) {
        this.addDebugInfo(`🚨 Extension conflict: ${message}`);
        this.setState({ isExtensionConflict: true });
      }
      originalConsoleError.apply(console, args);
    };
  };

  addDebugInfo = (info: string) => {
    console.log(`📱 MobileErrorBoundary: ${info}`);
    this.setState(prev => ({
      debugInfo: [...prev.debugInfo.slice(-9), `${new Date().toLocaleTimeString()}: ${info}`]
    }));
  };

  handleOnline = () => {
    this.setState({ isOnline: true });
    this.addDebugInfo('📶 Network connection restored');
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
    this.addDebugInfo('📵 Network connection lost');
  };

  handleGlobalError = (event: ErrorEvent) => {
    this.addDebugInfo(`🔥 Global error: ${event.message}`);
    
    // Check if error is related to React hooks or extensions
    if (event.message.includes('useState') || 
        event.message.includes('TooltipProvider') ||
        event.filename?.includes('extension://')) {
      this.setState({ isExtensionConflict: true });
    }
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.addDebugInfo(`💥 Unhandled rejection: ${event.reason}`);
    
    if (event.reason?.message?.includes('message port') ||
        event.reason?.message?.includes('extension')) {
      this.setState({ isExtensionConflict: true });
    }
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 MobileErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Enhanced error detection for extension conflicts
    const isExtensionError = 
      error.message.includes('useState') ||
      error.message.includes('TooltipProvider') ||
      error.message.includes('Cannot read properties of null') ||
      error.stack?.includes('extension://') ||
      errorInfo.componentStack.includes('TooltipProvider');

    if (isExtensionError) {
      this.setState({ isExtensionConflict: true });
      this.addDebugInfo('🔍 Extension-related error detected in React tree');
    }

    this.addDebugInfo(`❌ Error caught: ${error.message}`);
  }

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      this.addDebugInfo('🔄 Maximum retries reached, suggesting page reload');
      this.handleHardRefresh();
      return;
    }

    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1
    }));

    this.addDebugInfo(`🔄 Retry attempt ${this.state.retryCount + 1}`);

    // Try to reload if we're on native platform and offline
    if (Capacitor.isNativePlatform() && !this.state.isOnline) {
      window.location.reload();
    }
  };

  handleHardRefresh = () => {
    this.addDebugInfo('🔄 Performing hard refresh');
    if (Capacitor.isNativePlatform()) {
      window.location.href = window.location.origin;
    } else {
      window.location.reload();
    }
  };

  handleShowDebug = () => {
    console.log('📱 MobileErrorBoundary Debug Info:', this.state.debugInfo);
    this.addDebugInfo('📋 Debug info displayed in console');
  };

  render() {
    if (this.state.hasError) {
      const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
      
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
          <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            {this.state.isExtensionConflict ? (
              <Shield className="h-16 w-16 text-orange-400 mx-auto mb-4" />
            ) : (
              <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            )}
            
            <h2 className="text-xl font-bold text-center mb-4">
              {this.state.isExtensionConflict ? 'Browser Extension Conflict' : 'App Error'}
            </h2>
            
            {this.state.isExtensionConflict ? (
              <div className="space-y-3 mb-6">
                <p className="text-gray-300 text-sm text-center">
                  A browser extension is interfering with the app. This commonly happens with shopping or coupon extensions.
                </p>
                <div className="bg-orange-900/30 border border-orange-500/30 rounded p-3">
                  <p className="text-orange-200 text-xs">
                    <strong>Quick Fix:</strong> Try disabling browser extensions or use incognito/private browsing mode.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <p className="text-gray-300 text-sm text-center">
                  Something went wrong with the ForexAlert Pro app.
                </p>
                {this.state.error && (
                  <details className="bg-red-900/20 border border-red-500/30 rounded p-2">
                    <summary className="text-red-300 text-xs cursor-pointer">Error Details</summary>
                    <pre className="text-red-200 text-xs mt-2 whitespace-pre-wrap">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= this.maxRetries}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {this.state.retryCount >= this.maxRetries ? 'Try Hard Refresh' : `Retry (${this.state.retryCount}/${this.maxRetries})`}
              </Button>

              {this.state.retryCount >= this.maxRetries && (
                <Button
                  onClick={this.handleHardRefresh}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Hard Refresh
                </Button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Platform: {platform}</span>
                <span className={`flex items-center gap-1 ${this.state.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${this.state.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                  {this.state.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <Button
                onClick={this.handleShowDebug}
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs text-gray-400 hover:text-white"
              >
                Show Debug Info
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;