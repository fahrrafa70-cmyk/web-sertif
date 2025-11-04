"use client";

import ModernSidebar from "./modern-sidebar";
import ModernHeader from "./modern-header";

interface ModernLayoutProps {
  children: React.ReactNode;
}

export default function ModernLayout({ children }: ModernLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Full Width */}
      <ModernHeader />

      {/* Sidebar - Below Header, Desktop Only */}
      <ModernSidebar />

      {/* Main Content */}
      <main className="lg:ml-20 pt-20 md:pt-16 min-h-screen bg-gray-50 dark:bg-gray-900 pb-4 sm:pb-8">
        {children}
      </main>
    </div>
  );
}
