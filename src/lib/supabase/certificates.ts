/**
 * @deprecated Barrel re-export — import directly from feature modules:
 *   - Types:     @/features/certificates/types
 *   - Queries:   @/features/certificates/queries
 *   - Mutations: @/features/certificates/mutations
 *   - Service:   @/features/certificates/service
 *
 * This file exists only to preserve backwards compatibility.
 */

// Types
export type { Certificate, TextLayer, CreateCertificateData, UpdateCertificateData, SearchFilters, PublicSearchFilters } from "@/features/certificates/types";

// Queries
export {
  getCertificates,
  getCertificate,
  getCertificateByNumber,
  getCertificateByPublicId,
  getCertificateByXID,
  getCertificatesByMember,
  getCertificatesByCategory,
  getCertificatesByTemplate,
  searchCertificates,
  advancedSearchCertificates,
  publicSearchCertificates,
  getCertificateCategories,
} from "@/features/certificates/queries";

// Mutations
export {
  createCertificate,
  updateCertificate,
  deleteCertificate,
  isCertificateNumberAvailable,
  isCheckNumberAvailable,
} from "@/features/certificates/mutations";

// Service
export {
  generatePublicId,
  generateCertificateNumber,
  generateCheckNumber,
} from "@/features/certificates/service";
