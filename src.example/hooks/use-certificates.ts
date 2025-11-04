import { useState, useEffect, useCallback } from 'react';
import { 
  getCertificates, 
  createCertificate, 
  updateCertificate, 
  deleteCertificate,
  searchCertificates,
  getCertificatesByCategory,
  getCertificatesByTemplate,
  Certificate,
  CreateCertificateData,
  UpdateCertificateData
} from '@/lib/supabase/certificates';

export function useCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCertificates();
      setCertificates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch certificates';
      setError(errorMessage);
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (certificateData: CreateCertificateData): Promise<Certificate> => {
    let tempId: string | null = null;
    try {
      setError(null);
      // Optimistic update - add to list immediately
      tempId = `temp-${Date.now()}`;
      const optimisticCert: Certificate = {
        id: tempId,
        certificate_no: certificateData.certificate_no || '...',
        name: certificateData.name,
        description: certificateData.description || null,
        issue_date: certificateData.issue_date,
        expired_date: certificateData.expired_date || null,
        category: certificateData.category || null,
        template_id: certificateData.template_id || null,
        member_id: certificateData.member_id || null,
        certificate_image_url: certificateData.certificate_image_url || null,
        score_image_url: certificateData.score_image_url || null,
        text_layers: certificateData.text_layers || [],
        score_data: certificateData.score_data || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        public_id: '',
        is_public: true,
      };
      setCertificates(prev => [optimisticCert, ...prev]);

      const newCertificate = await createCertificate(certificateData);
      
      // Replace optimistic update with real data
      setCertificates(prev => prev.map(cert => 
        cert.id === tempId ? newCertificate : cert
      ));

      // Clear cache to force refresh on next load
      if (typeof window !== 'undefined') {
        try {
          const { dataCache, CACHE_KEYS } = await import('../lib/cache/data-cache');
          dataCache.delete(CACHE_KEYS.CERTIFICATES);
        } catch {
          // Ignore
        }
      }

      return newCertificate;
    } catch (err) {
      // Remove optimistic update on error
      if (tempId) {
        setCertificates(prev => prev.filter(cert => !cert.id.startsWith('temp-')));
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to create certificate';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const update = useCallback(async (id: string, certificateData: UpdateCertificateData): Promise<Certificate> => {
    let oldCert: Certificate | undefined;
    try {
      setError(null);
      // Store old cert for rollback
      oldCert = certificates.find(c => c.id === id);
      
      // Optimistic update
      if (oldCert) {
        setCertificates(prev => prev.map(cert => 
          cert.id === id ? { ...cert, ...certificateData, updated_at: new Date().toISOString() } as Certificate : cert
        ));
      }

      const updatedCertificate = await updateCertificate(id, certificateData);
      setCertificates(prev => prev.map(cert => cert.id === id ? updatedCertificate : cert));

      // Clear cache
      if (typeof window !== 'undefined') {
        try {
          const { dataCache, CACHE_KEYS } = await import('../lib/cache/data-cache');
          dataCache.delete(CACHE_KEYS.CERTIFICATES);
        } catch {
          // Ignore
        }
      }

      return updatedCertificate;
    } catch (err) {
      // Revert optimistic update on error
      if (oldCert) {
        setCertificates(prev => prev.map(cert => cert.id === id ? oldCert! : cert));
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to update certificate';
      setError(errorMessage);
      throw err;
    }
  }, [certificates]);

  const deleteCert = useCallback(async (id: string): Promise<void> => {
    let deletedCert: Certificate | undefined;
    try {
      setError(null);
      // Store deleted cert for rollback
      deletedCert = certificates.find(c => c.id === id);
      
      // Optimistic update - remove from list immediately
      setCertificates(prev => prev.filter(cert => cert.id !== id));

      await deleteCertificate(id);

      // Clear cache
      if (typeof window !== 'undefined') {
        try {
          const { dataCache, CACHE_KEYS } = await import('../lib/cache/data-cache');
          dataCache.delete(CACHE_KEYS.CERTIFICATES);
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      // Revert optimistic update on error
      if (deletedCert) {
        setCertificates(prev => [...prev, deletedCert!].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete certificate';
      setError(errorMessage);
      throw err;
    }
  }, [certificates]);

  const search = useCallback(async (query: string): Promise<Certificate[]> => {
    try {
      setError(null);
      const results = await searchCertificates(query);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search certificates';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getByCategory = useCallback(async (category: string): Promise<Certificate[]> => {
    try {
      setError(null);
      const results = await getCertificatesByCategory(category);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch certificates by category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getByTemplate = useCallback(async (templateId: string): Promise<Certificate[]> => {
    try {
      setError(null);
      const results = await getCertificatesByTemplate(templateId);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch certificates by template';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return {
    certificates,
    loading,
    error,
    create,
    update,
    delete: deleteCert,
    search,
    getByCategory,
    getByTemplate,
    refresh
  };
}
