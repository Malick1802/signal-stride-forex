
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Bug } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOnline: boolean;
  debugInfo: string[];
}

class MobileErrorBoundary extends Component<Props, State> {
  private networkListener: (() => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: navigator.onLine,
      debugInfo: []
    };
  }

  componentDidMount() {
    this.addDebugInfo('MobileErrorBoundary mounted');
    
    // Listen for network changes
    this.networkListener = () => {
      this.setState({ isOnline: navigator.onLine });
      this.addDebugInfo(`Network status changed: ${navigator.onLine ? 'online' : 'offline'}`);
    };
    
    window.addEventListener('online', this.networkListener);
    window.addEventListener('offline', this.networkListener);
    
    // Listen for unhandled errors
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    this.addDebugInfo(`Platform: ${Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'}`);
    this.addDebugInfo(`Initial network status: ${navigator.onLine ? 'online' : 'offline'}`);
  }

  componentWillUnmount() {
    if (this.networkListener) {
      window.removeEventListener('online', this.networkListener);
      window.removeEventListener('offline', this.networkListener);
    }
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  addDebugInfo = (info: string) => {
    const timestamp = new Date().toISOString();
    console.log(`🐛 [MobileErrorBoundary] ${timestamp}: ${info}`);
    this.setState(prev => ({
      debugInfo: [...prev.debugInfo.slice(-9), `${timestamp}: ${info}`]
    }));
  };

  handleGlobalError = (event: ErrorEvent) => {
    console.error('🚨 Global error caught:', event.error);
    this.addDebugInfo(`Global error: ${event.error?.message || 'Unknown error'}`);
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    this.addDebugInfo(`Promise rejection: ${event.reason?.message || 'Unknown rejection'}`);
    
    // Prevent default to avoid showing browser error dialog
    event.preventDefault();
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isOnline: navigator.onLine
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Mobile Error Boundary caught an error:', error, errorInfo);
    
    this.addDebugInfo(`Error caught: ${error.message}`);
    this.addDebugInfo(`Error stack: ${error.stack?.substring(0, 200) || 'No stack'}`);
    
    // Log additional mobile context
    if (Capacitor.isNativePlatform()) {
      this.addDebugInfo(`Mobile Platform: ${Capacitor.getPlatform()}`);
      this.addDebugInfo(`Network Status: ${navigator.onLine ? 'Online' : 'Offline'}`);
    }
    
    this.setState({
      error,
      errorInfo,
      isOnline: navigator.onLine
    });
  }

  handleRetry = () => {
    this.addDebugInfo('User initiated retry');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      debugInfo: []
    });
    
    // Force reload on mobile if still having issues
    if (Capacitor.isNativePlatform() && !this.state.isOnline) {
      window.location.reload();
    }
  };

  handleShowDebug = () => {
    const debugData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
      online: this.state.isOnline,
      url: window.location.href,
      userAgent: navigator.userAgent,
      debugInfo: this.state.debugInfo
    };
    
    console.log('🐛 Debug Info:', debugData);
    alert('Debug info logged to console. Please check the developer tools.');
  };

  render() {
    if (this.state.hasError) {
      // Log errors but don't show visual warning for mobile users
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || !this.state.isOnline;
      
      console.log('🚨 Mobile Error Boundary: Error detected but hidden from UI', {
        error: errorMessage,
        isNetworkError,
        online: this.state.isOnline,
        platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
      });
      
      // For non-critical errors, just log and continue
      if (isNetworkError || errorMessage.includes('Cannot read properties of null')) {
        console.log('🔄 Non-critical error detected - continuing normal operation');
        return this.props.children;
      }
      
      // Only show error UI for critical application errors
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20 text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Critical App Error
            </h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-300 text-sm">
                A critical error occurred. Please restart the app.
              </p>
              
              {Capacitor.isNativePlatform() && (
                <p className="text-gray-400 text-xs">
                  Running on {Capacitor.getPlatform()} platform
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              {Capacitor.isNativePlatform() && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Reload App
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;
