/**
 * Emergency Renderer - A completely hook-free React component
 * This component works even when React hooks are nullified by browser extensions
 */

import React, { Component } from 'react';

interface EmergencyRendererState {
  error: Error | null;
  isReady: boolean;
  retryCount: number;
  hasExtensionConflict: boolean;
}

interface EmergencyRendererProps {
  children?: React.ReactNode;
}

class EmergencyRenderer extends Component<EmergencyRendererProps, EmergencyRendererState> {
  private maxRetries = 3;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: EmergencyRendererProps) {
    super(props);
    this.state = {
      error: null,
      isReady: false,
      retryCount: 0,
      hasExtensionConflict: this.detectExtensionConflict()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EmergencyRendererState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 EmergencyRenderer caught error:', error);
    console.error('Error info:', errorInfo);
    
    // Check if this is a hook-related error
    const isHookError = error.message.includes('Invalid hook call') || 
                       error.message.includes('Cannot read properties of null') ||
                       error.message.includes('useState');
    
    if (isHookError) {
      this.setState({ hasExtensionConflict: true });
    }
  }

  componentDidMount() {
    // Delay initialization to let extensions finish their interference
    setTimeout(() => {
      this.setState({ isReady: true });
    }, 100);
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  detectExtensionConflict(): boolean {
    try {
      // Check if React hooks are available
      const hasReact = typeof window !== 'undefined' && window.React;
      const hasHooks = hasReact && typeof window.React.useState === 'function';
      
      // Check for common extension interference patterns
      const hasExtensionElements = document.querySelectorAll('[data-extension], [class*="extension"], [id*="extension"]').length > 0;
      
      return !hasHooks || hasExtensionElements;
    } catch (error) {
      return true;
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        error: null,
        retryCount: prevState.retryCount + 1,
        hasExtensionConflict: this.detectExtensionConflict()
      }));

      // Retry after a delay
      this.retryTimer = setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  handleDisableExtensions = () => {
    const instructions = `
1. Open your browser settings
2. Navigate to Extensions/Add-ons
3. Disable all extensions temporarily
4. Refresh this page
5. Re-enable extensions one by one to identify the problematic one
    `;
    
    alert('Extension Conflict Detected!\n\n' + instructions);
  };

  renderErrorScreen() {
    const { error, retryCount, hasExtensionConflict } = this.state;
    
    return React.createElement('div', {
      className: 'fixed inset-0 bg-gradient-to-br from-slate-900 via-red-900 to-slate-800 text-white flex items-center justify-center p-4',
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 9999
      }
    }, [
      React.createElement('div', {
        key: 'container',
        className: 'max-w-md text-center space-y-6'
      }, [
        // Icon
        React.createElement('div', {
          key: 'icon',
          className: 'text-6xl mb-4'
        }, '⚠️'),
        
        // Title
        React.createElement('h1', {
          key: 'title',
          className: 'text-2xl font-bold mb-4'
        }, hasExtensionConflict ? 'Extension Conflict Detected' : 'Application Error'),
        
        // Description
        React.createElement('p', {
          key: 'description',
          className: 'text-gray-300 mb-6'
        }, hasExtensionConflict 
          ? 'A browser extension is interfering with ForexAlert Pro. This usually happens with ad blockers or privacy extensions.'
          : 'Something went wrong while loading the application.'
        ),
        
        // Error details
        error && React.createElement('details', {
          key: 'details',
          className: 'text-left bg-black/20 p-4 rounded mb-6'
        }, [
          React.createElement('summary', {
            key: 'summary',
            className: 'cursor-pointer text-sm font-medium mb-2'
          }, 'Technical Details'),
          React.createElement('pre', {
            key: 'error',
            className: 'text-xs text-red-300 whitespace-pre-wrap'
          }, error.message)
        ]),
        
        // Action buttons
        React.createElement('div', {
          key: 'actions',
          className: 'space-y-3'
        }, [
          // Retry button
          retryCount < this.maxRetries && React.createElement('button', {
            key: 'retry',
            onClick: this.handleRetry,
            className: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors'
          }, `Retry (${this.maxRetries - retryCount} attempts left)`),
          
          // Extension help button
          hasExtensionConflict && React.createElement('button', {
            key: 'extensions',
            onClick: this.handleDisableExtensions,
            className: 'w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors'
          }, 'Fix Extension Conflict'),
          
          // Reload button
          React.createElement('button', {
            key: 'reload',
            onClick: () => window.location.reload(),
            className: 'w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors'
          }, 'Reload Page'),
          
          // New tab button
          React.createElement('button', {
            key: 'newtab',
            onClick: () => window.open(window.location.href, '_blank'),
            className: 'w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors'
          }, 'Open in New Tab')
        ])
      ])
    ]);
  }

  renderLoadingScreen() {
    return React.createElement('div', {
      className: 'fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white flex items-center justify-center',
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 9998
      }
    }, [
      React.createElement('div', {
        key: 'container',
        className: 'text-center'
      }, [
        React.createElement('div', {
          key: 'spinner',
          className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-6 mx-auto'
        }),
        React.createElement('h2', {
          key: 'title',
          className: 'text-xl font-bold'
        }, 'ForexAlert Pro'),
        React.createElement('p', {
          key: 'subtitle',
          className: 'text-gray-300 mt-2'
        }, 'Initializing secure environment...')
      ])
    ]);
  }

  render() {
    const { error, isReady, hasExtensionConflict } = this.state;
    const { children } = this.props;

    // Show error screen if there's an error
    if (error || hasExtensionConflict) {
      return this.renderErrorScreen();
    }

    // Show loading screen until ready
    if (!isReady) {
      return this.renderLoadingScreen();
    }

    // Render children if everything is okay
    try {
      return children || React.createElement('div', {}, 'Emergency renderer active');
    } catch (renderError) {
      console.error('🚨 Error rendering children:', renderError);
      return this.renderErrorScreen();
    }
  }
}

export default EmergencyRenderer;