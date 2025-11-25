import { supabaseClient } from "./client";
import { generateXID } from "@/lib/utils/generate-xid";

export interface Certificate {
  id: string;
  certificate_no: string;
  name: string;
  description: string | null;
  issue_date: string;
  expired_date: string | null;
  category: string | null;
  template_id: string | null;
  member_id: string | null;
  tenant_id?: string | null;
  certificate_image_url: string | null; // PNG master (high quality)
  certificate_thumbnail_url?: string | null; // WebP preview (web optimized)
  score_image_url: string | null; // PNG score master (dual templates)
  score_thumbnail_url?: string | null; // WebP score preview (dual templates)
  text_layers: TextLayer[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  public_id: string;
  xid?: string | null; // NEW: Short XID for compact URLs (/c/{xid})
  is_public: boolean;
  // Optional joined relations
  members?: {
    id?: string;
    name?: string;
    email?: string;
    organization?: string;
    phone?: string | null;
    job?: string | null;
    city?: string | null;
  } | null;
  templates?: {
    id?: string;
    name?: string;
    category?: string | null;
    orientation?: string | null;
  } | null;
}

// Get certificates by member
export async function getCertificatesByMember(
  memberId: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch certificates by member: ${error.message}`,
    );
  }

  return data || [];
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  xPercent: number; // FIX: Always store normalized X position (0-1)
  yPercent: number; // FIX: Always store normalized Y position (0-1)
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  maxWidth?: number;
  lineHeight?: number;
  isEditing?: boolean;
}

export interface CreateCertificateData {
  certificate_no?: string; // Optional - will be auto-generated if not provided
  name: string;
  description?: string;
  issue_date: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  tenant_id?: string; // NEW: Associate certificate with tenant
  certificate_image_url?: string; // PNG master (high quality)
  certificate_thumbnail_url?: string; // WebP preview (web optimized)
  score_image_url?: string; // PNG score master (dual templates)
  score_thumbnail_url?: string; // WebP score preview (dual templates)
  text_layers?: TextLayer[];
  merged_image?: string; // FIX: Add support for merged image
}

export interface UpdateCertificateData {
  certificate_no?: string;
  name?: string;
  description?: string;
  issue_date?: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  certificate_image_url?: string; // PNG master (high quality)
  certificate_thumbnail_url?: string; // WebP preview (web optimized)
  score_image_url?: string; // PNG score master (dual templates)
  score_thumbnail_url?: string; // WebP score preview (dual templates)
  text_layers?: TextLayer[];
}

// Get all certificates with optional caching and request deduplication
export async function getCertificates(useCache: boolean = true): Promise<Certificate[]> {
  if (useCache && typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
      
      // Use getOrFetch for automatic deduplication and caching
      return dataCache.getOrFetch<Certificate[]>(
        CACHE_KEYS.CERTIFICATES,
        async () => {
          // Optimize query - only fetch essential fields from relations
          const { data, error } = await supabaseClient
            .from("certificates")
            .select(
              `
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
            `,
            )
            .order("created_at", { ascending: false });

          if (error) {
            throw new Error(`Failed to fetch certificates: ${error.message}`);
          }

          return data || [];
        },
        5 * 60 * 1000 // 5 minutes cache
      );
    } catch {
      // Cache module not available, continue with fetch
    }
  }

  // If cache is disabled, fetch directly
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
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
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch certificates: ${error.message}`);
  }

  return data || [];
}

// Get certificate by ID
export async function getCertificate(id: string): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Certificate not found
    }
    throw new Error(`Failed to fetch certificate: ${error.message}`);
  }

  return data;
}

// Get certificate by certificate number
export async function getCertificateByNumber(
  certificate_no: string,
): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("certificate_no", certificate_no)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Certificate not found
    }
    throw new Error(`Failed to fetch certificate: ${error.message}`);
  }

  return data;
}

// Get certificate by public_id (for public access)
export async function getCertificateByPublicId(
  public_id: string,
): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("public_id", public_id)
    .eq("is_public", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Certificate not found or not public
    }
    throw new Error(`Failed to fetch certificate: ${error.message}`);
  }

  return data;
}

