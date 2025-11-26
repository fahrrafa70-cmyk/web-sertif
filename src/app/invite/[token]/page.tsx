"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { getTenantInviteByToken, type TenantInvite } from "@/lib/supabase/tenants";

function InviteContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params?.token as string | undefined;

  const [status, setStatus] = useState<string>("Memproses undangan...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const processInvite = async () => {
      if (!token) {
        setError("Token undangan tidak ditemukan.");
        return;
      }

      try {
        setStatus("Memeriksa undangan...");

        const invite: TenantInvite | null = await getTenantInviteByToken(token);

        if (!invite) {
          setError("Undangan tidak ditemukan atau sudah tidak berlaku.");
          return;
        }

        // Store invite token and tenant id in localStorage so auth/callback can use it after login
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ecert-pending-invite-token", token);
          window.localStorage.setItem("ecert-pending-invite-tenant-id", invite.tenant_id);
        }

        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session?.user) {
          // Not logged in yet: user should click login (Google/GitHub) as usual.
          // After login, auth/callback will redirect back here (via `next`),
          // and this effect will run again with an active session.
          setStatus("Silakan login untuk menerima undangan tenant ini...");
          return;
        }

        // Already logged in: join tenant immediately
        setStatus("Menambahkan Anda ke tenant...");

        const userId = session.user.id;

        const { error: insertError } = await supabaseClient
          .from("tenant_members")
          .insert([
            {
              tenant_id: invite.tenant_id,
              user_id: userId,
              role: invite.role || "staff",
              status: "active",
            },
          ]);

        if (insertError) {
          // If already a member, ignore unique violation
          const code = (insertError as any).code as string | undefined;
          if (code && ["23505", "PGRST116"].includes(code) === false) {
            throw insertError;
          }
        }

        // Mark tenant as selected so rest of app uses it
        if (typeof window !== "undefined") {
          window.localStorage.setItem("ecert-selected-tenant-id", invite.tenant_id);
        }

        if (!cancelled) {
          setStatus("Berhasil bergabung. Mengalihkan ke halaman tenant...");
          router.replace(`/tenants/${invite.tenant_id}`);
        }
      } catch (err) {
        console.error("Error processing tenant invite:", err);
        if (!cancelled) {
          setError("Terjadi kesalahan saat memproses undangan. Silakan coba lagi atau hubungi admin.");
        }
      }
    };

    void processInvite();

    return () => {
      cancelled = true;
    };
  }, [token, router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <h1 className="text-lg font-semibold text-red-600 dark:text-red-400">Undangan tidak valid</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Memproses undangan tenant...</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{status}</p>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
