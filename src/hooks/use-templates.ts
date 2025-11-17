import { useState, useEffect, useCallback } from 'react';
import { Template, CreateTemplateData, UpdateTemplateData, getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/supabase/templates';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚀 PERFORMANCE: Optimized templates loading
  const loadTemplates = useCallback(async (bypassCache: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // 🚀 CRITICAL: Direct fetch without cache complexity
      const data = await getTemplates(false); // Always bypass cache for consistent performance
      console.log('📥 Templates loaded:', data.length);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create template
  const create = useCallback(async (templateData: CreateTemplateData) => {
    try {
      setError(null);
      const newTemplate = await createTemplate(templateData);
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update template
  const update = useCallback(async (id: string, templateData: UpdateTemplateData) => {
    try {
      setError(null);
      const updatedTemplate = await updateTemplate(id, templateData);
      console.log('🔄 useTemplates update - returned template:', updatedTemplate, 'with status:', updatedTemplate?.status);
      // Update local state with the returned template (which should include status)
      setTemplates(prev => {
        const updated = prev.map(t => t.id === id ? updatedTemplate : t);
        console.log('🔄 Updated templates state, status for updated template:', updated.find(t => t.id === id)?.status);
        return updated;
      });
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Delete template
  const remove = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Load templates on mount - only once
  useEffect(() => {
    loadTemplates();
  }, []); // Remove loadTemplates dependency to prevent reloads

  return {
    templates,
    loading,
    error,
    create,
    update,
    delete: remove,
    refresh: loadTemplates
  };
}

