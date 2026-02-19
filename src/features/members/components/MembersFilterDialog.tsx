"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter } from "lucide-react";

interface MembersFilterDialogProps {
  filterModalOpen: boolean;
  setFilterModalOpen: (v: boolean) => void;
  tempOrganizationFilter: string;
  setTempOrganizationFilter: (v: string) => void;
  tempCityFilter: string;
  setTempCityFilter: (v: string) => void;
  tempJobFilter: string;
  setTempJobFilter: (v: string) => void;
  uniqueOrganizations: string[];
  uniqueCities: string[];
  uniqueJobs: string[];
  applyFilters: () => void;
  cancelFilters: () => void;
}

export function MembersFilterDialog({
  filterModalOpen, setFilterModalOpen,
  tempOrganizationFilter, setTempOrganizationFilter,
  tempCityFilter, setTempCityFilter,
  tempJobFilter, setTempJobFilter,
  uniqueOrganizations, uniqueCities, uniqueJobs,
  applyFilters, cancelFilters,
}: MembersFilterDialogProps) {
  return (
    <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
      <DialogContent
        className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-visible"
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxHeight: "80vh" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); applyFilters(); }
          else if (e.key === "Escape") { e.preventDefault(); cancelFilters(); }
        }}
      >
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-2"><Filter className="h-5 w-5 text-blue-500" /><DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle></div>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</label>
            <select value={tempOrganizationFilter} onChange={(e) => setTempOrganizationFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ position: "relative", zIndex: 1 }}>
              <option value="">All</option>
              {uniqueOrganizations.map((org) => <option key={org} value={org}>{org}</option>)}
            </select>
          </div>
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
            <select value={tempCityFilter} onChange={(e) => setTempCityFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ position: "relative", zIndex: 1 }}>
              <option value="">All</option>
              {uniqueCities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job</label>
            <select value={tempJobFilter} onChange={(e) => setTempJobFilter(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ position: "relative", zIndex: 1 }}>
              <option value="">All</option>
              {uniqueJobs.map((job) => <option key={job} value={job}>{job}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={cancelFilters} variant="outline" className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</Button>
          <Button onClick={applyFilters} className="flex-1 gradient-primary text-white">Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
