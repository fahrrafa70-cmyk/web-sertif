"use client";

import { memo } from "react";
import ModernSidebar from "./modern-sidebar";
import ModernHeader from "./modern-header";

interface ModernLayoutProps {
  children: React.ReactNode;
}

const ModernLayout = memo(function ModernLayout({ children }: ModernLayoutProps) {
  return (
    <div className="w-full" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header - Full Width */}
      <ModernHeader />

      {/* Sidebar - Below Header, Desktop Only */}
      <ModernSidebar />

      {/* Main Content */}
      <main className="lg:ml-20 w-full" style={{ backgroundColor: 'var(--background)', paddingTop: 'var(--header-height-mobile)' }}>
        {children}
      </main>
    </div>
  );
});

ModernLayout.displayName = "ModernLayout";

export default ModernLayout;
