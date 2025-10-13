// Circuit breaker to prevent realtime quota exhaustion
class RealtimeCircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 300000; // 5 minutes
  private readonly halfOpenTestInterval = 60000; // 1 minute

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log('🟢 Circuit breaker: Connection successful, state CLOSED');
  }

  recordFailure(error?: any) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Check if error is quota-related (402 or quota exceeded message)
    const isQuotaError = 
      error?.message?.includes('quota') || 
      error?.message?.includes('restricted') ||
      error?.status === 402;

    if (isQuotaError) {
      // Immediately open circuit for quota errors
      this.state = 'OPEN';
      console.error('🔴 Circuit breaker: QUOTA ERROR detected, opening circuit immediately');
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`🔴 Circuit breaker: OPEN after ${this.failureCount} failures`);
    }
  }

  canAttempt(): boolean {
    const now = Date.now();

    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if enough time has passed to try half-open
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🟡 Circuit breaker: Entering HALF_OPEN state for testing');
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow occasional attempts
    if (this.state === 'HALF_OPEN') {
      return now - this.lastFailureTime > this.halfOpenTestInterval;
    }

    return false;
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      canAttempt: this.canAttempt(),
      nextAttemptIn: this.state === 'OPEN' 
        ? Math.max(0, this.resetTimeout - (Date.now() - this.lastFailureTime))
        : 0
    };
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
    console.log('🔄 Circuit breaker: Manual reset');
  }
}

export const realtimeCircuitBreaker = new RealtimeCircuitBreaker();
