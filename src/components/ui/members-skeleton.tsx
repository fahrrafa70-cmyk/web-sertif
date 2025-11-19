"use client";

import { memo } from "react";
import { Skeleton } from "./skeleton";
import { Users, Search, Filter } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

// 🎨 Members skeleton yang sesuai dengan layout asli
const MembersPageSkeleton = memo(() => {
  
  return (
    <section 
      className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8"
      style={{ backgroundColor: 'var(--background, #f9fafb)' } as React.CSSProperties}
    >
      <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
        {/* Header - REAL TITLE (tidak skeleton) */}
        <div className="mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-green-500">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                Data
              </h1>
            </div>
            
            {/* Add Button Skeleton */}
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg p-4 sm:p-6 max-w-full">
          {/* Search Bar ASLI */}
          <div className="flex items-center gap-2 mt-6 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <Input
                placeholder="Search data by name, email, organization..."
                className="h-10 pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm sm:text-base flex items-center"
                disabled
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-10 w-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-center relative"
              disabled
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>

          {/* Table */}
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <Skeleton className="h-4 col-span-4" />
              <Skeleton className="h-4 col-span-3" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-1" />
            </div>

            {/* Table Rows */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="col-span-4">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-4 col-span-3" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-2" />
                <div className="col-span-1 flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

MembersPageSkeleton.displayName = "MembersPageSkeleton";

export { MembersPageSkeleton };
