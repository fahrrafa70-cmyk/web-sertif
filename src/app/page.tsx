"use client";

import ModernLayout from "@/components/modern-layout";
import HeroSection from "@/components/hero-section";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

export default function Home() {
  const { role, isAuthenticated } = useAuth();
  const [headerH, setHeaderH] = useState<number>(56);
  const [viewportH, setViewportH] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 0);

  useEffect(() => {
    if (!isAuthenticated) return;
    console.log("Rendering UI for role:", role ?? "unknown");
  }, [isAuthenticated, role]);

  // No global scroll lock; height-based approach below prevents scroll
  useEffect(() => {
    const measure = () => {
      try {
        const el = document.querySelector('header');
        const h = el ? Math.ceil((el as HTMLElement).getBoundingClientRect().height) : 56;
        setHeaderH(h > 0 ? h : 56);
        setViewportH(window.innerHeight || document.documentElement.clientHeight || 0);
      } catch {
        setHeaderH(56);
        setViewportH(window.innerHeight || 0);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Hard lock vertical scroll on landing only
  useEffect(() => {
    try {
      const prevHtmlOverflow = window.getComputedStyle(document.documentElement).overflowY;
      const prevBodyOverflow = window.getComputedStyle(document.body).overflowY;
      const prevBodyPaddingTop = window.getComputedStyle(document.body).paddingTop;
      document.documentElement.style.setProperty('overflow-y', 'hidden', 'important');
      document.body.style.setProperty('overflow-y', 'hidden', 'important');
      // Remove global body top padding applied in globals.css for fixed header
      document.body.style.setProperty('padding-top', '0', 'important');
      return () => {
        document.documentElement.style.setProperty('overflow-y', prevHtmlOverflow || 'scroll', 'important');
        document.body.style.setProperty('overflow-y', prevBodyOverflow || 'scroll', 'important');
        document.body.style.setProperty('padding-top', prevBodyPaddingTop || '4rem', 'important');
      };
    } catch {}
  }, []);
  return (
    <ModernLayout>
      <div
        className="overflow-hidden flex flex-col flex-1 -mt-16 lg:-ml-20"
        style={{
          height: `calc(100svh - ${headerH}px)`,
          minHeight: `${Math.max(0, Math.ceil(viewportH - headerH) + 2)}px`,
        }}
      >
        <HeroSection />
      </div>
    </ModernLayout>
  );
}
