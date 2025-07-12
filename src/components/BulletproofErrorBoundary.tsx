import React from 'react';
import ErrorBoundaryFallback from './ErrorBoundaryFallback';

interface BulletproofErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface BulletproofErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
}

class BulletproofErrorBoundary extends React.Component<
  BulletproofErrorBoundaryProps,
  BulletproofErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: BulletproofErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<BulletproofErrorBoundaryState> {
    console.error('🚨 Error boundary caught error:', error);
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error boundary details:', { error, errorInfo });
    
    this.setState({
      error,
      errorInfo
    });

    // Log to external service if available
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // You can replace this with your preferred error logging service
      console.group('🐛 Detailed Error Report');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('User Agent:', navigator.userAgent);
      console.error('URL:', window.location.href);
      console.error('Timestamp:', new Date().toISOString());
      
      // Check for extension conflicts
      const hasExtensions = Boolean(
        (window as any).chrome?.runtime?.getManifest ||
        document.querySelector('[data-extension-id]') ||
        Array.from(document.scripts).some(script => 
          script.src.includes('extension://') || 
          script.src.includes('chrome-extension://')
        )
      );
      
      console.error('Extensions Detected:', hasExtensions);
      console.groupEnd();
    } catch (loggingError) {
      console.warn('Failed to log error:', loggingError);
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    // Prevent too many rapid retries
    if (retryCount >= 3) {
      console.warn('🚫 Maximum retry attempts reached');
      return;
    }

    console.log(`🔄 Retry attempt ${retryCount + 1}`);
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1
    });

    // Clear any pending retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Set a timeout to reset retry count after successful render
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ retryCount: 0 });
    }, 10000);
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorBoundaryFallback;
      
      return React.createElement(FallbackComponent, {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        onRetry: this.state.retryCount < 3 ? this.handleRetry : undefined
      });
    }

    try {
      return this.props.children;
    } catch (renderError) {
      // Catch any errors during render and update state
      console.error('🚨 Render error caught:', renderError);
      
      // Use setTimeout to avoid updating state during render
      setTimeout(() => {
        this.setState({
          hasError: true,
          error: renderError instanceof Error ? renderError : new Error(String(renderError)),
          errorInfo: null
        });
      }, 0);
      
      // Return fallback for immediate display
      return React.createElement(ErrorBoundaryFallback, {
        error: renderError instanceof Error ? renderError : new Error(String(renderError)),
        onRetry: this.handleRetry
      });
    }
  }
}

export default BulletproofErrorBoundary;