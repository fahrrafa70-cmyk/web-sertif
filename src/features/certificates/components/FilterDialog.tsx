"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter } from "lucide-react";

interface FilterDialogProps {
  filterModalOpen: boolean;
  setFilterModalOpen: (open: boolean) => void;
  tempCategoryFilter: string;
  setTempCategoryFilter: (v: string) => void;
  tempDateFilter: string;
  setTempDateFilter: (v: string) => void;
  applyFilters: () => void;
  cancelFilters: () => void;
}

export function FilterDialog({
  filterModalOpen, setFilterModalOpen,
  tempCategoryFilter, setTempCategoryFilter,
  tempDateFilter, setTempDateFilter,
  applyFilters, cancelFilters,
}: FilterDialogProps) {
  return (
    <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
      <DialogContent
        className="sm:max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); applyFilters(); }
          else if (e.key === "Escape") { e.preventDefault(); cancelFilters(); }
        }}
      >
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500" />
            <DialogTitle className="text-gray-900 dark:text-white">Filter</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={tempCategoryFilter}
              onChange={(e) => setTempCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="MoU">MoU</option>
              <option value="Internship">Internship</option>
              <option value="Training">Training</option>
              <option value="Seminar">Seminar</option>
              <option value="Visit">Visit</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Issue Date</label>
            <input
              type="date"
              value={tempDateFilter}
              onChange={(e) => setTempDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={cancelFilters} variant="outline" className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={applyFilters} className="flex-1 gradient-primary text-white">
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
