// Extension conflict detection and mitigation utilities

interface ExtensionConflict {
  detected: boolean;
  type: string;
  severity: 'low' | 'medium' | 'high';
  mitigation?: string;
}

class ExtensionDetector {
  private static instance: ExtensionDetector;
  private conflicts: ExtensionConflict[] = [];
  private observers: MutationObserver[] = [];
  private reactProtectionInterval?: NodeJS.Timeout;

  static getInstance(): ExtensionDetector {
    if (!ExtensionDetector.instance) {
      ExtensionDetector.instance = new ExtensionDetector();
    }
    return ExtensionDetector.instance;
  }

  init(): void {
    this.detectStaticConflicts();
    this.setupDynamicDetection();
    this.protectReactContext();
    this.setupContinuousReactProtection();
  }

  private detectStaticConflicts(): void {
    const detectors = [
      {
        name: 'Shopping Extensions',
        check: () => {
          const indicators = [
            'div[class*="expansion"]',
            'div[class*="alids"]',
            'script[src*="extension://"]',
            '[data-extension-id]'
          ];
          return indicators.some(selector => document.querySelector(selector));
        },
        severity: 'high' as const
      },
      {
        name: 'Chrome Runtime',
        check: () => Boolean((window as any).chrome?.runtime?.getManifest),
        severity: 'medium' as const
      },
      {
        name: 'Extension Scripts',
        check: () => {
          const scripts = Array.from(document.scripts);
          return scripts.some(script => 
            script.src.includes('extension://') || 
            script.src.includes('chrome-extension://')
          );
        },
        severity: 'high' as const
      }
    ];

    detectors.forEach(detector => {
      if (detector.check()) {
        this.conflicts.push({
          detected: true,
          type: detector.name,
          severity: detector.severity,
          mitigation: 'Consider disabling browser extensions or using incognito mode'
        });
        console.warn(`🔍 Extension conflict detected: ${detector.name}`);
      }
    });
  }

  private setupDynamicDetection(): void {
    // Monitor DOM changes for extension injection
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check for extension-injected elements
            if (element.className?.includes('expansion') ||
                element.getAttribute('data-extension-id') ||
                element.tagName?.toLowerCase() === 'script' && 
                (element as HTMLScriptElement).src?.includes('extension://')) {
              
              console.warn('🚨 Dynamic extension injection detected', element);
              this.handleDynamicConflict(element);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-extension-id']
    });

    this.observers.push(observer);
  }

  private handleDynamicConflict(element: Element): void {
    // Remove problematic extension elements
    try {
      element.remove();
      console.log('🧹 Removed extension element:', element);
    } catch (error) {
      console.warn('Failed to remove extension element:', error);
    }
  }

  private setupContinuousReactProtection(): void {
    // Continuously monitor and protect React
    this.reactProtectionInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        // Check if React or its hooks have been nullified
        const React = (window as any).React;
        if (!React || !React.useState) {
          console.warn('🛡️ React protection: Re-importing React due to nullification');
          
          // Re-import and protect React
          import('react').then((ReactModule) => {
            (window as any).React = ReactModule;
            console.log('✅ React context restored');
          }).catch((error) => {
            console.error('❌ Failed to restore React:', error);
          });
        }
      }
    }, 1000); // Check every second
  }

  private protectReactContext(): void {
    // Enhanced React protection
    if (typeof window !== 'undefined') {
      // Protect against React nullification
      let reactReference: any = null;
      
      import('react').then((React) => {
        reactReference = React;
        
        // Define a protected React property
        Object.defineProperty(window, 'React', {
          get: () => {
            if (!reactReference || !reactReference.useState) {
              console.warn('🛡️ React access attempted while nullified - restoring...');
              return reactReference;
            }
            return reactReference;
          },
          set: (value) => {
            if (value === null || value === undefined || !value.useState) {
              console.warn('🛡️ Prevented React nullification by extension');
              // Don't allow nullification
              return;
            }
            // Allow legitimate React updates
            reactReference = value;
          },
          configurable: false
        });
      });

      // Additional protection for common extension interference points
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
        // Block extensions from modifying React
        if (prop === 'React' && descriptor.value === null) {
          console.warn('🛡️ Blocked attempt to nullify React');
          return obj;
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
      };
    }
  }

  getConflicts(): ExtensionConflict[] {
    return this.conflicts;
  }

  hasHighSeverityConflicts(): boolean {
    return this.conflicts.some(conflict => conflict.severity === 'high');
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.conflicts = [];
    
    if (this.reactProtectionInterval) {
      clearInterval(this.reactProtectionInterval);
    }
  }

  // Enhanced React hook wrapper with better error handling
  static wrapReactHook<T extends any[], R>(
    hookFn: (...args: T) => R,
    hookName: string
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        if (!window.React) {
          console.error(`🚨 React is not available when calling ${hookName}`);
          throw new Error(`React context unavailable for ${hookName}`);
        }
        
        if (!hookFn) {
          console.error(`🚨 ${hookName} hook function is null`);
          throw new Error(`${hookName} hook is nullified by extension`);
        }
        
        return hookFn(...args);
      } catch (error) {
        console.error(`🚨 ${hookName} failed:`, error);
        
        // Attempt recovery for useState specifically
        if (hookName === 'useState' && args.length === 1) {
          console.warn(`🔄 Attempting ${hookName} recovery...`);
          // Provide a basic fallback state management
          let state = args[0];
          const setState = (newState: any) => {
            if (typeof newState === 'function') {
              state = newState(state);
            } else {
              state = newState;
            }
          };
          return [state, setState] as R;
        }
        
        throw new Error(`${hookName} failed due to extension conflict: ${error.message}`);
      }
    };
  }
}

// Initialize on module load
const detector = ExtensionDetector.getInstance();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => detector.init());
} else {
  detector.init();
}

export default detector;
