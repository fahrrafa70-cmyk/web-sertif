import { useState, useEffect, useCallback } from 'react';
import { 
  getCertificates, 
  getCertificate, 
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
    try {
      setError(null);
      const newCertificate = await createCertificate(certificateData);
      setCertificates(prev => [newCertificate, ...prev]);
      return newCertificate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create certificate';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const update = useCallback(async (id: string, certificateData: UpdateCertificateData): Promise<Certificate> => {
    try {
      setError(null);
      const updatedCertificate = await updateCertificate(id, certificateData);
      setCertificates(prev => prev.map(cert => cert.id === id ? updatedCertificate : cert));
      return updatedCertificate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update certificate';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteCert = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await deleteCertificate(id);
      setCertificates(prev => prev.filter(cert => cert.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete certificate';
      setError(errorMessage);
      throw err;
    }
  }, []);

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
