import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutStability } from "@/components/layout-stability";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";
import { LoginModal } from "@/components/ui/login-modal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "E-Certificate Management Platform",
  description: "Create, manage, and verify certificates for trainings, internships, MoUs, and industrial visits with our multilingual platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            <LayoutStability />
            {children}
            <LoginModal />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
