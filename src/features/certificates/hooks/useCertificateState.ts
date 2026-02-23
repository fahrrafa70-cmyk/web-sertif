import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Certificate } from "@/lib/supabase/certificates";

export function useCertificateState({
  certificates,
  selectedTenantId,
  certQuery,
}: {
  certificates: Certificate[];
  selectedTenantId: string;
  certQuery: string;
}) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchInput = useDebounce(searchInput, 100);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [tempCategoryFilter, setTempCategoryFilter] = useState("");
  const [tempDateFilter, setTempDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    const check = () => setItemsPerPage(window.innerWidth < 768 ? 5 : 10);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filtered = useMemo(() => {
    if (!selectedTenantId) return [];
    let certs = certificates.filter((c) => c.tenant_id === selectedTenantId);
    const q = (debouncedSearchInput || certQuery || "").toLowerCase();
    if (q) {
      certs = certs.filter(
        (c) =>
          c.certificate_no.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) certs = certs.filter((c) => c.category === categoryFilter);
    if (dateFilter) certs = certs.filter((c) => c.issue_date === dateFilter);
    return certs;
  }, [certificates, debouncedSearchInput, certQuery, categoryFilter, dateFilter, selectedTenantId]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCertificates = useMemo(
    () => filtered.slice(indexOfFirstItem, indexOfLastItem),
    [filtered, indexOfFirstItem, indexOfLastItem]
  );
  const totalPages = useMemo(
    () => Math.ceil(filtered.length / itemsPerPage),
    [filtered, itemsPerPage]
  );

  useEffect(() => { setCurrentPage(1); }, [searchInput, categoryFilter, dateFilter]);
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage]);

  const openFilterModal = () => {
    setTempCategoryFilter(categoryFilter);
    setTempDateFilter(dateFilter);
    setFilterModalOpen(true);
  };
  const applyFilters = () => {
    setCategoryFilter(tempCategoryFilter);
    setDateFilter(tempDateFilter);
    setFilterModalOpen(false);
  };
  const cancelFilters = () => {
    setTempCategoryFilter(categoryFilter);
    setTempDateFilter(dateFilter);
    setFilterModalOpen(false);
  };

  return {
    searchInput, setSearchInput, categoryFilter, dateFilter,
    filterModalOpen, setFilterModalOpen, tempCategoryFilter, setTempCategoryFilter, tempDateFilter, setTempDateFilter,
    openFilterModal, applyFilters, cancelFilters,
    currentPage, setCurrentPage, itemsPerPage, totalPages, filtered, currentCertificates, indexOfFirstItem, indexOfLastItem,
  };
}
