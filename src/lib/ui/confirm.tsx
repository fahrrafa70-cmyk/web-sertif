"use client";

import { type ReactNode } from "react";
import { toast } from "sonner";

export type ConfirmOptions = {
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "destructive" | "success";
};

/**
 * Promise-based confirmation using Sonner toast. Avoids blocking browser dialogs.
 * Usage: const ok = await confirmToast("Delete item?"); if (!ok) return;
 */
export function confirmToast(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const { confirmText = "Confirm", cancelText = "Cancel", tone = "default" } = options;

  return new Promise<boolean>((resolve) => {
    toast.custom((t) => (
      <div className="max-w-sm w-[360px] rounded-lg border bg-white shadow-lg p-4 text-gray-800">
        <div className="text-sm font-medium mb-3">{message}</div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              toast.dismiss(t);
              resolve(false);
            }}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
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
                ? "px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                : tone === "success"
                ? "px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                : "px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      id: Math.random().toString(36).slice(2),
    });
  });
}
