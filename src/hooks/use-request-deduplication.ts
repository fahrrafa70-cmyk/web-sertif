/**
 * Request deduplication hook
 * Prevents multiple identical requests from running simultaneously
 * Useful for preventing duplicate API calls when components mount simultaneously
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private readonly MAX_AGE = 5000; // 5 seconds max age for pending requests

  /**
   * Deduplicate requests - if a request with the same key is already pending,
   * return the existing promise instead of making a new request
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Clean up old pending requests
    this.cleanup();

    // Check if there's already a pending request
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending requests when done
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear old pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.MAX_AGE) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook to deduplicate requests
 */
export function useRequestDeduplication<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  return requestDeduplicator.deduplicate(key, requestFn);
}

