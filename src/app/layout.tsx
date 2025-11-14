import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { LayoutStability } from "@/components/layout-stability";
import { LanguageProvider } from "@/contexts/language-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/contexts/auth-context";
import { ModalProvider } from "@/contexts/modal-context";
import { LoginModal } from "@/components/ui/login-modal";
import { ThemeScript } from "@/components/theme-script";
import { ErrorBoundaryWrapper } from "@/components/error-boundary-wrapper";
import { ScrollbarVisibility } from "@/components/scrollbar-visibility";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Prevent FOUT (Flash of Unstyled Text)
  preload: true, // Preload critical fonts 
  adjustFontFallback: true, // Better font fallback
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap", // Prevent FOUT (Flash of Unstyled Text)
  preload: true, // Preload critical fonts
  adjustFontFallback: true, // Better font fallback
});

export const metadata: Metadata = {
  title: "Eeasy Certificate",
  description: "Create, manage, and verify certificates for trainings, internships, MoUs, and industrial visits with our multilingual platform.",
  icons: {
    icon: "/next.svg",
    apple: "/next.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#3b82f6", // ✅ FIXED: Moved themeColor to viewport export
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Simple theme detection
                  var theme = localStorage.getItem('ecert-theme') || 'light';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
        <ThemeScript />
        <ErrorBoundaryWrapper>
            <ThemeProvider>
              <LanguageProvider>
                <AuthProvider>
                  <ModalProvider>
                    {/* <LayoutStability /> */}
                    {/* <ScrollbarVisibility /> */}
                    {children}
                    <LoginModal />
                  </ModalProvider>
                </AuthProvider>
              </LanguageProvider>
            </ThemeProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
