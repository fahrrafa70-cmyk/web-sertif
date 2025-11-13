"use client";

import { toast } from "sonner";

export type ConfirmOptions = {
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "destructive" | "success";
};

/**
 * Promise-based confirmation using Sonner toast with modal-style dialog in center.
 * Usage: const ok = await confirmToast("Delete item?"); if (!ok) return;
 */
export function confirmToast(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const { confirmText = "Confirm", cancelText = "Cancel", tone = "default" } = options;

  return new Promise<boolean>((resolve) => {
    const toastId = Math.random().toString(36).slice(2);
    
    toast.custom((t) => (
      <div 
        className="!fixed !inset-0 !z-[9999] !flex !items-center !justify-center !p-4 pointer-events-none"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          margin: 0,
          transform: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <div 
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl p-6 text-gray-800 dark:text-gray-100 pointer-events-auto"
          style={{ 
            animation: 'fadeInScale 0.2s ease-out',
            minWidth: '320px',
            maxWidth: 'min(400px, 90vw)',
            width: '100%',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
          }}
        >
          <div 
            className="text-base font-medium mb-4 text-gray-900 dark:text-gray-100"
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'normal',
              lineHeight: '1.5',
            }}
          >
            {message}
          </div>
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <button
              onClick={() => {
                toast.dismiss(t);
                resolve(false);
              }}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 whitespace-nowrap"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t);
                resolve(true);
              }}
              className={
                tone === "destructive"
                  ? "px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 whitespace-nowrap"
                  : tone === "success"
                  ? "px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 whitespace-nowrap"
                  : "px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity,
      id: toastId,
      className: "!fixed !inset-0 !m-0 !p-0 !w-full !h-full !max-w-full !flex !items-center !justify-center",
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        transform: 'none',
        zIndex: 9999,
      },
    });
  });
}
