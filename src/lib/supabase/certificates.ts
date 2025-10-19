import { supabaseClient } from "./client";

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
  certificate_image_url: string | null;
  text_layers: TextLayer[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  members?: any; // joined member row
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
  isEditing?: boolean;
}

export interface CreateCertificateData {
  certificate_no: string;
  name: string;
  description?: string;
  issue_date: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  certificate_image_url?: string;
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
  certificate_image_url?: string;
  text_layers?: TextLayer[];
}

// Get all certificates
export async function getCertificates(): Promise<Certificate[]> {
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

// Create new certificate
export async function createCertificate(
  certificateData: CreateCertificateData,
): Promise<Certificate> {
  console.log("🚀 Starting certificate creation process...", certificateData);

  try {
    // Validate required fields
    if (
      !certificateData.certificate_no?.trim() ||
      !certificateData.name?.trim() ||
      !certificateData.issue_date
    ) {
      throw new Error(
        "Missing required fields: certificate_no, name, and issue_date are required",
      );
    }

    // Check if certificate number already exists
    const existingCertificate = await getCertificateByNumber(
      certificateData.certificate_no,
    );
    if (existingCertificate) {
      throw new Error(
        `Certificate with number ${certificateData.certificate_no} already exists`,
      );
    }

    const insertData = {
      certificate_no: certificateData.certificate_no.trim(),
      name: certificateData.name.trim(),
      description: certificateData.description?.trim() || null,
      issue_date: certificateData.issue_date,
      expired_date: certificateData.expired_date || null,
      category: certificateData.category?.trim() || null,
      template_id: certificateData.template_id || null,
      member_id: certificateData.member_id || null,
      // Prefer public URL if provided; fall back to merged_image (data URL)
      certificate_image_url:
        certificateData.certificate_image_url ||
        certificateData.merged_image ||
        null,
      text_layers: certificateData.text_layers || [],
    };

    console.log("💾 Inserting certificate data to database:", insertData);

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
      console.error("❌ Database insert error:", error);
      throw new Error(`Failed to create certificate: ${error.message}`);
    }

    console.log("✅ Certificate created successfully in database:", data);
    return data;
  } catch (error) {
    console.error("💥 Certificate creation process failed:", error);
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

  return data;
}

// Delete certificate
export async function deleteCertificate(id: string): Promise<void> {
  console.log("🗑️ Starting certificate deletion process...", {
    certificateId: id,
  });

  try {
    // Check if certificate exists
    const certificate = await getCertificate(id);
    if (!certificate) {
      throw new Error("Certificate not found");
    }

    console.log("📋 Certificate found:", {
      certificate_no: certificate.certificate_no,
      name: certificate.name,
    });

    // Check current user session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    console.log("🔐 Current session:", { 
      hasSession: !!session, 
      userId: session?.user?.id,
      email: session?.user?.email,
      sessionError 
    });

    if (sessionError) {
      console.error("❌ Session error:", sessionError);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session) {
      throw new Error("No active session. Please sign in again.");
    }

    // Delete certificate from database
    console.log("🗃️ Deleting certificate from database...");
    const { error } = await supabaseClient
      .from("certificates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Database deletion error:", error);
      console.error("❌ Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to delete certificate: ${error.message}`);
    }

    console.log("✅ Certificate deleted successfully from database");
  } catch (error) {
    console.error("💥 Certificate deletion process failed:", error);
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
