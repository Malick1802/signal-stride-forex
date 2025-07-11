import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class MobileErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary details:', error, errorInfo);
  }

  private reload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              The app encountered an error. You can try reloading the page.
            </p>
            <button
              onClick={this.reload}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg"
            >
              Reload App
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-400">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-red-900/20 rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;