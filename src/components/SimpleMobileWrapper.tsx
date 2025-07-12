
import React, { Component } from 'react';
import { Capacitor } from '@capacitor/core';
import MobileErrorBoundary from './MobileErrorBoundary';

interface State {
  isOnline: boolean;
  isInitialized: boolean;
  currentStep: string;
  error: string | null;
  progress: number;
}

class SimpleMobileWrapper extends Component<{ children: React.ReactNode }, State> {
  private initializationStarted = false;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      isOnline: navigator.onLine,
      isInitialized: false,
      currentStep: 'Preparing...',
      error: null,
      progress: 0
    };
  }

  async componentDidMount() {
    if (this.initializationStarted) return;
    this.initializationStarted = true;

    console.log('🚀 SimpleMobileWrapper: Starting initialization');
    
    // Set up network listeners
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    await this.initializeApp();
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  async initializeApp() {
    try {
      this.setState({ currentStep: 'Starting initialization...', progress: 10 });
      
      if (!Capacitor.isNativePlatform()) {
        console.log('🌐 Running as web app - skipping native features');
        this.setState({ 
          currentStep: 'Web app mode', 
          progress: 100,
          isInitialized: true 
        });
        return;
      }

      console.log('📱 Native platform detected:', Capacitor.getPlatform());
      this.setState({ currentStep: 'Configuring native features...', progress: 25 });

      // Initialize native features safely
      await this.initializeNativeFeatures();
      
      this.setState({ 
        currentStep: 'Initialization complete', 
        progress: 100,
        isInitialized: true 
      });
      
    } catch (error) {
      console.error('🚨 Initialization error:', error);
      this.setState({ 
        error: 'Some features may not work correctly',
        currentStep: 'Ready (compatibility mode)',
        isInitialized: true 
      });
    }
  }

  async initializeNativeFeatures() {
    // Status bar configuration
    try {
      this.setState({ currentStep: 'Loading status bar...', progress: 35 });
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      await StatusBar.show();
      console.log('✅ Status bar configured');
    } catch (error) {
      console.warn('⚠️ Status bar configuration failed:', error);
    }

    // Hide splash screen
    try {
      this.setState({ currentStep: 'Hiding splash screen...', progress: 50 });
      const { SplashScreen } = await import('@capacitor/splash-screen');
      
      setTimeout(async () => {
        await SplashScreen.hide({ fadeOutDuration: 300 });
        console.log('✅ Splash screen hidden');
      }, 2000);
    } catch (error) {
      console.warn('⚠️ Splash screen hide failed:', error);
    }

    this.setState({ currentStep: 'Setup complete', progress: 75 });
  }

  render() {
    const { isOnline, isInitialized, currentStep, error, progress } = this.state;
    const { children } = this.props;

    // Show offline screen
    if (!isOnline) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
          <h1 className="text-2xl font-bold mb-4">No Internet Connection</h1>
          <p className="text-gray-400 mb-6 text-center">
            ForexAlert Pro requires an internet connection to work properly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-500 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Retry Connection
          </button>
          <p className="text-xs text-gray-500 mt-4">
            {Capacitor.isNativePlatform() ? 'Mobile App' : 'Web App'}
          </p>
        </div>
      );
    }

    // Show loading screen
    if (!isInitialized) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
            
            <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
            <p className="text-gray-300 mb-4">{currentStep}</p>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div 
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {Capacitor.isNativePlatform() && (
              <p className="text-sm text-gray-400">
                Loading mobile features on {Capacitor.getPlatform()}
              </p>
            )}
            
            {error && (
              <p className="text-yellow-400 text-xs mt-2">{error}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <MobileErrorBoundary>
        {error && (
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 mb-2">
            <p className="text-yellow-400 text-sm">{error}</p>
          </div>
        )}
        {children}
      </MobileErrorBoundary>
    );
  }
}

export default SimpleMobileWrapper;
