"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithEmailPassword, getUserRoleByEmail } from "@/lib/supabase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailPassword(email, password);
      const role = await getUserRoleByEmail(email);
      if (!role) {
        setError("Account not found. Would you like to register?");
        setLoading(false);
        return;
      }
      // Mirror old behavior: persist role to localStorage for UI rendering without directory changes
      try {
        const uiRole = role === "admin" ? "Admin" : role === "team" ? "Team" : "User";
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ecert-role", uiRole);
          // Notify current tab listeners (storage event won't fire in same tab)
          window.dispatchEvent(new CustomEvent("ecert-role-changed", { detail: uiRole }));
        }
      } catch {}
      // Do not change directory like old behavior: go back if possible and refresh
      try {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          // fallback to landing without deep redirect
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    } catch (err: unknown) {
      setError("Account not found. Would you like to register?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Login</h1>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-gray-300" />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="mb-2">{error}</div>
                  <Link href="/register" className="underline text-red-700">Go to Register</Link>
                </div>
              )}
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}



