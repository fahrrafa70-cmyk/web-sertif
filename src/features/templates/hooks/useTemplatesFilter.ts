import { useState, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import type { Template } from "@/lib/supabase/templates";

export function useTemplatesFilter(templates: Template[], selectedTenantId: string) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 100);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [orientationFilter, setOrientationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState("");
  const [tempOrientationFilter, setTempOrientationFilter] = useState("");
  const [tempStatusFilter, setTempStatusFilter] = useState("");

  const openFilterModal = useCallback(() => {
    setTempCategoryFilter(categoryFilter);
    setTempOrientationFilter(orientationFilter);
    setTempStatusFilter(statusFilter);
    setFilterModalOpen(true);
  }, [categoryFilter, orientationFilter, statusFilter]);

  const applyFilters = useCallback(() => {
    setCategoryFilter(tempCategoryFilter);
    setOrientationFilter(tempOrientationFilter);
    setStatusFilter(tempStatusFilter);
    setFilterModalOpen(false);
  }, [tempCategoryFilter, tempOrientationFilter, tempStatusFilter]);

  const cancelFilters = useCallback(() => {
    setTempCategoryFilter(categoryFilter);
    setTempOrientationFilter(orientationFilter);
    setTempStatusFilter(statusFilter);
    setFilterModalOpen(false);
  }, [categoryFilter, orientationFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!templates.length || !selectedTenantId) return [];
    let list = templates.filter((t) => t.tenant_id === selectedTenantId);
    if (!list.length) return [];
    if (categoryFilter) { list = list.filter((t) => t.category === categoryFilter); if (!list.length) return []; }
    if (orientationFilter) { list = list.filter((t) => t.orientation === orientationFilter); if (!list.length) return []; }
    if (statusFilter === "ready") { list = list.filter((t) => t.is_layout_configured); if (!list.length) return []; }
    else if (statusFilter === "draft") { list = list.filter((t) => !t.is_layout_configured); if (!list.length) return []; }
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase().trim();
      if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  }, [templates, debouncedQuery, categoryFilter, orientationFilter, statusFilter, selectedTenantId]);

  return {
    query, setQuery,
    categoryFilter, setCategoryFilter,
    orientationFilter, setOrientationFilter,
    statusFilter, setStatusFilter,
    tempCategoryFilter, setTempCategoryFilter,
    tempOrientationFilter, setTempOrientationFilter,
    tempStatusFilter, setTempStatusFilter,
    filterModalOpen, setFilterModalOpen,
    openFilterModal, applyFilters, cancelFilters,
    filtered
  };
}
