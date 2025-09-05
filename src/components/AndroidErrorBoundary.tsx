import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Smartphone } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class AndroidErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 Android Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Android Error Boundary details:', error, errorInfo);
    this.setState({ errorInfo });

    // Enhanced error reporting for debugging
    console.group('🚨 Android App Error Details');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    console.error('User Agent:', navigator.userAgent);
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();

    // Check if this is the critical require() error
    if (error.message?.includes('require is not defined')) {
      console.error('🔥 CRITICAL: CommonJS require() used in browser - check signalTargetMapping.ts');
    }
  }

  private handleRestart = () => {
    this.retryCount++;
    console.log(`🔄 Android app restart attempt ${this.retryCount}/${this.maxRetries}`);
    
    if (this.retryCount <= this.maxRetries) {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } else {
      // Force reload after max retries
      window.location.reload();
    }
  };

  private handleForceReload = () => {
    console.log('🔄 Force reloading Android app');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const showDetails = this.retryCount >= 2;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 max-w-md w-full text-center">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-blue-400 mr-2" />
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            
            <h1 className="text-xl font-bold text-white mb-3">Android App Error</h1>
            
            <p className="text-gray-300 mb-4 text-sm">
              {this.retryCount < this.maxRetries 
                ? "The app encountered an error. It will restart automatically."
                : "Multiple errors detected. Please restart the app."
              }
            </p>

            {showDetails && this.state.error && (
              <div className="bg-black/20 rounded-lg p-3 mb-4 text-left">
                <p className="text-xs text-red-300 font-mono">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleRestart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors text-sm font-medium"
                disabled={this.retryCount >= this.maxRetries}
              >
                {this.retryCount < this.maxRetries ? `Restart App (${this.retryCount}/${this.maxRetries})` : 'Max Retries Reached'}
              </button>
              
              <button
                onClick={this.handleForceReload}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-xs"
              >
                Force Reload
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              ForexAlert Pro • Android
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AndroidErrorBoundary;