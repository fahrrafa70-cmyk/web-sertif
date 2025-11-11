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
  title: "E-Certificate Management Platform",
  description: "Create, manage, and verify certificates for trainings, internships, MoUs, and industrial visits with our multilingual platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
                  // Prevent FOUC by setting viewport width immediately
                  var metaViewport = document.querySelector('meta[name="viewport"]');
                  if (!metaViewport) {
                    var meta = document.createElement('meta');
                    meta.name = 'viewport';
                    meta.content = 'width=device-width, initial-scale=1, maximum-scale=5';
                    document.head.appendChild(meta);
                  }
                  
                  // Set responsive classes immediately based on viewport
                  var width = window.innerWidth || document.documentElement.clientWidth || 640;
                  if (width < 640) {
                    document.documentElement.classList.add('mobile');
                  } else {
                    document.documentElement.classList.add('desktop');
                  }
                  
                  var theme = localStorage.getItem('ecert-theme');
                  var isDark = false;
                  if (theme === 'light' || theme === 'dark') {
                    isDark = theme === 'dark';
                    document.documentElement.classList.add(theme);
                    document.documentElement.classList.remove(theme === 'light' ? 'dark' : 'light');
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    isDark = prefersDark;
                    var defaultTheme = prefersDark ? 'dark' : 'light';
                    document.documentElement.classList.add(defaultTheme);
                    document.documentElement.classList.remove(defaultTheme === 'light' ? 'dark' : 'light');
                  }
                  // Set inline background color immediately to prevent flash
                  var bgColor = isDark ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)';
                  document.documentElement.style.setProperty('background-color', bgColor, 'important');
                  document.documentElement.style.setProperty('color-scheme', isDark ? 'dark' : 'light', 'important');
                  // Inject style tag for body background immediately
                  var existingStyle = document.getElementById('theme-bg-inline');
                  if (existingStyle) existingStyle.remove();
                  var style = document.createElement('style');
                  style.id = 'theme-bg-inline';
                  style.textContent = 'body{background-color:' + bgColor + '!important;}html{background-color:' + bgColor + '!important;}';
                  if (document.head) {
                    document.head.appendChild(style);
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      document.head.appendChild(style);
                    });
                  }
                } catch (e) {
                  document.documentElement.classList.add('light');
                  document.documentElement.style.setProperty('background-color', 'rgb(249, 250, 251)', 'important');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ecert-theme');
                  var isDark = false;
                  if (theme === 'light' || theme === 'dark') {
                    isDark = theme === 'dark';
                    if (!document.documentElement.classList.contains(theme)) {
                      document.documentElement.classList.add(theme);
                      document.documentElement.classList.remove(theme === 'light' ? 'dark' : 'light');
                    }
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    isDark = prefersDark;
                    var defaultTheme = prefersDark ? 'dark' : 'light';
                    if (!document.documentElement.classList.contains(defaultTheme)) {
                      document.documentElement.classList.add(defaultTheme);
                      document.documentElement.classList.remove(defaultTheme === 'light' ? 'dark' : 'light');
                    }
                  }
                  // Ensure background color is set
                  var bgColor = isDark ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)';
                  document.documentElement.style.setProperty('background-color', bgColor, 'important');
                  if (document.body) {
                    document.body.style.setProperty('background-color', bgColor, 'important');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeScript />
        <ErrorBoundaryWrapper>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <ModalProvider>
                  <LayoutStability />
                  <ScrollbarVisibility />
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
