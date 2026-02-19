import { supabaseClient } from "@/lib/supabase/client";
import { generateXID } from "@/lib/utils/generate-xid";
import type { TenantRole } from "@/lib/supabase/tenants";

// ─── ID / Number generators ──────────────────────────────────────────────────

export function generatePublicId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { generateXID };

export async function generateCertificateNumber(date?: Date): Promise<string> {
  const targetDate = date || new Date();
  const year = targetDate.getFullYear().toString().slice(-2);
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  const prefix = `${year}${month}${day}`;

  const { data, error } = await supabaseClient
    .from("certificates")
    .select("certificate_no")
    .like("certificate_no", `${prefix}%`)
    .order("certificate_no", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return `${prefix}001`;

  const lastSequence = parseInt(data[0].certificate_no.slice(-3), 10);
  const newSequence = lastSequence + 1;
  if (newSequence > 999) {
    throw new Error(
      `Certificate sequence limit reached for date ${prefix}. Maximum 999 certificates per day.`,
    );
  }
  return `${prefix}${String(newSequence).padStart(3, "0")}`;
}

export async function generateCheckNumber(templateId?: string): Promise<string> {
  let query = supabaseClient
    .from("certificates")
    .select("check_number")
    .not("check_number", "is", null)
    .order("check_number", { ascending: false })
    .limit(1);
  if (templateId) query = query.eq("template_id", templateId);

  const { data, error } = await query;
  if (error || !data || data.length === 0 || !data[0].check_number) return "001";

  const lastCheckNo = data[0].check_number;
  const newSequence = parseInt(lastCheckNo, 10) + 1;
  const digits = Math.max(3, lastCheckNo.length);
  return String(newSequence).padStart(digits, "0");
}

// ─── Tenant role guard (internal, used by mutations) ────────────────────────

export async function getCurrentUserTenantRoleForCertificate(
  tenantId: string | null | undefined,
): Promise<TenantRole | null> {
  if (!tenantId) return null;

  const { data: { session }, error: sessionError } =
    await supabaseClient.auth.getSession();
  if (sessionError) throw new Error(`Failed to get session: ${sessionError.message}`);
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabaseClient
    .from("tenant_members")
    .select("role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error)
    throw new Error(`Failed to check tenant role for certificate: ${error.message}`);

  const role = (data?.role as string | null)?.toLowerCase() as TenantRole | null;
  return role === "owner" || role === "manager" || role === "staff" ? role : null;
}

// ─── Cache invalidation helper ───────────────────────────────────────────────

export async function invalidateCertificatesCache(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const { dataCache, CACHE_KEYS } = await import("@/lib/cache/data-cache");
      dataCache.delete(CACHE_KEYS.CERTIFICATES);
    } catch {
      // Cache module not available
    }
  }
}

// ─── Storage cleanup ─────────────────────────────────────────────────────────

export async function deleteCertificateStorageFiles(
  certificateImageUrl: string | null,
  scoreImageUrl: string | null,
): Promise<void> {
  const filesToDelete: string[] = [];
  if (certificateImageUrl) {
    const match = certificateImageUrl.match(/certificates\/([^?]+)/);
    if (match?.[1]) filesToDelete.push(match[1]);
  }
  if (scoreImageUrl) {
    const match = scoreImageUrl.match(/certificates\/([^?]+)/);
    if (match?.[1]) filesToDelete.push(match[1]);
  }
  if (filesToDelete.length > 0) {
    await supabaseClient.storage.from("certificates").remove(filesToDelete);
    // Don't throw on storage error — DB deletion takes priority
  }
}
