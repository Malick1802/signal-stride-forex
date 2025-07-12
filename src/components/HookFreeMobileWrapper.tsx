// Hook-free mobile wrapper that works even when React hooks are completely compromised
import React from 'react';
import MobileErrorBoundary from './MobileErrorBoundary';
import MobileLoadingScreen from './MobileLoadingScreen';
import { OfflineIndicator } from './OfflineIndicator';

interface HookFreeMobileWrapperState {
  isInitialized: boolean;
  currentStep: string;
  error: string | null;
  progress: number;
  isOnline: boolean;
  initializationComplete: boolean;
}

class HookFreeMobileWrapper extends React.Component<
  { children: React.ReactNode },
  HookFreeMobileWrapperState
> {
  private initializationTimer?: NodeJS.Timeout;
  private connectivityCheckInterval?: NodeJS.Timeout;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    
    this.state = {
      isInitialized: false,
      currentStep: 'Starting initialization...',
      error: null,
      progress: 0,
      isOnline: navigator.onLine,
      initializationComplete: false
    };
  }

  componentDidMount() {
    console.log('🚀 HookFreeMobileWrapper mounting...');
    this.initializeApp();
    this.setupConnectivityMonitoring();
  }

  componentWillUnmount() {
    if (this.initializationTimer) {
      clearTimeout(this.initializationTimer);
    }
    
    if (this.connectivityCheckInterval) {
      clearInterval(this.connectivityCheckInterval);
    }
    
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    console.log('📶 Network came online');
    this.setState({ isOnline: true });
  };

  private handleOffline = () => {
    console.log('📵 Network went offline');
    this.setState({ isOnline: false });
  };

  private setupConnectivityMonitoring() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Periodic connectivity check
    this.connectivityCheckInterval = setInterval(() => {
      this.checkRealConnectivity();
    }, 30000);
  }

  private async checkRealConnectivity() {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const isReallyOnline = response.ok;
      
      if (isReallyOnline !== this.state.isOnline) {
        this.setState({ isOnline: isReallyOnline });
      }
    } catch (error) {
      if (this.state.isOnline) {
        this.setState({ isOnline: false });
      }
    }
  }

  private async initializeApp() {
    try {
      this.setState({ 
        currentStep: 'Checking React health...', 
        progress: 10 
      });

      // Check React health
      await this.delay(100);
      const isReactHealthy = this.checkReactHealth();
      
      if (!isReactHealthy) {
        console.warn('🚨 React hooks compromised, continuing with class component...');
      }

      this.setState({ 
        currentStep: 'Initializing native features...', 
        progress: 30 
      });

      // Initialize native features if available
      await this.initializeNativeFeatures();

      this.setState({ 
        currentStep: 'Setting up app environment...', 
        progress: 60 
      });

      // Additional setup
      await this.delay(200);

      this.setState({ 
        currentStep: 'Finalizing...', 
        progress: 90 
      });

      await this.delay(100);

      this.setState({
        isInitialized: true,
        initializationComplete: true,
        currentStep: 'Ready!',
        progress: 100
      });

      console.log('✅ HookFreeMobileWrapper initialization complete');
    } catch (error) {
      console.error('❌ HookFreeMobileWrapper initialization failed:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        currentStep: 'Initialization failed'
      });
    }
  }

  private checkReactHealth(): boolean {
    try {
      const React = (window as any).React;
      return React && React.useState && typeof React.useState === 'function';
    } catch {
      return false;
    }
  }

  private async initializeNativeFeatures(): Promise<void> {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (!Capacitor.isNativePlatform()) {
        console.log('📱 Running as web app, skipping native initialization');
        return;
      }

      console.log('📱 Initializing native features...');

      // Initialize status bar
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setBackgroundColor({ color: '#1e293b' });
        console.log('✅ Status bar configured');
      } catch (error) {
        console.warn('⚠️ Status bar configuration failed:', error);
      }

      // Hide splash screen
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
        console.log('✅ Splash screen hidden');
      } catch (error) {
        console.warn('⚠️ Splash screen hide failed:', error);
      }

      // Initialize notifications
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          console.log('✅ Notification permissions granted');
        }
      } catch (error) {
        console.warn('⚠️ Notification setup failed:', error);
      }

    } catch (error) {
      console.warn('❌ Native features initialization failed:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  render() {
    const { children } = this.props;
    const { 
      isInitialized, 
      error, 
      currentStep, 
      progress, 
      isOnline,
      initializationComplete 
    } = this.state;

    // Show error screen
    if (error) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1e293b 0%, #dc2626 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              ❌ Initialization Error
            </h1>
            <p style={{ marginBottom: '1rem' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }

    // Show loading screen during initialization
    if (!isInitialized) {
      return React.createElement(MobileLoadingScreen, {
        message: currentStep
      });
    }

    // Show offline indicator if needed  
    if (!isOnline) {
      return React.createElement(OfflineIndicator);
    }

    // Render children with error boundary
    return React.createElement(MobileErrorBoundary, { children });
  }
}

export default HookFreeMobileWrapper;