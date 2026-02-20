"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter } from "lucide-react";

interface Tenant { id: string; name: string; }

interface SearchFilterDialogProps {
  filterModalOpen: boolean;
  setFilterModalOpen: (v: boolean) => void;
  tempTenant: string;
  setTempTenant: (v: string) => void;
  loadingTenants: boolean;
  tenants: Tenant[];
  tempCategory: string;
  setTempCategory: (v: string) => void;
  categories: string[];
  tempStartDate: string;
  setTempStartDate: (v: string) => void;
  tempEndDate: string;
  setTempEndDate: (v: string) => void;
  applyFilters: () => void;
  t: (key: string) => string;
}

export function SearchFilterDialog({
  filterModalOpen, setFilterModalOpen,
  tempTenant, setTempTenant, loadingTenants, tenants,
  tempCategory, setTempCategory, categories,
  tempStartDate, setTempStartDate, tempEndDate, setTempEndDate,
  applyFilters, t,
}: SearchFilterDialogProps) {
  return (
    <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500" />
            <DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("search.tenant") || "Organization"}</label>
            <select value={tempTenant} onChange={(e) => setTempTenant(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingTenants}>
              {loadingTenants ? <option value="">Loading organizations...</option> : (
                tenants.length === 0 ? <option value="">No organizations available</option> : (
                  <>
                    {!tempTenant && <option value="">Select organization...</option>}
                    {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                  </>
                )
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select value={tempCategory} onChange={(e) => setTempCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
            <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
            <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={applyFilters} className="px-8 gradient-primary text-white">Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