// Get certificate by XID (for compact URL access)
export async function getCertificateByXID(
  xid: string,
): Promise<Certificate | null> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("xid", xid)
    .eq("is_public", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Certificate not found or not public
    }
    throw new Error(`Failed to fetch certificate by XID: ${error.message}`);
  }

  return data;
}

// Generate unique public_id using crypto
export function generatePublicId(): string {
  // Use crypto.randomUUID if available (modern browsers and Node 16+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate certificate number in YYMMDDXXX format
// YY = year (2 digits), MM = month, DD = day, XXX = sequence (001-999)
export async function generateCertificateNumber(date?: Date): Promise<string> {
  const targetDate = date || new Date();
  
  // Format: YYMMDD
  const year = targetDate.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const prefix = `${year}${month}${day}`;
  
  // Find all certificates with the same date prefix
  const { data, error } = await supabaseClient
    .from("certificates")
    .select("certificate_no")
    .like("certificate_no", `${prefix}%`)
    .order("certificate_no", { ascending: false })
    .limit(1);
  
  if (error) {
    // If error, start with 001
    return `${prefix}001`;
  }
  
  // If no certificates found for this date, start with 001
  if (!data || data.length === 0) {
    return `${prefix}001`;
  }
  
  // Extract the sequence number from the last certificate
  const lastCertNo = data[0].certificate_no;
  const lastSequence = parseInt(lastCertNo.slice(-3), 10);
  
  // Increment sequence number
  const newSequence = lastSequence + 1;
  
  // Check if sequence exceeds 999
  if (newSequence > 999) {
    throw new Error(`Certificate sequence limit reached for date ${prefix}. Maximum 999 certificates per day.`);
  }
  
  // Format new certificate number with padded sequence
  const sequenceStr = String(newSequence).padStart(3, '0');
  return `${prefix}${sequenceStr}`;
}

// Check if certificate number is available
export async function isCertificateNumberAvailable(certificateNo: string): Promise<boolean> {
  const existing = await getCertificateByNumber(certificateNo);
  return existing === null;
}

// Create new certificate
export async function createCertificate(
  certificateData: CreateCertificateData,
): Promise<Certificate> {

  try {
    // Validate required fields (name and issue_date are required, certificate_no will be auto-generated if not provided)
    if (
      !certificateData.name?.trim() ||
      !certificateData.issue_date
    ) {
      throw new Error(
        "Missing required fields: name and issue_date are required",
      );
    }

    // Auto-generate certificate number if not provided or empty
    let certificateNo = certificateData.certificate_no?.trim();
    if (!certificateNo) {
      const issueDate = new Date(certificateData.issue_date);
      certificateNo = await generateCertificateNumber(issueDate);
    } else {
      // Check if certificate number already exists
      const existingCertificate = await getCertificateByNumber(certificateNo);
      if (existingCertificate) {
        throw new Error(
          `Certificate with number ${certificateNo} already exists`,
        );
      }
    }

    // Generate unique public_id for the certificate
    const publicId = generatePublicId();
    
    // Generate unique XID for compact URLs
    const xid = generateXID();

    const insertData = {
      certificate_no: certificateNo,
      name: certificateData.name.trim(),
      description: certificateData.description?.trim() || null,
      issue_date: certificateData.issue_date,
      expired_date: certificateData.expired_date || null,
      category: certificateData.category?.trim() || null,
      template_id: certificateData.template_id || null,
      member_id: certificateData.member_id || null,
      tenant_id: certificateData.tenant_id || null,
      // Prefer public URL if provided; fall back to merged_image (data URL)
      certificate_image_url:
        certificateData.certificate_image_url ||
        certificateData.merged_image ||
        null,
      certificate_thumbnail_url: certificateData.certificate_thumbnail_url || null,
      // NEW: Handle score image URL for dual templates
      score_image_url: certificateData.score_image_url || null,
      score_thumbnail_url: certificateData.score_thumbnail_url || null,
      text_layers: certificateData.text_layers || [],
      public_id: publicId,
      xid: xid, // NEW: Short XID for compact URLs
      is_public: true, // Default to public
    };


    // Insert data into certificates table
    const { data, error } = await supabaseClient
      .from("certificates")
      .insert([insertData])
      .select(
        `
        *,
        templates (
          id,
          name,
          category,
          orientation
        ),
        members:members(*)
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to create certificate: ${error.message}`);
    }

    
    // Invalidate cache after successful creation
    if (typeof window !== 'undefined') {
      try {
        const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
        dataCache.delete(CACHE_KEYS.CERTIFICATES);
      } catch {
        // Cache module not available, ignore
      }
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

// Update certificate
export async function updateCertificate(
  id: string,
  certificateData: UpdateCertificateData,
): Promise<Certificate> {
  // Check if certificate exists
  const currentCertificate = await getCertificate(id);
  if (!currentCertificate) {
    throw new Error("Certificate not found");
  }

  // If updating certificate_no, check for duplicates
  if (
    certificateData.certificate_no &&
    certificateData.certificate_no !== currentCertificate.certificate_no
  ) {
    const existingCertificate = await getCertificateByNumber(
      certificateData.certificate_no,
    );
    if (existingCertificate && existingCertificate.id !== id) {
      throw new Error(
        `Certificate with number ${certificateData.certificate_no} already exists`,
      );
    }
  }

  const updateData: Partial<Certificate> = {
    certificate_no: certificateData.certificate_no,
    name: certificateData.name,
    description: certificateData.description,
    issue_date: certificateData.issue_date,
    expired_date: certificateData.expired_date,
    category: certificateData.category,
    template_id: certificateData.template_id,
    member_id: certificateData.member_id,
    certificate_image_url: certificateData.certificate_image_url,
    certificate_thumbnail_url: certificateData.certificate_thumbnail_url,
    score_image_url: certificateData.score_image_url, // NEW: For dual templates
    score_thumbnail_url: certificateData.score_thumbnail_url,
    text_layers: certificateData.text_layers,
  };

  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof Certificate] === undefined) {
      delete updateData[key as keyof Certificate];
    }
  });

  const { data, error } = await supabaseClient
    .from("certificates")
    .update(updateData)
    .eq("id", id)
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .single();

  if (error) {
    throw new Error(`Failed to update certificate: ${error.message}`);
  }

  // Invalidate cache after successful update
  if (typeof window !== 'undefined') {
    try {
      const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
      dataCache.delete(CACHE_KEYS.CERTIFICATES);
    } catch {
      // Cache module not available, ignore
    }
  }

  return data;
}

