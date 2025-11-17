"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpWithEmailPassword } from "@/lib/supabase/auth";
import { supabaseClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    organization: "",
    job_title: "",
    phone: "",
    address: "",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!form.full_name || !form.email || !form.password) {
        throw new Error("Please fill all required fields");
      }
      if (form.password.length < 6) {
        throw new Error("Password is too weak (min 6 chars)");
      }

      await signUpWithEmailPassword(form.email, form.password);

      // Insert into users with default role 'user'
      const { error: usersErr } = await supabaseClient
        .from("users")
        .insert({ email: form.email, full_name: form.full_name, role: "user" });
      if (usersErr) throw usersErr;

      // Link profiles via users.id: fetch inserted user id by email
      const { data: userRow, error: fetchErr } = await supabaseClient
        .from("users")
        .select("id")
        .eq("email", form.email)
        .single();
      if (fetchErr || !userRow) throw fetchErr || new Error("Failed to create profile");

      const { error: profileErr } = await supabaseClient
        .from("profiles")
        .insert({
          id: userRow.id,
          organization: form.organization,
          job_title: form.job_title,
          phone: form.phone,
          address: form.address,
          city: form.city,
        });
      if (profileErr) throw profileErr;

      router.replace("/login");
    } catch (err: any) {
      const msg = err?.message?.toLowerCase?.() || "";
      if (msg.includes("user already registered") || msg.includes("duplicate key")) {
        setError("Email already used. Try logging in.");
      } else if (msg.includes("password")) {
        setError("Weak password. Use at least 6 characters.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Register</h1>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Organization</label>
                <Input value={form.organization} onChange={(e) => update("organization", e.target.value)} className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Job Title</label>
                <Input value={form.job_title} onChange={(e) => update("job_title", e.target.value)} className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} className="border-gray-300" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">City</label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} className="border-gray-300" />
              </div>
              {error && (
                <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}
              <div className="md:col-span-2">
                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
              <div className="md:col-span-2 text-sm text-gray-600">
                Already have an account? <Link href="/login" className="underline">Login</Link>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}




