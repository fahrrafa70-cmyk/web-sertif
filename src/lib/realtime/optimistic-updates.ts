/**
 * Real-time updates with optimistic UI
 * Provides instant feedback while syncing with server
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { queryClient } from '@/lib/react-query/client';
import { toast } from 'sonner';

interface OptimisticAction<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  originalData?: T;
  timestamp: number;
  status: 'pending' | 'success' | 'error';
  retryCount: number;
}

interface OptimisticConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  rollbackOnError: boolean;
}

class OptimisticUpdateManager<T> {
  private actions = new Map<string, OptimisticAction<T>>();
  private config: OptimisticConfig;

  constructor(config: Partial<OptimisticConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      rollbackOnError: true,
      ...config
    };
  }

  /**
   * Execute optimistic update
   */
  async executeOptimistic<R>(
    actionId: string,
    optimisticUpdate: () => void,
    serverUpdate: () => Promise<R>,
    rollback: () => void,
    type: 'create' | 'update' | 'delete',
    data: T
  ): Promise<R> {
    const action: OptimisticAction<T> = {
      id: actionId,
      type,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    this.actions.set(actionId, action);

    try {
      // Apply optimistic update immediately
      optimisticUpdate();
      
      // Show optimistic feedback
      this.showOptimisticFeedback(type, data);

      // Execute server update with timeout
      const result = await Promise.race([
        serverUpdate(),
        this.createTimeout(this.config.timeout)
      ]);

      // Mark as success
      action.status = 'success';
      this.actions.delete(actionId);
      
      // Show success feedback
      this.showSuccessFeedback(type, data);

      return result;

    } catch (error) {
      console.error('Optimistic update failed:', error);
      action.status = 'error';

      if (this.config.rollbackOnError) {
        rollback();
        this.showErrorFeedback(type, data, error);
      } else {
        // Queue for retry
        this.queueRetry(actionId, optimisticUpdate, serverUpdate, rollback, type, data);
      }

      throw error;
    }
  }

  /**
   * Retry failed actions
   */
  private async queueRetry<R>(
    actionId: string,
    optimisticUpdate: () => void,
    serverUpdate: () => Promise<R>,
    rollback: () => void,
    type: 'create' | 'update' | 'delete',
    data: T
  ): Promise<void> {
    const action = this.actions.get(actionId);
    if (!action || action.retryCount >= this.config.maxRetries) {
      if (action) {
        rollback();
        this.showErrorFeedback(type, data, new Error('Max retries exceeded'));
        this.actions.delete(actionId);
      }
      return;
    }

    action.retryCount++;
    
    // Exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, action.retryCount - 1);
    
    setTimeout(async () => {
      try {
        await serverUpdate();
        action.status = 'success';
        this.actions.delete(actionId);
        this.showSuccessFeedback(type, data);
      } catch (error) {
        this.queueRetry(actionId, optimisticUpdate, serverUpdate, rollback, type, data);
      }
    }, delay);
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  }

  /**
   * Show feedback messages
   */
  private showOptimisticFeedback(type: string, data: T): void {
    const messages = {
      create: 'Creating...',
      update: 'Updating...',
      delete: 'Deleting...'
    };
    
    toast.loading(messages[type as keyof typeof messages], {
      id: `optimistic-${type}`,
      duration: 2000
    });
  }

  private showSuccessFeedback(type: string, data: T): void {
    const messages = {
      create: 'Created successfully',
      update: 'Updated successfully', 
      delete: 'Deleted successfully'
    };
    
    toast.dismiss(`optimistic-${type}`);
    toast.success(messages[type as keyof typeof messages]);
  }

  private showErrorFeedback(type: string, data: T, error: any): void {
    const messages = {
      create: 'Failed to create',
      update: 'Failed to update',
      delete: 'Failed to delete'
    };
    
    toast.dismiss(`optimistic-${type}`);
    toast.error(`${messages[type as keyof typeof messages]}: ${error.message}`);
  }

  /**
   * Get pending actions
   */
  getPendingActions(): OptimisticAction<T>[] {
    return Array.from(this.actions.values()).filter(action => action.status === 'pending');
  }

  /**
   * Clear all actions
   */
  clear(): void {
    this.actions.clear();
  }
}

/**
 * Hook for optimistic certificate updates
 */
