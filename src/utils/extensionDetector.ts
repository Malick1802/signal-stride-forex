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

  private protectReactContext(): void {
    // Protect React hooks from being nullified by extensions
    const originalReact = window.React;
    if (originalReact) {
      Object.defineProperty(window, 'React', {
        get: () => originalReact,
        set: (value) => {
          if (value === null || value === undefined) {
            console.warn('🛡️ Prevented React context nullification by extension');
            return;
          }
          // Allow legitimate React updates
          Object.defineProperty(window, 'React', {
            value,
            writable: true,
            configurable: true
          });
        },
        configurable: true
      });
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
  }

  // Add defensive coding for React hooks
  static wrapReactHook<T extends any[], R>(
    hookFn: (...args: T) => R,
    hookName: string
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        if (!window.React) {
          throw new Error(`React is not available when calling ${hookName}`);
        }
        return hookFn(...args);
      } catch (error) {
        console.error(`🚨 ${hookName} failed:`, error);
        // Provide fallback behavior
        throw new Error(`${hookName} failed due to extension conflict`);
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