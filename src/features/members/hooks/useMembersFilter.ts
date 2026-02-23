import { useState, useMemo, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import type { Member } from "@/lib/supabase/members";

const ITEMS_PER_PAGE = 10;

export function useMembersFilter(membersData: Member[], selectedTenantId: string) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [tempOrganizationFilter, setTempOrganizationFilter] = useState("");
  const [tempCityFilter, setTempCityFilter] = useState("");
  const [tempJobFilter, setTempJobFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);

  // reset page on search
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const uniqueOrganizations = useMemo(() => {
    const s = new Set<string>();
    membersData.forEach((m) => { if (m.organization) s.add(m.organization); });
    return [...s].sort();
  }, [membersData]);

  const uniqueCities = useMemo(() => {
    const s = new Set<string>();
    membersData.forEach((m) => { if (m.city) s.add(m.city); });
    return [...s].sort();
  }, [membersData]);

  const uniqueJobs = useMemo(() => {
    const s = new Set<string>();
    membersData.forEach((m) => { if (m.job) s.add(m.job); });
    return [...s].sort();
  }, [membersData]);

  const filteredMembers = useMemo(() => {
    if (!selectedTenantId) return [];
    let result = membersData.filter((m) => m.tenant_id === selectedTenantId);
    if (organizationFilter) result = result.filter((m) => m.organization === organizationFilter);
    if (cityFilter) result = result.filter((m) => m.city === cityFilter);
    if (jobFilter) result = result.filter((m) => m.job === jobFilter);
    if (!debouncedSearchQuery.trim()) return result;
    const q = debouncedSearchQuery.toLowerCase();
    return result.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.email?.toLowerCase().includes(q)) ||
      (m.organization?.toLowerCase().includes(q)) ||
      (m.phone?.toLowerCase().includes(q)) ||
      (m.job?.toLowerCase().includes(q)) ||
      (m.city?.toLowerCase().includes(q))
    );
  }, [membersData, debouncedSearchQuery, organizationFilter, cityFilter, jobFilter, selectedTenantId]);

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentMembers = useMemo(
    () => filteredMembers.slice(indexOfFirstItem, indexOfLastItem),
    [filteredMembers, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);

  const openFilterModal = useCallback(() => {
    setTempOrganizationFilter(organizationFilter);
    setTempCityFilter(cityFilter);
    setTempJobFilter(jobFilter);
    setFilterModalOpen(true);
  }, [organizationFilter, cityFilter, jobFilter]);

  const applyFilters = useCallback(() => {
    setOrganizationFilter(tempOrganizationFilter);
    setCityFilter(tempCityFilter);
    setJobFilter(tempJobFilter);
    setFilterModalOpen(false);
    setCurrentPage(1);
  }, [tempOrganizationFilter, tempCityFilter, tempJobFilter]);

  const cancelFilters = useCallback(() => {
    setTempOrganizationFilter(organizationFilter);
    setTempCityFilter(cityFilter);
    setTempJobFilter(jobFilter);
    setFilterModalOpen(false);
  }, [organizationFilter, cityFilter, jobFilter]);

  return {
    searchQuery, setSearchQuery,
    organizationFilter, cityFilter, jobFilter,
    tempOrganizationFilter, setTempOrganizationFilter,
    tempCityFilter, setTempCityFilter,
    tempJobFilter, setTempJobFilter,
    filterModalOpen, setFilterModalOpen,
    openFilterModal, applyFilters, cancelFilters,
    uniqueOrganizations, uniqueCities, uniqueJobs,
    filteredMembers, currentMembers, currentPage, setCurrentPage,
    totalPages, indexOfFirstItem, indexOfLastItem,
  };
}
