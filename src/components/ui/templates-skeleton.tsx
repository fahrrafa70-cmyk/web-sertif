"use client";

import { memo } from "react";
import { Skeleton } from "./skeleton";
import { Layout, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

// 🎨 Templates skeleton yang sesuai dengan layout asli
const TemplatesPageSkeleton = memo(() => {
  const { t } = useLanguage();
  
  return (
    <section className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8 bg-gray-50 dark:bg-gray-900 duration-500">
      <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
        {/* Header Section - REAL TITLE (tidak skeleton) */}
        <div className="mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 w-full">
            {/* Title - TAMPILKAN ASLI */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md flex-shrink-0 bg-blue-500">
                <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                {t('templates.title')}
              </h1>
            </div>
            
            {/* Create Button Skeleton */}
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Main Content Card - Sesuai layout asli */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg p-4 sm:p-6 max-w-full">
          {/* Search Bar Skeleton - Inside Card */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-16 rounded-lg" />
            </div>
          </div>

          {/* Templates Grid - Sesuai layout asli */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex flex-row h-[200px] w-full">
                {/* Template Thumbnail - Left Side */}
                <div className="relative w-[160px] h-full flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden border-r border-gray-200 dark:border-gray-700">
                  <Skeleton className="w-full h-full" />
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <Skeleton className="w-12 h-5 rounded-full" />
                  </div>
                </div>

                {/* Template Info - Right Side */}
                <div className="flex-1 flex flex-col justify-between min-w-0 p-4 w-full overflow-hidden">
                  {/* Title */}
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  
                  {/* Category Badge */}
                  <Skeleton className="h-6 w-20 rounded mb-2" />
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-3 mb-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-8 w-20 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

TemplatesPageSkeleton.displayName = "TemplatesPageSkeleton";

export { TemplatesPageSkeleton };
