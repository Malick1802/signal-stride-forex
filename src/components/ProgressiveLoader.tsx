/**
 * Progressive Loader - Safely loads components with extension protection
 */

import React, { Component } from 'react';
import EmergencyRenderer from './EmergencyRenderer';

interface ProgressiveLoaderState {
  loadedComponents: Set<string>;
  failedComponents: Set<string>;
  isReactHealthy: boolean;
  currentPhase: 'detecting' | 'loading' | 'ready' | 'error';
}

interface ProgressiveLoaderProps {
  children: React.ReactNode;
}

class ProgressiveLoader extends Component<ProgressiveLoaderProps, ProgressiveLoaderState> {
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(props: ProgressiveLoaderProps) {
    super(props);
    this.state = {
      loadedComponents: new Set(),
      failedComponents: new Set(),
      isReactHealthy: this.checkReactHealth(),
      currentPhase: 'detecting'
    };
  }

  componentDidMount() {
    this.startHealthMonitoring();
    this.initializeProgressiveLoading();
  }

  componentWillUnmount() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  checkReactHealth(): boolean {
    try {
      // Check if React and its hooks are available
      if (typeof window === 'undefined') return false;
      
      const hasReact = !!window.React;
      const hasHooks = hasReact && typeof window.React.useState === 'function';
      
      // Try to access common React internals that extensions might break
      const hasRenderer = hasReact && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      
      return hasReact && hasHooks && hasRenderer;
    } catch (error) {
      console.warn('🔍 React health check failed:', error);
      return false;
    }
  }

  startHealthMonitoring() {
    // Monitor React health every 2 seconds
    this.healthCheckInterval = setInterval(() => {
      const isHealthy = this.checkReactHealth();
      
      if (isHealthy !== this.state.isReactHealthy) {
        console.log('🔄 React health status changed:', isHealthy ? 'healthy' : 'unhealthy');
        this.setState({ isReactHealthy: isHealthy });
      }
    }, 2000);
  }

  async initializeProgressiveLoading() {
    this.setState({ currentPhase: 'loading' });

    try {
      // Phase 1: Test basic React functionality
      await this.testBasicReact();
      
      // Phase 2: Test hook functionality
      await this.testHooks();
      
      // Phase 3: Test component rendering
      await this.testComponentRendering();
      
      this.setState({ currentPhase: 'ready' });
    } catch (error) {
      console.error('🚨 Progressive loading failed:', error);
      this.setState({ currentPhase: 'error' });
    }
  }

  async testBasicReact(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Test basic React element creation
        const testElement = React.createElement('div', {}, 'test');
        if (!testElement) {
          throw new Error('React.createElement failed');
        }
        
        setTimeout(resolve, 100);
      } catch (error) {
        reject(new Error(`Basic React test failed: ${error}`));
      }
    });
  }

  async testHooks(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // We can't directly test hooks in a class component,
        // but we can check if they exist
        if (!window.React?.useState || !window.React?.useEffect) {
          throw new Error('React hooks not available');
        }
        
        setTimeout(resolve, 100);
      } catch (error) {
        reject(new Error(`Hook test failed: ${error}`));
      }
    });
  }

  async testComponentRendering(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Test if we can create and mount a simple component
        const TestComponent = () => React.createElement('div', {}, 'Component test');
        const testElement = React.createElement(TestComponent);
        
        if (!testElement) {
          throw new Error('Component rendering failed');
        }
        
        setTimeout(resolve, 100);
      } catch (error) {
        reject(new Error(`Component rendering test failed: ${error}`));
      }
    });
  }

  renderPhaseIndicator() {
    const { currentPhase, isReactHealthy } = this.state;
    
    const phaseMessages = {
      detecting: 'Detecting React environment...',
      loading: 'Loading components progressively...',
      ready: 'All systems ready',
      error: 'Initialization failed'
    };

    const phaseColors = {
      detecting: 'text-yellow-400',
      loading: 'text-blue-400',
      ready: 'text-green-400',
      error: 'text-red-400'
    };

    return React.createElement('div', {
      className: 'fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm z-50',
      style: { fontFamily: 'system-ui, -apple-system, sans-serif' }
    }, [
      React.createElement('div', {
        key: 'status',
        className: `${phaseColors[currentPhase]} font-medium`
      }, phaseMessages[currentPhase]),
      
      React.createElement('div', {
        key: 'health',
        className: isReactHealthy ? 'text-green-300' : 'text-red-300'
      }, `React: ${isReactHealthy ? 'Healthy' : 'Compromised'}`)
    ]);
  }

  render() {
    const { children } = this.props;
    const { currentPhase, isReactHealthy } = this.state;

    // If React is completely broken, use emergency renderer
    if (!isReactHealthy && currentPhase === 'error') {
      console.log('🚨 Progressive loader falling back to emergency renderer');
      return React.createElement(EmergencyRenderer, {}, children);
    }

    // If still loading, show loading state
    if (currentPhase === 'loading' || currentPhase === 'detecting') {
      return React.createElement('div', {
        className: 'fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white flex items-center justify-center',
        style: { fontFamily: 'system-ui, -apple-system, sans-serif' }
      }, [
        React.createElement('div', {
          key: 'container',
          className: 'text-center'
        }, [
          React.createElement('div', {
            key: 'spinner',
            className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4 mx-auto'
          }),
          React.createElement('p', {
            key: 'message',
            className: 'text-gray-300'
          }, currentPhase === 'detecting' ? 'Initializing...' : 'Loading components...')
        ]),
        
        // Phase indicator
        this.renderPhaseIndicator()
      ]);
    }

    // If ready, render children with monitoring
    try {
      return React.createElement('div', {}, [
        children,
        // Show phase indicator in development
        process.env.NODE_ENV === 'development' && this.renderPhaseIndicator()
      ]);
    } catch (error) {
      console.error('🚨 Error rendering progressive loader children:', error);
      return React.createElement(EmergencyRenderer, {}, children);
    }
  }
}

export default ProgressiveLoader;