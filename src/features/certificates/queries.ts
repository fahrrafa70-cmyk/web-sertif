import { supabaseClient } from "@/lib/supabase/client";
import type { Certificate, SearchFilters, PublicSearchFilters } from "./types";

const CERT_SELECT = `
  *,
  templates (
    id,
    name,
    category,
    orientation
  ),
  members:members(
    id,
    name,
    email,
    organization,
    phone
  )
`;

const CERT_SELECT_FULL = `
  *,
  templates (
    id,
    name,
    category,
    orientation
  ),
  members:members(*)
`;

// ─── Read queries ────────────────────────────────────────────────────────────

export async function getCertificates(
  useCache: boolean = true,
): Promise<Certificate[]> {
  if (useCache && typeof window !== "undefined") {
    try {
      const { dataCache, CACHE_KEYS } = await import("@/lib/cache/data-cache");
      return dataCache.getOrFetch<Certificate[]>(
        CACHE_KEYS.CERTIFICATES,
        async () => {
          const { data, error } = await supabaseClient
            .from("certificates")
            .select(CERT_SELECT)
            .order("created_at", { ascending: false });
          if (error) throw new Error(`Failed to fetch certificates: ${error.message}`);
          return data || [];
        },
        5 * 60 * 1000,
      );
    } catch {
      // Cache module not available
    }
  }

  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch certificates: ${error.message}`);
  return data || [];
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch certificate: ${error.message}`);
  }
  return data;
}

export async function getCertificateByNumber(
  identifier: string,
): Promise<Certificate | null> {
  const { data: certByNo, error: errByNo } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("certificate_no", identifier)
    .maybeSingle();
  if (errByNo && errByNo.code !== "PGRST116")
    throw new Error(`Failed to fetch certificate: ${errByNo.message}`);
  if (certByNo) return certByNo;

  const { data: certByCheck, error: errByCheck } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("check_number", identifier)
    .maybeSingle();
  if (errByCheck && errByCheck.code !== "PGRST116")
    throw new Error(`Failed to fetch certificate: ${errByCheck.message}`);
  return certByCheck || null;
}

export async function getCertificateByPublicId(
  public_id: string,
): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("public_id", public_id)
    .eq("is_public", true)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch certificate: ${error.message}`);
  }
  return data;
}

export async function getCertificateByXID(
  xid: string,
): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("xid", xid)
    .eq("is_public", true)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch certificate by XID: ${error.message}`);
  }
  return data;
}

export async function getCertificatesByMember(
  memberId: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`Failed to fetch certificates by member: ${error.message}`);
  return data || [];
}

export async function getCertificatesByCategory(
  category: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("category", category)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`Failed to fetch certificates by category: ${error.message}`);
  return data || [];
}

export async function getCertificatesByTemplate(
  templateId: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .eq("template_id", templateId)
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`Failed to fetch certificates by template: ${error.message}`);
  return data || [];
}

export async function searchCertificates(
  query: string,
  tenant_id?: string,
): Promise<Certificate[]> {
  let queryBuilder = supabaseClient
    .from("certificates")
    .select(CERT_SELECT_FULL)
    .or(`certificate_no.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`);
  if (tenant_id && typeof tenant_id === "string" && tenant_id.trim()) {
    queryBuilder = queryBuilder.eq("tenant_id", tenant_id.trim());
  }
  const { data, error } = await queryBuilder.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to search certificates: ${error.message}`);
  return data || [];
}

export async function advancedSearchCertificates(
  filters: SearchFilters,
): Promise<Certificate[]> {
  try {
    if (!filters.tenant_id?.trim()) {
      return publicSearchCertificates({
        keyword: filters.keyword,
        category: filters.category,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }
    const hasKeyword = filters.keyword && typeof filters.keyword === "string" && filters.keyword.trim();
    if (!hasKeyword) return [];

    const sanitizedKeyword = filters.keyword!.trim().replace(/[%_]/g, "");
    if (!sanitizedKeyword) return [];

    let query = supabaseClient.from("certificates").select(CERT_SELECT_FULL);
    query = query.or(`certificate_no.ilike.%${sanitizedKeyword}%,name.ilike.%${sanitizedKeyword}%`);
    query = query.eq("tenant_id", filters.tenant_id.trim());
    if (filters.category?.trim()) query = query.eq("category", filters.category.trim());
    if (filters.startDate) query = query.gte("issue_date", filters.startDate);
    if (filters.endDate) query = query.lte("issue_date", filters.endDate);
    query = query.limit(100).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error || !data || !Array.isArray(data)) return [];

    const keywordLower = filters.keyword!.trim().toLowerCase();
    return data.filter((cert) => {
      try {
        return (
          (cert?.certificate_no || "").toLowerCase().includes(keywordLower) ||
          (cert?.name || "").toLowerCase().includes(keywordLower) ||
          (cert?.members?.name || "").toLowerCase().includes(keywordLower)
        );
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export async function publicSearchCertificates(
  filters: PublicSearchFilters,
): Promise<Certificate[]> {
  try {
    const hasKeyword = filters.keyword && typeof filters.keyword === "string" && filters.keyword.trim();
    if (!hasKeyword) return [];

    const sanitizedKeyword = filters.keyword!.trim().replace(/[%_]/g, "");
    if (!sanitizedKeyword) return [];

    let query = supabaseClient.from("certificates").select(CERT_SELECT_FULL);
    query = query.or(`certificate_no.ilike.%${sanitizedKeyword}%,name.ilike.%${sanitizedKeyword}%`);
    if (filters.category?.trim()) query = query.eq("category", filters.category.trim());
    if (filters.startDate) query = query.gte("issue_date", filters.startDate);
    if (filters.endDate) query = query.lte("issue_date", filters.endDate);
    query = query.limit(100).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error || !data || !Array.isArray(data)) return [];

    const keywordLower = filters.keyword!.trim().toLowerCase();
    return data.filter((cert) => {
      try {
        return (
          (cert?.certificate_no || "").toLowerCase().includes(keywordLower) ||
          (cert?.name || "").toLowerCase().includes(keywordLower) ||
          (cert?.members?.name || "").toLowerCase().includes(keywordLower)
        );
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export async function getCertificateCategories(
  tenant_id?: string,
): Promise<string[]> {
  try {
    const categoriesSet = new Set<string>();

    let certQuery = supabaseClient
      .from("certificates")
      .select("category")
      .not("category", "is", null)
      .limit(1000);
    if (tenant_id?.trim()) certQuery = certQuery.eq("tenant_id", tenant_id.trim());
    const { data: certData } = await certQuery;
    certData?.forEach((item) => {
      if (item?.category?.trim()) categoriesSet.add(item.category.trim());
    });

    let templateQuery = supabaseClient
      .from("templates")
      .select("category")
      .not("category", "is", null)
      .limit(1000);
    if (tenant_id?.trim()) templateQuery = templateQuery.eq("tenant_id", tenant_id.trim());
    const { data: templateData } = await templateQuery;
    templateData?.forEach((item) => {
      if (item?.category?.trim()) categoriesSet.add(item.category.trim());
    });

    return Array.from(categoriesSet).sort();
  } catch {
    return [];
  }
}
