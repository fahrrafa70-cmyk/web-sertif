/**
 * Real-time updates with optimistic UI
 * Provides instant feedback while syncing with server
 */

import { useState, useCallback, useRef, useEffect } from 'react';
// import { queryClient } from '@/lib/react-query/client'; // TODO: Implement React Query
import { toast } from 'sonner';

// Placeholder for React Query - replace with actual implementation
const queryClient = {
  setQueryData: (_key: unknown[], _updater: (old: unknown) => unknown) => {},
  getMutationCache: () => ({
    getAll: () => [] as Array<{ state: { status: string } }>
  })
};

interface CertificateData {
  id: string;
  certificate_no?: string;
  name: string;
  description?: string;
  issue_date: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface MemberData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  job?: string;
  address?: string;
  city?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

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

  private showErrorFeedback(type: string, data: T, error: unknown): void {
    const messages = {
      create: 'Failed to create',
      update: 'Failed to update',
      delete: 'Failed to delete'
    };
    
    toast.dismiss(`optimistic-${type}`);
    toast.error(`${messages[type as keyof typeof messages]}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  const [optimisticData, setOptimisticData] = useState<CertificateData[]>([]);
  const managerRef = useRef(new OptimisticUpdateManager<CertificateData>());

  const createCertificate = useCallback(async (certificateData: Omit<CertificateData, 'id' | 'created_at' | 'updated_at'>) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticCert: CertificateData = {
      ...certificateData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as CertificateData;

    return managerRef.current.executeOptimistic(
      tempId,
      // Optimistic update
      () => {
        setOptimisticData(prev => [optimisticCert, ...prev]);
        queryClient.setQueryData(['certificates'], (old: unknown) => {
          const oldData = old as CertificateData[] | undefined;
          return oldData ? [optimisticCert, ...oldData] : [optimisticCert];
        });
      },
      // Server update
      async () => {
        const { createCertificate } = await import('@/lib/supabase/certificates');
        return createCertificate(certificateData as unknown as Parameters<typeof createCertificate>[0]);
      },
      // Rollback
      () => {
        setOptimisticData(prev => prev.filter(cert => cert.id !== tempId));
        queryClient.setQueryData(['certificates'], (old: unknown) => {
          const oldData = old as CertificateData[] | undefined;
          return oldData ? oldData.filter((cert) => cert.id !== tempId) : [];
        });
      },
      'create',
      optimisticCert
    );
  }, []);

  const updateCertificate = useCallback(async (id: string, updates: Partial<CertificateData>) => {
    const actionId = `update-${id}-${Date.now()}`;
    let originalData: CertificateData | null = null;

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

        queryClient.setQueryData(['certificates'], (old: unknown) => {
          const oldData = old as CertificateData[] | undefined;
          if (!oldData) return oldData;
          return oldData.map((cert) => 
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
              restored[index] = originalData!;
              return restored;
            }
            return prev;
          });

          queryClient.setQueryData(['certificates'], (old: unknown) => {
            const oldData = old as CertificateData[] | undefined;
            if (!oldData) return oldData;
            return oldData.map((cert) => cert.id === id ? originalData! : cert);
          });
        }
      },
      'update',
      updates as unknown as CertificateData
    );
  }, []);

  const deleteCertificate = useCallback(async (id: string) => {
    const actionId = `delete-${id}-${Date.now()}`;
    let originalData: CertificateData | null = null;

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

        queryClient.setQueryData(['certificates'], (old: unknown) => {
          const oldData = old as CertificateData[] | undefined;
          return oldData ? oldData.filter((cert) => cert.id !== id) : [];
        });
      },
      // Server update
      async () => {
        const { deleteCertificate } = await import('@/lib/supabase/certificates');
        return deleteCertificate(id);
      },
      // Rollback
      () => {
        if (originalData) {
          setOptimisticData(prev => [originalData!, ...prev]);
          queryClient.setQueryData(['certificates'], (old: unknown) => {
            const oldData = old as CertificateData[] | undefined;
            return oldData ? [originalData!, ...oldData] : [originalData!];
          });
        }
      },
      'delete',
      { id } as unknown as CertificateData
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
  const [optimisticData, setOptimisticData] = useState<MemberData[]>([]);
  const managerRef = useRef(new OptimisticUpdateManager<MemberData>());

  const createMember = useCallback(async (memberData: Omit<MemberData, 'id' | 'created_at' | 'updated_at'>) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMember: MemberData = {
      ...memberData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as MemberData;

    return managerRef.current.executeOptimistic(
      tempId,
      () => {
        setOptimisticData(prev => [optimisticMember, ...prev]);
        queryClient.setQueryData(['members'], (old: unknown) => {
          const oldData = old as MemberData[] | undefined;
          return oldData ? [optimisticMember, ...oldData] : [optimisticMember];
        });
      },
      async () => {
        const { createMember } = await import('@/lib/supabase/members');
        return createMember(memberData as unknown as Parameters<typeof createMember>[0]);
      },
      () => {
        setOptimisticData(prev => prev.filter(member => member.id !== tempId));
        queryClient.setQueryData(['members'], (old: unknown) => {
          const oldData = old as MemberData[] | undefined;
          return oldData ? oldData.filter(member => member.id !== tempId) : [];
        });
      },
      'create',
      optimisticMember
    );
  }, []);

  const updateMember = useCallback(async (id: string, updates: Partial<MemberData>) => {
    const actionId = `update-${id}-${Date.now()}`;
    let originalData: MemberData | null = null;

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

        queryClient.setQueryData(['members'], (old: unknown) => {
          const oldData = old as MemberData[] | undefined;
          if (!oldData) return oldData;
          return oldData.map(member => 
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
              restored[index] = originalData!;
              return restored;
            }
            return prev;
          });

          queryClient.setQueryData(['members'], (old: unknown) => {
            const oldData = old as MemberData[] | undefined;
            if (!oldData) return oldData;
            return oldData.map(member => member.id === id ? originalData! : member);
          });
        }
      },
      'update',
      updates as unknown as MemberData
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
