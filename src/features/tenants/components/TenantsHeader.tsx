"use client";

import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";

interface TenantsHeaderProps {
  currentUserId: string | null;
  isOwner: boolean;
  setCreateOpen: (open: boolean) => void;
}

export function TenantsHeader({ currentUserId, isOwner, setCreateOpen }: TenantsHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">Tenants</h1>
      </div>
      {currentUserId && isOwner && (
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /><span>New tenant</span>
        </Button>
      )}
    </div>
  );
}
