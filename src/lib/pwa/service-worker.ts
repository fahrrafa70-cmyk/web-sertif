/**
 * Service Worker registration and PWA utilities
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private async init() {
    // Check if already installed
    this.isInstalled = this.checkIfInstalled();
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Setup install prompt handling
    this.setupInstallPrompt();
    
    // Setup online/offline detection
    this.setupNetworkDetection();
    
    // Setup push notifications
    this.setupPushNotifications();
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('✅ Service Worker registered:', this.registration.scope);

        // Handle updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.showUpdateAvailable();
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Save the event so it can be triggered later
      this.deferredPrompt = e;
      
      // Show custom install button
      this.showInstallButton();
      
      console.log('📱 PWA install prompt available');
    });

    // Detect when PWA is installed
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
      this.trackInstallation();
    });
  }

  /**
   * Setup network detection
   */
  private setupNetworkDetection(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.showNetworkStatus('online');
      this.syncOfflineActions();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline');
      this.showNetworkStatus('offline');
    });

    // Initial status
    if (!navigator.onLine) {
      this.showNetworkStatus('offline');
    }
  }

  /**
   * Setup push notifications
   */
  private async setupPushNotifications(): Promise<void> {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      // Request permission if not already granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('🔔 Notification permission:', permission);
      }
    }
  }

  /**
   * Show install button
   */
  private showInstallButton(): void {
    // Create or show install button
    let installButton = document.getElementById('pwa-install-button');
    
    if (!installButton) {
      installButton = document.createElement('button');
      installButton.id = 'pwa-install-button';
      installButton.innerHTML = `
        <span>📱</span>
        <span>Install App</span>
      `;
      installButton.className = `
        fixed bottom-4 right-4 z-50 
        bg-blue-600 hover:bg-blue-700 
        text-white font-medium 
        px-4 py-2 rounded-lg shadow-lg 
        flex items-center gap-2 
        transition-all duration-200
        hover:scale-105
      `;
      
      installButton.addEventListener('click', () => this.promptInstall());
      document.body.appendChild(installButton);
    }
    
    installButton.style.display = 'flex';
  }

  /**
   * Hide install button
   */
  private hideInstallButton(): void {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  /**
   * Prompt user to install PWA
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('❌ No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await this.deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('📱 Install prompt result:', outcome);
      
      // Clear the prompt
      this.deferredPrompt = null;
      
      if (outcome === 'accepted') {
        this.hideInstallButton();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Show network status
   */
  private showNetworkStatus(status: 'online' | 'offline'): void {
    // Remove existing status
    const existingStatus = document.getElementById('network-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    if (status === 'offline') {
      const statusBar = document.createElement('div');
      statusBar.id = 'network-status';
      statusBar.innerHTML = `
        <div class="flex items-center justify-center gap-2 bg-yellow-500 text-white px-4 py-2 text-sm">
          <span>📱</span>
          <span>You're offline. Some features may be limited.</span>
        </div>
      `;
      statusBar.className = 'fixed top-0 left-0 right-0 z-50';
      document.body.appendChild(statusBar);
    }
  }

  /**
   * Show update available notification
   */
  private showUpdateAvailable(): void {
    const updateBar = document.createElement('div');
    updateBar.innerHTML = `
      <div class="flex items-center justify-between bg-blue-600 text-white px-4 py-3">
        <div class="flex items-center gap-2">
          <span>🔄</span>
          <span>A new version is available!</span>
        </div>
        <button id="update-app-button" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
          Update
        </button>
      </div>
    `;
    updateBar.className = 'fixed top-0 left-0 right-0 z-50';
    
    const updateButton = updateBar.querySelector('#update-app-button');
    updateButton?.addEventListener('click', () => {
      this.updateApp();
      updateBar.remove();
    });
    
    document.body.appendChild(updateBar);
  }

  /**
   * Update the app
   */
  private updateApp(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(data: any): void {
    console.log('📨 Message from Service Worker:', data);
    
    if (data.type === 'CACHE_UPDATED') {
      console.log('✅ Cache updated:', data.url);
    } else if (data.type === 'OFFLINE_FALLBACK') {
      console.log('📱 Serving offline fallback for:', data.url);
    }
  }

  /**
   * Sync offline actions
   */
  private async syncOfflineActions(): Promise<void> {
    if (this.registration && 'sync' in this.registration) {
      try {
        await (this.registration as any).sync.register('certificate-actions');
        await (this.registration as any).sync.register('member-actions');
        console.log('🔄 Background sync registered');
      } catch (error) {
        console.error('❌ Background sync registration failed:', error);
      }
    }
  }

  /**
   * Check if PWA is installed
   */
  private checkIfInstalled(): boolean {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // Check if running in PWA mode on iOS
    if ((window.navigator as any).standalone === true) {
      return true;
    }
    
    return false;
  }

  /**
   * Track installation for analytics
   */
  private trackInstallation(): void {
    // Track PWA installation
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'App Installed'
      });
    }
    
    console.log('📊 PWA installation tracked');
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('❌ Service Worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ) as BufferSource
      });

      console.log('🔔 Push subscription created:', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Send push subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      console.log('✅ Push subscription sent to server');
    } catch (error) {
      console.error('❌ Failed to send subscription to server:', error);
    }
  }

  /**
   * Convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Public API
  public get isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public get canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  public get isOnline(): boolean {
    return navigator.onLine;
  }
}

// Singleton instance
export const pwaManager = new PWAManager();

// React hook for PWA functionality
export function usePWA() {
  return {
    isInstalled: pwaManager.isAppInstalled,
    canInstall: pwaManager.canInstall,
    isOnline: pwaManager.isOnline,
    promptInstall: () => pwaManager.promptInstall(),
    subscribeToPush: () => pwaManager.subscribeToPush(),
  };
}
