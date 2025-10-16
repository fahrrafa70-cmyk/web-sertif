import Header from "@/components/header";
import HeroSection from "@/components/hero-section";
import AboutSection from "@/components/about-section";
import VideoDocumentationSection from "@/components/video-documentation-section";
import Footer from "@/components/footer";

export default function Home() {
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
