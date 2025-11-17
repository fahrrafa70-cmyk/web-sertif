"use client";

import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import AboutSection from "@/components/about-section";
import VideoDocumentationSection from "@/components/video-documentation-section";
import Footer from "@/components/footer";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

export default function Home() {
  const { role, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    console.log("Rendering UI for role:", role ?? "unknown");
  }, [isAuthenticated, role]);
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <VideoDocumentationSection />
      </main>
      <Footer />
    </div>
  );
}
