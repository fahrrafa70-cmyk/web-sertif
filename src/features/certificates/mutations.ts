import { supabaseClient } from "@/lib/supabase/client";
import type { Certificate, CreateCertificateData, UpdateCertificateData } from "./types";
import {
  getCertificate,
  getCertificateByNumber,
} from "./queries";
import {
  generateCertificateNumber,
  generatePublicId,
  getCurrentUserTenantRoleForCertificate,
  invalidateCertificatesCache,
  deleteCertificateStorageFiles,
} from "./service";
import { generateXID } from "@/lib/utils/generate-xid";

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

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCertificate(
  certificateData: CreateCertificateData,
): Promise<Certificate> {
  if (!certificateData.name?.trim() || !certificateData.issue_date) {
    throw new Error("Missing required fields: name and issue_date are required");
  }

  let certificateNo = certificateData.certificate_no?.trim();
  if (!certificateNo) {
    certificateNo = await generateCertificateNumber(new Date(certificateData.issue_date));
  } else {
    const existing = await getCertificateByNumber(certificateNo);
    if (existing) throw new Error(`Certificate with number ${certificateNo} already exists`);
  }

  if (certificateData.tenant_id) {
    const role = await getCurrentUserTenantRoleForCertificate(certificateData.tenant_id);
    if (!role) throw new Error("You are not a member of this tenant");
  }

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
    certificate_image_url:
      certificateData.certificate_image_url || certificateData.merged_image || null,
    certificate_thumbnail_url: certificateData.certificate_thumbnail_url || null,
    score_image_url: certificateData.score_image_url || null,
    score_thumbnail_url: certificateData.score_thumbnail_url || null,
    text_layers: certificateData.text_layers || [],
    public_id: generatePublicId(),
    xid: generateXID(),
    is_public: true,
  };

  const { data, error } = await supabaseClient
    .from("certificates")
    .insert([insertData])
    .select(CERT_SELECT_FULL)
    .single();

  if (error) throw new Error(`Failed to create certificate: ${error.message}`);
  await invalidateCertificatesCache();
  return data;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCertificate(
  id: string,
  certificateData: UpdateCertificateData,
): Promise<Certificate> {
  const currentCertificate = await getCertificate(id);
  if (!currentCertificate) throw new Error("Certificate not found");

  if (currentCertificate.tenant_id) {
    const role = await getCurrentUserTenantRoleForCertificate(currentCertificate.tenant_id);
    if (!role) throw new Error("You are not a member of this tenant");
    if (role === "staff") throw new Error("Staff cannot edit certificates in this tenant");
  }

  if (
    certificateData.certificate_no &&
    certificateData.certificate_no !== currentCertificate.certificate_no
  ) {
    const existing = await getCertificateByNumber(certificateData.certificate_no);
    if (existing && existing.id !== id)
      throw new Error(`Certificate with number ${certificateData.certificate_no} already exists`);
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
    score_image_url: certificateData.score_image_url,
    score_thumbnail_url: certificateData.score_thumbnail_url,
    text_layers: certificateData.text_layers,
  };

  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof Certificate] === undefined)
      delete updateData[key as keyof Certificate];
  });

  const { data, error } = await supabaseClient
    .from("certificates")
    .update(updateData)
    .eq("id", id)
    .select(CERT_SELECT_FULL)
    .single();

  if (error) throw new Error(`Failed to update certificate: ${error.message}`);
  await invalidateCertificatesCache();
  return data;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteCertificate(id: string): Promise<void> {
  const certificate = await getCertificate(id);
  if (!certificate) throw new Error("Certificate not found");

  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`);
  if (!session) throw new Error("No active session. Please Login again.");

  await deleteCertificateStorageFiles(
    certificate.certificate_image_url,
    certificate.score_image_url,
  );

  const { error } = await supabaseClient
    .from("certificates")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Failed to delete certificate: ${error.message}`);
  await invalidateCertificatesCache();
}

// ─── Availability checks ──────────────────────────────────────────────────────

export async function isCertificateNumberAvailable(
  certificateNo: string,
): Promise<boolean> {
  const existing = await getCertificateByNumber(certificateNo);
  return existing === null;
}

export async function isCheckNumberAvailable(
  checkNumber: string,
): Promise<boolean> {
  const existing = await getCertificateByNumber(checkNumber);
  return existing === null;
}
