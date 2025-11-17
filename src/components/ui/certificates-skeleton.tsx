"use client";

import { memo } from "react";
import { Skeleton } from "./skeleton";
import { FileText } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

// 🎨 Certificates skeleton yang sesuai dengan layout asli
const CertificatesPageSkeleton = memo(() => {
  const { t } = useLanguage();
  
  return (
    <section 
      className="relative -mt-4 pb-6 sm:-mt-5 sm:pb-8"
      style={{ backgroundColor: 'var(--background, #f9fafb)' } as React.CSSProperties}
    >
      <div className="w-full max-w-[1280px] mx-auto px-2 sm:px-3 lg:px-0 relative">
        {/* Header - REAL TITLE (tidak skeleton) */}
        <div className="mb-3">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md flex-shrink-0 gradient-primary">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2563eb] dark:text-blue-400">
                  {t("certificates.title")}
                </h1>
              </div>
              
              {/* Quick Generate Button Skeleton */}
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md dark:shadow-lg p-4 sm:p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>

          {/* Table Header */}
          <div className="mb-4">
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <Skeleton className="h-4 col-span-3" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-2" />
              <Skeleton className="h-4 col-span-1" />
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="col-span-3">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-2" />
                <Skeleton className="h-4 col-span-2" />
                <div className="col-span-1 flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <Skeleton className="h-4 w-32" />
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

CertificatesPageSkeleton.displayName = "CertificatesPageSkeleton";

export { CertificatesPageSkeleton };
