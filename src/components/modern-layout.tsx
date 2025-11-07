"use client";

import { memo } from "react";
import ModernSidebar from "./modern-sidebar";
import ModernHeader from "./modern-header";

interface ModernLayoutProps {
  children: React.ReactNode;
}

const ModernLayout = memo(function ModernLayout({ children }: ModernLayoutProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 w-full">
      {/* Header - Full Width */}
      <ModernHeader />

      {/* Sidebar - Below Header, Desktop Only */}
      <ModernSidebar />

      {/* Main Content */}
      <main className="lg:ml-20 pt-14 sm:pt-16 bg-gray-50 dark:bg-gray-900 w-full">
        {children}
      </main>
    </div>
  );
});

ModernLayout.displayName = "ModernLayout";

export default ModernLayout;
