"use client";

import { useState, memo, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useModal } from "@/contexts/modal-context";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import UserAvatar from "./user-avatar";
import MobileSidebar from "./mobile-sidebar";
import { supabaseClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ModernHeaderProps {
  hideAuth?: boolean; // Hide authentication/profile section
  hideMobileSidebar?: boolean; // Hide mobile sidebar (menu button and sidebar)
}

const ModernHeader = memo(function ModernHeader({ hideAuth = false, hideMobileSidebar = false }: ModernHeaderProps) {
  const { setOpenLogin, isAuthenticated, refreshRole, role } = useAuth();
  const { isModalOpen } = useModal();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalRole, setGlobalRole] = useState<"owner" | "manager" | "staff" | "user" | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionStep, setSubscriptionStep] = useState<1 | 2>(1);
  const [subscriberName, setSubscriberName] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  
  // Apply dark overlay on header when modal is open on /search page
  const shouldDarken = pathname === "/search" && isModalOpen;
  
  const handleMobileSidebarToggle = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleMobileSidebarClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  useEffect(() => {
    const loadUserAndRole = async () => {
      if (!isAuthenticated) {
        setUserId(null);
        setGlobalRole(null);
        return;
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      setSubscriberEmail(session?.user?.email ?? "");
      const fullName =
        (session?.user?.user_metadata as { full_name?: string } | null)?.full_name || "";
      setSubscriberName(fullName);

      if (!currentUserId) {
        setGlobalRole(null);
        return;
      }

      const normalizedRole = role ?? null;
      if (normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "staff" || normalizedRole === "user") {
        setGlobalRole(normalizedRole);
      } else {
        setGlobalRole(null);
      }

      setRoleLoaded(true);
    };

    void loadUserAndRole();
  }, [isAuthenticated, role]);

  const handleFakeSubscribe = useCallback(async () => {
    if (!userId) return;
    try {
      setSubscriptionLoading(true);
      const { error } = await supabaseClient
        .from("users")
        .update({ role: "owner" })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      const normalizedEmail = subscriberEmail.toLowerCase().trim();
      if (normalizedEmail) {
        await supabaseClient
          .from("email_whitelist")
          .upsert(
            { email: normalizedEmail, role: "owner" },
            { onConflict: "email" }
          );
      }

      setGlobalRole("owner");
      await refreshRole();
      setSubscriptionOpen(false);
      toast.success("Akun kamu sekarang menjadi Owner. Semua fitur telah dibuka.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses subscription demo.";
      toast.error(message);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [userId, subscriberEmail, refreshRole]);

  return (
    <>
      {/* Dark overlay covering entire header when modal is open */}
      {shouldDarken && (
        <div 
          className="fixed top-0 left-0 right-0 bg-black/20 dark:bg-black/40 pointer-events-none transition-opacity duration-300"
          style={{
            height: 'var(--header-height-mobile, 72px)',
            zIndex: 9998,
          }}
        />
      )}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 border-b w-full transition-all duration-300`}
        style={{
          backgroundColor: 'var(--background)',
          height: 'var(--header-height-mobile, 72px)',
        }}
      >
        <div className="h-full w-full px-2 sm:px-3 md:px-4 flex items-center justify-between gap-1 sm:gap-2 relative z-10">
          {/* Mobile Menu Button - Hidden if hideMobileSidebar is true */}
          {!hideMobileSidebar && (
            <button
              onClick={handleMobileSidebarToggle}
              className="lg:hidden flex-shrink-0 p-1.5 sm:p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative z-20"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo - Absolute centered on mobile, normal flow on desktop */}
          <div className="flex-1 lg:flex-initial flex items-center relative">
            {/* Mobile: Absolute centered logo */}
            <div className="lg:hidden absolute inset-0 flex items-center justify-center z-10">
              <Link href="/" className="flex items-center group">
                <Image
                  src="/headerdark.png"
                  alt="Certify Logo"
                  width={200}
                  height={60}
                  className="h-10 sm:h-11 md:h-12 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                  priority
                />
              </Link>
            </div>
            
            {/* Desktop: Normal positioned logo */}
            <div className="hidden lg:flex items-center">
              <Link href="/" className="flex items-center group">
                <Image
                  src="/headerdark.png"
                  alt="Certify Logo"
                  width={320}
                  height={120}
                  className="h-12 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                  priority
                />
              </Link>
            </div>
          </div>

          {/* Right Section - Theme + Language + Avatar or Login */}
          {!hideAuth && (
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
              {/* Theme Switcher - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:block">
                <ThemeSwitcher variant="compact" />
              </div>
              {/* Language Switcher - Hidden on mobile, shown on desktop */}
              <div className="hidden lg:block">
                <LanguageSwitcher variant="compact" />
              </div>

              {roleLoaded && isAuthenticated && globalRole !== "owner" && (
                <Button
                  size="sm"
                  className="hidden lg:inline-flex bg-gradient-to-r from-blue-500 via-blue-500 to-indigo-500 hover:from-blue-600 hover:via-blue-600 hover:to-indigo-600 text-white font-bold tracking-wide border-0 shadow-lg hover:shadow-xl h-8 sm:h-9 md:h-10 text-xs sm:text-sm md:text-[0.9rem] px-3 sm:px-3.5 md:px-4 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => setSubscriptionOpen(true)}
                >
                  Subscription
                </Button>
              )}

              {/* User Avatar or Login Button */}
              {isAuthenticated ? (
                <UserAvatar />
              ) : (
                <Button
                  size="sm"
                  className="gradient-primary text-white border-0 shadow-md h-7 sm:h-8 md:h-9 text-xs sm:text-sm px-2 sm:px-3 md:px-4"
                  onClick={() => setOpenLogin(true)}
                >
                  Login
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <Dialog
        open={subscriptionOpen}
        onOpenChange={(open) => {
          setSubscriptionOpen(open);
          if (!open) {
            setSubscriptionStep(1);
          }
        }}
      >
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Upgrade ke <span className="text-blue-600">Owner</span>
            </DialogTitle>
          </DialogHeader>

          {subscriptionStep === 1 && (
            <>
              <div className="grid gap-4 py-2 sm:grid-cols-[1.2fr_1fr] items-start">
                {/* Paket / Pricing Card */}
                <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4 shadow-sm">
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                        Paket Owner
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                        Paket lengkap untuk pemilik akun yang membutuhkan kontrol penuh atas struktur
                        organisasi, data peserta, dan penerbitan sertifikat.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400 line-through">
                        Rp199.000
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                        Rp0
                        <span className="ml-1 text-xs font-semibold text-blue-500 dark:text-blue-300">
                          / demo
                        </span>
                      </p>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                    <li>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Unlimited</span>{" "}
                      tenants untuk satu akun – kelola banyak institusi/brand dalam satu dashboard.
                    </li>
                    <li>
                      Desain dan simpan berbagai <span className="font-semibold">templates sertifikat</span>,
                      lalu gunakan kembali untuk event berikutnya.
                    </li>
                    <li>
                      Impor data peserta, kelola <span className="font-semibold">daftar peserta</span>, dan
                      generate sertifikat secara massal dari Excel.
                    </li>
                    <li>
                      Atur struktur tim dengan role <span className="font-semibold">Owner / Manager / Staff</span>
                      untuk setiap tenant tanpa saling bercampur.
                    </li>
                    <li>
                      Monitoring yang rapi: data peserta, sertifikat yang sudah dibuat, dan aktivitas tim
                      terpusat dalam satu tempat.
                    </li>
                  </ul>
                  <div className="mt-3 rounded-md bg-white/60 dark:bg-slate-950/40 border border-blue-100/70 dark:border-slate-800 px-3 py-2">
                    <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 mb-1">
                      Cara kerja dalam 3 langkah:
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
                      <li>Buat tenant untuk organisasi / event yang ingin dikelola.</li>
                      <li>Tambahkan anggota tim dan atur role mereka (Owner / Manager / Staff).</li>
                      <li>Impor data peserta lalu generate sertifikat otomatis dari templates.</li>
                    </ol>
                  </div>
                </div>

                {/* Ringkasan singkat di kanan */}
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  <div>
                    <p className="font-semibold mb-1">Apa yang kamu dapatkan?</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      Satu akun dengan kendali penuh: buat beberapa ruang kerja (tenant) terpisah,
                      atur tim di masing-masing ruang kerja, dan kelola seluruh siklus sertifikat
                      dari satu dashboard.
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-blue-200 dark:border-slate-700 px-3 py-2 text-xs sm:text-sm">
                    <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Langkah selanjutnya</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Klik <span className="font-semibold">Lanjut ke pembayaran</span> untuk mengisi data
                      singkat sebelum paket Owner kamu diaktifkan.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => setSubscriptionOpen(false)}
                  disabled={subscriptionLoading}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => setSubscriptionStep(2)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md"
                  disabled={subscriptionLoading}
                >
                  Lanjut ke pembayaran
                </Button>
              </DialogFooter>
            </>
          )}

          {subscriptionStep === 2 && (
            <>
              <div className="grid gap-4 py-2 sm:grid-cols-[1.2fr_1fr] items-start">
                {/* Ringkasan paket singkat di kiri */}
                <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                    Ringkasan paket
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Paket Owner – Rp0 <span className="text-xs font-normal text-blue-500 dark:text-blue-300">/ demo</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Semua fitur Owner akan langsung aktif setelah kamu menekan tombol konfirmasi di bawah.
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <li>• Multi-tenant dan manajemen tim</li>
                    <li>• Templates sertifikat reusable</li>
                    <li>• Import peserta & generate massal</li>
                  </ul>
                </div>

                {/* Form detail pembayaran (demo) */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="subscriber-name">Nama lengkap</Label>
                    <Input
                      id="subscriber-name"
                      value={subscriberName}
                      onChange={(e) => setSubscriberName(e.target.value)}
                      placeholder="Nama sesuai akun"
                      disabled={subscriptionLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="subscriber-email">Email</Label>
                    <Input
                      id="subscriber-email"
                      type="email"
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      placeholder="email@example.com"
                      disabled={subscriptionLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="subscriber-method">Metode pembayaran (demo)</Label>
                    <select
                      id="subscriber-method"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                      disabled={subscriptionLoading}
                      defaultValue="card"
                    >
                      <option value="card">Kartu Kredit / Debit (simulasi)</option>
                      <option value="bank">Transfer Bank (simulasi)</option>
                      <option value="ewallet">E-Wallet (simulasi)</option>
                    </select>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  onClick={() => setSubscriptionStep(1)}
                  disabled={subscriptionLoading}
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleFakeSubscribe}
                  disabled={subscriptionLoading || !subscriberEmail.trim()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md"
                >
                  {subscriptionLoading ? "Memproses..." : "Aktifkan Paket Owner (Demo)"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Sidebar - Hidden if hideMobileSidebar is true */}
      {!hideMobileSidebar && (
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={handleMobileSidebarClose}
        />
      )}
    </>
  );
});

ModernHeader.displayName = "ModernHeader";

export default ModernHeader;