// Delete certificate
export async function deleteCertificate(id: string): Promise<void> {

  try {
    // Check if certificate exists
    const certificate = await getCertificate(id);
    if (!certificate) {
      throw new Error("Certificate not found");
    }


    // Check current user session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session) {
      throw new Error("No active session. Please sign in again.");
    }

    // Delete images from Supabase Storage BEFORE deleting from database
    
    // Extract filenames from URLs
    const deleteStorageFiles = async () => {
      const filesToDelete: string[] = [];
      
      // Extract filename from certificate_image_url
      if (certificate.certificate_image_url) {
        const certMatch = certificate.certificate_image_url.match(/certificates\/([^?]+)/);
        if (certMatch && certMatch[1]) {
          filesToDelete.push(certMatch[1]);
        }
      }
      
      // Extract filename from score_image_url
      if (certificate.score_image_url) {
        const scoreMatch = certificate.score_image_url.match(/certificates\/([^?]+)/);
        if (scoreMatch && scoreMatch[1]) {
          filesToDelete.push(scoreMatch[1]);
        }
      }
      
      // Delete files from storage
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabaseClient.storage
          .from('certificates')
          .remove(filesToDelete);
        
        if (storageError) {
          // Don't throw - continue with database deletion even if storage deletion fails
        }
      }
    };
    
    await deleteStorageFiles();

    // Delete certificate from database
    const { error } = await supabaseClient
      .from("certificates")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete certificate: ${error.message}`);
    }

    
    // Invalidate cache after successful deletion
    if (typeof window !== 'undefined') {
      try {
        const { dataCache, CACHE_KEYS } = await import('@/lib/cache/data-cache');
        dataCache.delete(CACHE_KEYS.CERTIFICATES);
      } catch {
        // Cache module not available, ignore
      }
    }
  } catch (error) {
    throw error;
  }
}

// Search certificates
export async function searchCertificates(
  query: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .or(
      `certificate_no.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to search certificates: ${error.message}`);
  }

  return data || [];
}

// Advanced search with filters
export interface SearchFilters {
  keyword?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export async function advancedSearchCertificates(
  filters: SearchFilters,
): Promise<Certificate[]> {
  try {
    // Check if keyword is provided
    const hasKeyword = filters.keyword && typeof filters.keyword === 'string' && filters.keyword.trim();
    
    // MUST have keyword to search - filters only narrow down search results
    if (!hasKeyword) {
      return [];
    }

    let query = supabaseClient
      .from("certificates")
      .select(
        `
        *,
        templates (
          id,
          name,
          category,
          orientation
        ),
        members:members(*)
      `,
      );

    // Keyword search - search in certificate_no and name (participant name in certificates table)
    // Note: We'll also filter by member name on client side after fetching
    const keyword = filters.keyword!.trim();
    
    // Sanitize keyword to prevent SQL injection
    const sanitizedKeyword = keyword.replace(/[%_]/g, '');
    if (!sanitizedKeyword) {
      return [];
    }
    
    query = query.or(
      `certificate_no.ilike.%${sanitizedKeyword}%,name.ilike.%${sanitizedKeyword}%`,
    );

    // Category filter (optional - to narrow down results)
    if (filters.category && typeof filters.category === 'string' && filters.category.trim()) {
      query = query.eq("category", filters.category.trim());
    }

    // Date range filter (optional - to narrow down results)
    if (filters.startDate && typeof filters.startDate === 'string') {
      query = query.gte("issue_date", filters.startDate);
    }
    if (filters.endDate && typeof filters.endDate === 'string') {
      query = query.lte("issue_date", filters.endDate);
    }

    // Limit results to prevent overwhelming the UI
    query = query.limit(100);

    // Order by most recent
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      // Return empty array instead of throwing to prevent crashes
      return [];
    }

    // Validate data
    if (!data || !Array.isArray(data)) {
      return [];
    }

    // If keyword search, also filter by member name on client side (since we can't do it in SQL with joined tables)
    let results = data || [];
    if (hasKeyword) {
      const keywordLower = filters.keyword!.trim().toLowerCase();
      results = results.filter(cert => {
        try {
          const certNo = (cert?.certificate_no || '').toLowerCase();
          const certName = (cert?.name || '').toLowerCase();
          const memberName = (cert?.members?.name || '').toLowerCase();
          
          return certNo.includes(keywordLower) || 
                 certName.includes(keywordLower) || 
                 memberName.includes(keywordLower);
        } catch (filterError) {
          return false;
        }
      });
    }

    return results;
  } catch (error) {
    // Return empty array instead of throwing to prevent crashes
    return [];
  }
}

// Get unique categories from certificates and templates
export async function getCertificateCategories(): Promise<string[]> {
  try {
    const categoriesSet = new Set<string>();

    // Fetch categories from certificates table
    const { data: certData, error: certError } = await supabaseClient
      .from("certificates")
      .select("category")
      .not("category", "is", null)
      .limit(1000);

    if (certError) {
    } else if (certData && Array.isArray(certData)) {
      certData.forEach((item) => {
        if (item && item.category && typeof item.category === 'string' && item.category.trim()) {
          categoriesSet.add(item.category.trim());
        }
      });
    }

    // Also fetch categories from templates table (if they exist there)
    const { data: templateData, error: templateError } = await supabaseClient
      .from("templates")
      .select("category")
      .not("category", "is", null)
      .limit(1000);

    if (templateError) {
    } else if (templateData && Array.isArray(templateData)) {
      templateData.forEach((item) => {
        if (item && item.category && typeof item.category === 'string' && item.category.trim()) {
          categoriesSet.add(item.category.trim());
        }
      });
    }

    return Array.from(categoriesSet).sort();
  } catch (error) {
    return [];
  }
}
  

// Get certificates by category
export async function getCertificatesByCategory(
  category: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch certificates by category: ${error.message}`,
    );
  }

  return data || [];
}

// Get certificates by template
export async function getCertificatesByTemplate(
  templateId: string,
): Promise<Certificate[]> {
  const { data, error } = await supabaseClient
    .from("certificates")
    .select(
      `
      *,
      templates (
        id,
        name,
        category,
        orientation
      ),
      members:members(*)
    `,
    )
    .eq("template_id", templateId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch certificates by template: ${error.message}`,
    );
  }

  return data || [];
}