export function useOptimisticCertificates() {
  const [optimisticData, setOptimisticData] = useState<any[]>([]);
  const managerRef = useRef(new OptimisticUpdateManager());

  const createCertificate = useCallback(async (certificateData: any) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticCert = {
      ...certificateData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return managerRef.current.executeOptimistic(
      tempId,
      // Optimistic update
      () => {
        setOptimisticData(prev => [optimisticCert, ...prev]);
        queryClient.setQueryData(['certificates'], (old: any[]) => 
          old ? [optimisticCert, ...old] : [optimisticCert]
        );
      },
      // Server update
      async () => {
        const { createCertificate } = await import('@/lib/supabase/certificates');
        return createCertificate(certificateData);
      },
      // Rollback
      () => {
        setOptimisticData(prev => prev.filter(cert => cert.id !== tempId));
        queryClient.setQueryData(['certificates'], (old: any[]) => 
          old ? old.filter((cert: any) => cert.id !== tempId) : []
        );
      },
      'create',
      certificateData
    );
  }, []);

  const updateCertificate = useCallback(async (id: string, updates: any) => {
    const actionId = `update-${id}-${Date.now()}`;
    let originalData: any = null;

    return managerRef.current.executeOptimistic(
      actionId,
      // Optimistic update
      () => {
        setOptimisticData(prev => {
          const index = prev.findIndex(cert => cert.id === id);
          if (index >= 0) {
            originalData = prev[index];
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updates, updated_at: new Date().toISOString() };
            return updated;
          }
          return prev;
        });

        queryClient.setQueryData(['certificates'], (old: any[]) => {
          if (!old) return old;
          return old.map((cert: any) => 
            cert.id === id ? { ...cert, ...updates, updated_at: new Date().toISOString() } : cert
          );
        });
      },
      // Server update
      async () => {
        const { updateCertificate } = await import('@/lib/supabase/certificates');
        return updateCertificate(id, updates);
      },
      // Rollback
      () => {
        if (originalData) {
          setOptimisticData(prev => {
            const index = prev.findIndex(cert => cert.id === id);
            if (index >= 0) {
              const restored = [...prev];
              restored[index] = originalData;
              return restored;
            }
            return prev;
          });

          queryClient.setQueryData(['certificates'], (old: any[]) => {
            if (!old) return old;
            return old.map((cert: any) => cert.id === id ? originalData : cert);
          });
        }
      },
      'update',
      updates
    );
  }, []);

  const deleteCertificate = useCallback(async (id: string) => {
    const actionId = `delete-${id}-${Date.now()}`;
    let originalData: any = null;

    return managerRef.current.executeOptimistic(
      actionId,
      // Optimistic update
      () => {
        setOptimisticData(prev => {
          const index = prev.findIndex(cert => cert.id === id);
          if (index >= 0) {
            originalData = prev[index];
            return prev.filter(cert => cert.id !== id);
          }
          return prev;
        });

        queryClient.setQueryData(['certificates'], (old: any[]) => 
          old ? old.filter((cert: any) => cert.id !== id) : []
        );
      },
      // Server update
      async () => {
        const { deleteCertificate } = await import('@/lib/supabase/certificates');
        return deleteCertificate(id);
      },
      // Rollback
      () => {
        if (originalData) {
          setOptimisticData(prev => [originalData, ...prev]);
          queryClient.setQueryData(['certificates'], (old: any[]) => 
            old ? [originalData, ...old] : [originalData]
          );
        }
      },
      'delete',
      { id }
    );
  }, []);

  return {
    optimisticData,
    createCertificate,
    updateCertificate,
    deleteCertificate,
    pendingActions: managerRef.current.getPendingActions(),
  };
}

/**
 * Hook for optimistic member updates
 */
export function useOptimisticMembers() {
  const [optimisticData, setOptimisticData] = useState<any[]>([]);
  const managerRef = useRef(new OptimisticUpdateManager());

  const createMember = useCallback(async (memberData: any) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMember = {
      ...memberData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return managerRef.current.executeOptimistic(
      tempId,
      () => {
        setOptimisticData(prev => [optimisticMember, ...prev]);
        queryClient.setQueryData(['members'], (old: any[]) => 
          old ? [optimisticMember, ...old] : [optimisticMember]
        );
      },
      async () => {
        const { createMember } = await import('@/lib/supabase/members');
        return createMember(memberData);
      },
      () => {
        setOptimisticData(prev => prev.filter(member => member.id !== tempId));
        queryClient.setQueryData(['members'], (old: any[]) => 
          old ? old.filter((member: any) => member.id !== tempId) : []
        );
      },
      'create',
      memberData
    );
  }, []);

  const updateMember = useCallback(async (id: string, updates: any) => {
    const actionId = `update-${id}-${Date.now()}`;
    let originalData: any = null;

    return managerRef.current.executeOptimistic(
      actionId,
      () => {
        setOptimisticData(prev => {
          const index = prev.findIndex(member => member.id === id);
          if (index >= 0) {
            originalData = prev[index];
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updates, updated_at: new Date().toISOString() };
            return updated;
          }
          return prev;
        });

        queryClient.setQueryData(['members'], (old: any[]) => {
          if (!old) return old;
          return old.map((member: any) => 
            member.id === id ? { ...member, ...updates, updated_at: new Date().toISOString() } : member
          );
        });
      },
      async () => {
        const { updateMember } = await import('@/lib/supabase/members');
        return updateMember(id, updates);
      },
      () => {
        if (originalData) {
          setOptimisticData(prev => {
            const index = prev.findIndex(member => member.id === id);
            if (index >= 0) {
              const restored = [...prev];
              restored[index] = originalData;
              return restored;
            }
            return prev;
          });

          queryClient.setQueryData(['members'], (old: any[]) => {
            if (!old) return old;
            return old.map((member: any) => member.id === id ? originalData : member);
          });
        }
      },
      'update',
      updates
    );
  }, []);

  return {
    optimisticData,
    createMember,
    updateMember,
    pendingActions: managerRef.current.getPendingActions(),
  };
}

/**
 * Real-time sync status indicator
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }

      // Check for pending React Query mutations
      const mutationCache = queryClient.getMutationCache();
      const pendingMutations = mutationCache.getAll().filter(
        mutation => mutation.state.status === 'pending'
      );

      setPendingCount(pendingMutations.length);

      if (pendingMutations.length > 0) {
        setStatus('syncing');
      } else if (mutationCache.getAll().some(m => m.state.status === 'error')) {
        setStatus('error');
      } else {
        setStatus('synced');
      }
    };

    // Update status periodically
    const interval = setInterval(updateStatus, 1000);
    
    // Update on network changes
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Initial update
    updateStatus();

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return { status, pendingCount };
}
