/**
 * Background sync for offline actions
 * Queues actions when offline and syncs when back online
 */

import { useState, useEffect } from 'react';

interface OfflineAction {
  id: string;
  type: 'certificate' | 'member' | 'template';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

class BackgroundSyncManager {
  private dbName = 'OfflineActionsDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    this.initDatabase();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initDatabase(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains('actions')) {
            const store = db.createObjectStore('actions', { keyPath: 'id' });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('retryCount', 'retryCount', { unique: false });
          }
        };
      });
      
      console.log('✅ Background sync database initialized');
    } catch (error) {
      console.error('❌ Failed to initialize background sync database:', error);
    }
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online - starting background sync');
      this.isOnline = true;
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline - queuing actions for sync');
      this.isOnline = false;
    });
  }

  /**
   * Start periodic sync attempts
   */
  private startPeriodicSync(): void {
    // Try to sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  /**
   * Queue action for background sync
   */
  async queueAction(
    type: 'certificate' | 'member' | 'template',
    action: 'create' | 'update' | 'delete',
    data: any,
    maxRetries: number = 5
  ): Promise<string> {
    const actionId = `${type}-${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineAction: OfflineAction = {
      id: actionId,
      type,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    if (this.isOnline) {
      // Try to execute immediately if online
      try {
        const result = await this.executeAction(offlineAction);
        if (result.success) {
          console.log('✅ Action executed immediately:', actionId);
          return actionId;
        }
      } catch (error) {
        console.log('⚠️ Immediate execution failed, queuing for later:', error);
      }
    }

    // Queue for later execution
    await this.storeAction(offlineAction);
    console.log('📝 Action queued for background sync:', actionId);
    
    // Show user feedback
    this.showQueuedFeedback(type, action);
    
    return actionId;
  }

  /**
   * Store action in IndexedDB
   */
  private async storeAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(action);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending actions
   */
  private async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['actions'], 'readonly');
    const store = transaction.objectStore('actions');
    
    return new Promise<OfflineAction[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove action from queue
   */
  private async removeAction(actionId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(actionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update action retry count
   */
  private async updateActionRetryCount(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    action.retryCount++;
    await this.storeAction(action);
  }

  /**
   * Sync all pending actions
   */
  async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('🔄 Starting background sync...');

    try {
      const pendingActions = await this.getPendingActions();
      
      if (pendingActions.length === 0) {
        console.log('✅ No pending actions to sync');
        return;
      }

      console.log(`📋 Found ${pendingActions.length} pending actions`);
      
      // Sort by timestamp (oldest first)
      pendingActions.sort((a, b) => a.timestamp - b.timestamp);

      let successCount = 0;
      let failureCount = 0;

      for (const action of pendingActions) {
        try {
          const result = await this.executeAction(action);
          
          if (result.success) {
            await this.removeAction(action.id);
            successCount++;
            console.log('✅ Synced action:', action.id);
          } else {
            if (action.retryCount >= action.maxRetries) {
              await this.removeAction(action.id);
              failureCount++;
              console.error('❌ Action failed permanently:', action.id, result.error);
            } else {
              await this.updateActionRetryCount(action);
              console.warn('⚠️ Action failed, will retry:', action.id, result.error);
            }
          }
        } catch (error) {
          if (action.retryCount >= action.maxRetries) {
            await this.removeAction(action.id);
            failureCount++;
            console.error('❌ Action failed permanently:', action.id, error);
          } else {
            await this.updateActionRetryCount(action);
            console.warn('⚠️ Action failed, will retry:', action.id, error);
          }
        }

        // Small delay between actions to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Show sync results
      this.showSyncResults(successCount, failureCount);

    } catch (error) {
      console.error('❌ Background sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: OfflineAction): Promise<SyncResult> {
    try {
      let result: any;

      switch (action.type) {
        case 'certificate':
          result = await this.executeCertificateAction(action);
          break;
        case 'member':
          result = await this.executeMemberAction(action);
          break;
        case 'template':
          result = await this.executeTemplateAction(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Execute certificate actions
   */
  private async executeCertificateAction(action: OfflineAction): Promise<any> {
    const { createCertificate, updateCertificate, deleteCertificate } = 
      await import('@/lib/supabase/certificates');

    switch (action.action) {
      case 'create':
        return createCertificate(action.data);
      case 'update':
        return updateCertificate(action.data.id, action.data.updates);
      case 'delete':
        return deleteCertificate(action.data.id);
      default:
        throw new Error(`Unknown certificate action: ${action.action}`);
    }
  }

  /**
   * Execute member actions
   */
  private async executeMemberAction(action: OfflineAction): Promise<any> {
    const { createMember, updateMember, deleteMember } = 
      await import('@/lib/supabase/members');

    switch (action.action) {
      case 'create':
        return createMember(action.data);
      case 'update':
        return updateMember(action.data.id, action.data.updates);
      case 'delete':
        return deleteMember(action.data.id);
      default:
        throw new Error(`Unknown member action: ${action.action}`);
    }
  }

  /**
   * Execute template actions
   */
  private async executeTemplateAction(action: OfflineAction): Promise<any> {
    // Implement template actions when available
    throw new Error('Template actions not implemented yet');
  }

  /**
   * Show feedback for queued actions
   */
  private showQueuedFeedback(type: string, action: string): void {
    const { toast } = require('sonner');
    
    const messages = {
      create: `${type} will be created when back online`,
      update: `${type} will be updated when back online`,
      delete: `${type} will be deleted when back online`
    };

    toast.info(messages[action as keyof typeof messages] || 'Action queued for sync', {
      duration: 3000,
      icon: '📱'
    });
  }

  /**
   * Show sync results
   */
  private showSyncResults(successCount: number, failureCount: number): void {
    const { toast } = require('sonner');

    if (successCount > 0 && failureCount === 0) {
      toast.success(`✅ Synced ${successCount} action${successCount > 1 ? 's' : ''}`, {
        duration: 3000
      });
    } else if (successCount > 0 && failureCount > 0) {
      toast.warning(`⚠️ Synced ${successCount}, failed ${failureCount}`, {
        duration: 5000
      });
    } else if (failureCount > 0) {
      toast.error(`❌ Failed to sync ${failureCount} action${failureCount > 1 ? 's' : ''}`, {
        duration: 5000
      });
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingCount: number;
    syncInProgress: boolean;
    lastSyncTime?: number;
  }> {
    const pendingActions = await this.getPendingActions();
    
    return {
      isOnline: this.isOnline,
      pendingCount: pendingActions.length,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.getLastSyncTime()
    };
  }

  /**
   * Get last sync time from localStorage
   */
  private getLastSyncTime(): number | undefined {
    try {
      const lastSync = localStorage.getItem('lastBackgroundSync');
      return lastSync ? parseInt(lastSync, 10) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Set last sync time
   */
  private setLastSyncTime(): void {
    try {
      localStorage.setItem('lastBackgroundSync', Date.now().toString());
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Clear all pending actions (for testing/debugging)
   */
  async clearAllActions(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('🗑️ All pending actions cleared');
  }
}

// Singleton instance
export const backgroundSyncManager = new BackgroundSyncManager();

/**
 * React hook for background sync
 */
export function useBackgroundSync() {
  const [syncStatus, setSyncStatus] = useState<{
    isOnline: boolean;
    pendingCount: number;
    syncInProgress: boolean;
    lastSyncTime?: number;
  }>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    syncInProgress: false,
    lastSyncTime: undefined
  });

  useEffect(() => {
    const updateStatus = async () => {
      const status = await backgroundSyncManager.getSyncStatus();
      setSyncStatus(status);
    };

    // Update status periodically
    const interval = setInterval(updateStatus, 5000);
    
    // Initial update
    updateStatus();

    return () => clearInterval(interval);
  }, []);

  return {
    ...syncStatus,
    queueAction: backgroundSyncManager.queueAction.bind(backgroundSyncManager),
    syncNow: backgroundSyncManager.syncPendingActions.bind(backgroundSyncManager),
    clearAll: backgroundSyncManager.clearAllActions.bind(backgroundSyncManager)
  };
}
