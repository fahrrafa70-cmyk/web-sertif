"use client";

import ModernLayout from "@/components/modern-layout";
import HeroSection from "@/components/hero-section";
import { useEffect, useState, useCallback, useMemo } from "react";

export default function Home() {
  const [headerH, setHeaderH] = useState<number>(56);
  const [viewportH, setViewportH] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  // Set document title robust untuk home page
  useEffect(() => {
    const setTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = "Home | Certify - Certificate Platform";
      }
    };
    
    // Set immediately
    setTitle();
    
    // Set with multiple delays to ensure override
    const timeouts = [
      setTimeout(setTitle, 50),
      setTimeout(setTitle, 200),
      setTimeout(setTitle, 500)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Optimized resize handler with useCallback to prevent unnecessary re-renders 
  const measure = useCallback(() => {
    try {
      const el = document.querySelector('header');
      const h = el ? Math.ceil((el as HTMLElement).getBoundingClientRect().height) : 56;
      setHeaderH(h > 0 ? h : 56);
      setViewportH(window.innerHeight || document.documentElement.clientHeight || 0);
    } catch {
      setHeaderH(56);
      setViewportH(window.innerHeight || 0);
    }
  }, []);

  // Initialize on mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Hard lock vertical scroll on landing only
  useEffect(() => {
    if (!isMounted) return;
    try {
      const prevHtmlOverflow = window.getComputedStyle(document.documentElement).overflowY;
      const prevBodyOverflow = window.getComputedStyle(document.body).overflowY;
      const prevBodyPaddingTop = window.getComputedStyle(document.body).paddingTop;
      document.documentElement.style.setProperty('overflow-y', 'hidden', 'important');
      document.body.style.setProperty('overflow-y', 'hidden', 'important');
      // Remove global body top padding applied in globals.css for fixed header
      document.body.style.setProperty('padding-top', '0', 'important');
      return () => {
        document.documentElement.style.setProperty('overflow-y', prevHtmlOverflow || 'hidden', 'important');
        document.body.style.setProperty('overflow-y', prevBodyOverflow || 'auto', 'important');
        document.body.style.setProperty('padding-top', prevBodyPaddingTop || '4rem', 'important');
      };
    } catch {}
  }, [isMounted]);

  // Memoize style object to prevent unnecessary re-renders
  // Use consistent values for SSR to prevent hydration mismatch
  const containerStyle = useMemo(() => {
    // During SSR or before mount, use stable values to match server render
    if (!isMounted || viewportH === 0) {
      return {
        height: `calc(100svh - ${headerH}px)`,
        minHeight: '0px',
      };
    }
    // After mount, use actual calculated values
    return {
      height: `calc(100svh - ${headerH}px)`,
      minHeight: `${Math.max(0, Math.ceil(viewportH - headerH) + 2)}px`,
    };
  }, [headerH, viewportH, isMounted]);

  return (
    <ModernLayout>
      <div
        className="overflow-hidden flex flex-col flex-1 -mt-16 lg:-ml-20"
        style={containerStyle}
      >
        <HeroSection />
      </div>
    </ModernLayout>
  );
}
