// Performance monitoring and optimization utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  // End timing and record the result
  endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);

    // Store the metric
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Keep only last 100 measurements
    const measurements = this.metrics.get(operation)!;
    if (measurements.length > 100) {
      measurements.shift();
    }

    return duration;
  }

  // Get performance statistics for an operation
  getStats(operation: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  // Get all performance data
  getAllStats(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [operation, measurements] of this.metrics.entries()) {
      if (measurements.length > 0) {
        const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
        const min = Math.min(...measurements);
        const max = Math.max(...measurements);
        
        result[operation] = { avg, min, max, count: measurements.length };
      }
    }

    return result;
  }

  // Clear all metrics
  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Performance decorator for async functions
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.startTimer(operationName);
    
    try {
      const result = await fn(...args);
      const duration = monitor.endTimer(operationName);
      
      // Log slow operations (> 1000ms)
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      monitor.endTimer(operationName);
      throw error;
    }
  }) as T;
}

// Memory usage monitoring
export class MemoryMonitor {
  static getMemoryUsage(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    memoryUsagePercent: number;
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent
      };
    }
    return null;
  }

  static logMemoryUsage(operation?: string): void {
    const usage = this.getMemoryUsage();
    if (usage) {
      const prefix = operation ? `[${operation}]` : '';
      console.log(`${prefix} Memory usage: ${(usage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB (${usage.memoryUsagePercent.toFixed(1)}%)`);
      
      // Warn if memory usage is high
      if (usage.memoryUsagePercent > 80) {
        console.warn(`High memory usage detected: ${usage.memoryUsagePercent.toFixed(1)}%`);
      }
    }
  }
}

// Component render performance tracker
export class RenderMonitor {
  private static renderCounts: Map<string, number> = new Map();
  private static renderTimes: Map<string, number[]> = new Map();

  static trackRender(componentName: string): void {
    const count = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, count + 1);
  }

  static trackRenderTime(componentName: string, duration: number): void {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }
    
    const times = this.renderTimes.get(componentName)!;
    times.push(duration);
    
    // Keep only last 50 measurements
    if (times.length > 50) {
      times.shift();
    }
  }

  static getRenderStats(): Record<string, { count: number; avgTime?: number }> {
    const result: Record<string, { count: number; avgTime?: number }> = {};
    
    for (const [component, count] of this.renderCounts.entries()) {
      result[component] = { count };
      
      const times = this.renderTimes.get(component);
      if (times && times.length > 0) {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        result[component].avgTime = avgTime;
      }
    }
    
    return result;
  }

  static reset(): void {
    this.renderCounts.clear();
    this.renderTimes.clear();
  }
}

// Network request monitoring
export class NetworkMonitor {
  private static requests: Array<{
    url: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }> = [];

  static trackRequest(
    url: string,
    method: string,
    duration: number,
    status: number
  ): void {
    this.requests.push({
      url,
      method,
      duration,
      status,
      timestamp: Date.now()
    });

    // Keep only last 100 requests
    if (this.requests.length > 100) {
      this.requests.shift();
    }

    // Log slow requests
    if (duration > 2000) {
      console.warn(`Slow network request: ${method} ${url} took ${duration}ms`);
    }
  }

  static getNetworkStats(): {
    totalRequests: number;
    avgDuration: number;
    slowRequests: number;
    errorRequests: number;
  } {
    const total = this.requests.length;
    const avgDuration = total > 0 
      ? this.requests.reduce((sum, req) => sum + req.duration, 0) / total 
      : 0;
    const slowRequests = this.requests.filter(req => req.duration > 2000).length;
    const errorRequests = this.requests.filter(req => req.status >= 400).length;

    return { totalRequests: total, avgDuration, slowRequests, errorRequests };
  }

  static getRecentRequests(limit = 20): Array<{
    url: string;
    method: string;
    duration: number;
    status: number;
    timestamp: number;
  }> {
    return this.requests.slice(-limit);
  }

  static reset(): void {
    this.requests.length = 0;
  }
}

// Overall performance summary
export function getPerformanceSummary(): {
  performance: Record<string, any>;
  memory: any;
  renders: Record<string, any>;
  network: any;
} {
  return {
    performance: PerformanceMonitor.getInstance().getAllStats(),
    memory: MemoryMonitor.getMemoryUsage(),
    renders: RenderMonitor.getRenderStats(),
    network: NetworkMonitor.getNetworkStats()
  };
}
