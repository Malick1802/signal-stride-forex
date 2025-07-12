// React Recovery System - Handles React hook nullification and restoration

interface ReactRecoveryState {
  isReactCompromised: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
  originalReact: any;
}

class ReactRecoveryManager {
  private static instance: ReactRecoveryManager;
  private state: ReactRecoveryState = {
    isReactCompromised: false,
    recoveryAttempts: 0,
    lastRecoveryTime: 0,
    originalReact: null
  };
  
  private recoveryInterval?: NodeJS.Timeout;
  private reactMonitorInterval?: NodeJS.Timeout;

  static getInstance(): ReactRecoveryManager {
    if (!ReactRecoveryManager.instance) {
      ReactRecoveryManager.instance = new ReactRecoveryManager();
    }
    return ReactRecoveryManager.instance;
  }

  init(): void {
    this.captureOriginalReact();
    this.setupReactProtection();
    this.startReactMonitoring();
    this.setupWindowProtection();
  }

  private captureOriginalReact(): void {
    try {
      // Capture React before extensions can interfere
      import('react').then((React) => {
        this.state.originalReact = React;
        console.log('✅ Original React captured for recovery');
      });
    } catch (error) {
      console.warn('Failed to capture original React:', error);
    }
  }

  private setupReactProtection(): void {
    if (typeof window === 'undefined') return;

    // Protect window.React from being nullified
    let reactReference: any = null;
    
    Object.defineProperty(window, 'React', {
      get: () => {
        if (!reactReference || !reactReference.useState) {
          // React is compromised, trigger recovery
          this.triggerRecovery();
          return this.state.originalReact || reactReference;
        }
        return reactReference;
      },
      set: (value: any) => {
        if (value === null || value === undefined || !value.useState) {
          console.warn('🛡️ Blocked React nullification attempt');
          this.state.isReactCompromised = true;
          this.triggerRecovery();
          return;
        }
        reactReference = value;
        this.state.isReactCompromised = false;
      },
      configurable: false
    });

    // Initialize with original React
    if (this.state.originalReact) {
      (window as any).React = this.state.originalReact;
    }
  }

  private startReactMonitoring(): void {
    this.reactMonitorInterval = setInterval(() => {
      this.checkReactHealth();
    }, 1000);
  }

  private checkReactHealth(): void {
    try {
      const React = (window as any).React;
      
      if (!React || !React.useState || typeof React.useState !== 'function') {
        if (!this.state.isReactCompromised) {
          console.warn('🚨 React health check failed - triggering recovery');
          this.state.isReactCompromised = true;
          this.triggerRecovery();
        }
      } else {
        // React is healthy
        if (this.state.isReactCompromised) {
          console.log('✅ React recovery successful');
          this.state.isReactCompromised = false;
        }
      }
    } catch (error) {
      console.error('React health check error:', error);
      this.state.isReactCompromised = true;
      this.triggerRecovery();
    }
  }

  private triggerRecovery(): void {
    const now = Date.now();
    
    // Prevent too frequent recovery attempts
    if (now - this.state.lastRecoveryTime < 2000) {
      return;
    }
    
    this.state.lastRecoveryTime = now;
    this.state.recoveryAttempts++;
    
    console.log(`🔄 Attempting React recovery (attempt ${this.state.recoveryAttempts})`);
    
    // Clear any existing recovery interval
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    
    // Start recovery process
    this.recoveryInterval = setInterval(() => {
      this.performRecovery();
    }, 500);
  }

  private async performRecovery(): Promise<void> {
    try {
      // Method 1: Restore from captured original
      if (this.state.originalReact && this.state.originalReact.useState) {
        (window as any).React = this.state.originalReact;
        console.log('✅ React restored from original capture');
        this.clearRecoveryInterval();
        return;
      }
      
      // Method 2: Re-import React
      const React = await import('react');
      if (React && React.useState) {
        (window as any).React = React;
        this.state.originalReact = React;
        console.log('✅ React restored via re-import');
        this.clearRecoveryInterval();
        return;
      }
      
      // Method 3: Try to find React in global scope
      const globalReact = this.findGlobalReact();
      if (globalReact) {
        (window as any).React = globalReact;
        console.log('✅ React restored from global scope');
        this.clearRecoveryInterval();
        return;
      }
      
      console.warn('❌ React recovery failed, will retry...');
    } catch (error) {
      console.error('React recovery error:', error);
    }
  }

  private findGlobalReact(): any {
    try {
      // Check various global locations where React might be
      const locations = [
        () => (window as any).__REACT_GLOBAL__,
        () => (window as any).ReactDOM?.React,
        () => (document.querySelector('[data-reactroot]') as any)?.__reactInternalInstance?.React,
        () => {
          // Try to find React in any loaded modules
          if (typeof require !== 'undefined') {
            try {
              return require('react');
            } catch (e) {
              return null;
            }
          }
          return null;
        }
      ];
      
      for (const location of locations) {
        try {
          const react = location();
          if (react && react.useState) {
            return react;
          }
        } catch (e) {
          // Continue to next location
        }
      }
    } catch (error) {
      console.warn('Global React search failed:', error);
    }
    
    return null;
  }

  private clearRecoveryInterval(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = undefined;
    }
    this.state.isReactCompromised = false;
  }

  private setupWindowProtection(): void {
    if (typeof window === 'undefined') return;

    // Protect against Object.defineProperty being used to nullify React
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
      if (obj === window && prop === 'React' && 
          (descriptor.value === null || descriptor.value === undefined)) {
        console.warn('🛡️ Blocked defineProperty nullification of React');
        return obj;
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };
  }

  // Public API for components to check React status
  isReactHealthy(): boolean {
    try {
      const React = (window as any).React;
      return React && React.useState && typeof React.useState === 'function';
    } catch {
      return false;
    }
  }

  getRecoveryStats(): ReactRecoveryState {
    return { ...this.state };
  }

  // Hook wrapper that automatically handles recovery
  wrapHook<T extends any[], R>(hookFn: (...args: T) => R, hookName: string): (...args: T) => R {
    return (...args: T): R => {
      try {
        if (!this.isReactHealthy()) {
          this.triggerRecovery();
          throw new Error(`React compromised when calling ${hookName}`);
        }
        
        return hookFn(...args);
      } catch (error) {
        console.error(`${hookName} failed:`, error);
        
        // Try immediate recovery for critical hooks
        if (hookName === 'useState') {
          this.triggerRecovery();
          
          // Return a basic fallback for useState
          if (args.length === 1) {
            let state = args[0];
            const setState = (newState: any) => {
              state = typeof newState === 'function' ? newState(state) : newState;
            };
            return [state, setState] as R;
          }
        }
        
        throw error;
      }
    };
  }

  cleanup(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    
    if (this.reactMonitorInterval) {
      clearInterval(this.reactMonitorInterval);
    }
  }
}

// Global instance
export const reactRecovery = ReactRecoveryManager.getInstance();

// Auto-initialize
if (typeof window !== 'undefined') {
  reactRecovery.init();
}

export default reactRecovery;