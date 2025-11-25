"use client";

import { memo } from "react";
import ModernSidebar from "./modern-sidebar";
import ModernHeader from "./modern-header";

interface ModernLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

const ModernLayout = memo(function ModernLayout({ children, hideSidebar = false }: ModernLayoutProps) {
  return (
    <div className="w-full" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header - Full Width */}
      <ModernHeader />

      {/* Sidebar - Below Header, Desktop Only */}
      {!hideSidebar && <ModernSidebar />}

      {/* Main Content */}
      <main 
        className={`w-full ${!hideSidebar ? 'lg:ml-20' : ''}`} 
        style={{ backgroundColor: 'var(--background)', paddingTop: 'var(--header-height-mobile)' }}
      >
        {children}
      </main>
    </div>
  );
});

ModernLayout.displayName = "ModernLayout";

export default ModernLayout;
