"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/language-context";

type CertItem = {
  number: string;
  recipient: string;
  category: string;
  issueDate: string;
  expiryDate: string;
};

const INITIAL_CERTS: CertItem[] = [
  { number: "EC-2025-0001", recipient: "Ayu Pratama", category: "Training", issueDate: "2025-01-12", expiryDate: "2027-01-12" },
  { number: "EC-2025-0002", recipient: "Budi Santoso", category: "Internship", issueDate: "2025-02-05", expiryDate: "2027-02-05" },
  { number: "EC-2025-0003", recipient: "Clara Wijaya", category: "MoU", issueDate: "2025-03-21", expiryDate: "—" },
];

export default function CertificatesPage() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const certQuery = (params?.get("cert") || "").toLowerCase();
  const [role, setRole] = useState<"Admin" | "Team" | "Public">("Public");
  const [items, setItems] = useState<CertItem[]>(INITIAL_CERTS);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("ecert-role");
      if (saved === "Admin" || saved === "Team" || saved === "Public") setRole(saved);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    const q = (searchInput || certQuery).toLowerCase();
    return q ? items.filter((c) =>
      c.number.toLowerCase().includes(q) ||
      c.recipient.toLowerCase().includes(q)
    ) : items;
  }, [items, searchInput, certQuery]);

  const [isEditOpen, setIsEditOpen] = useState<null | string>(null);
  const [draft, setDraft] = useState<CertItem | null>(null);
  const canDelete = role === "Admin"; // Team cannot delete

  function openEdit(item: CertItem) {
    setDraft({ ...item });
    setIsEditOpen(item.number);
  }

  function submitEdit() {
    if (!draft || !isEditOpen) return;
    setItems((prev) => prev.map((it) => (it.number === isEditOpen ? { ...draft } : it)));
    setIsEditOpen(null);
    setDraft(null);
  }

  function requestDelete(id: string) {
    if (!canDelete) return;
    setItems((prev) => prev.filter((it) => it.number !== id));
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <section className="bg-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('certificates.title')}</h1>
                <p className="text-gray-500 mt-1">{t('certificates.subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Input placeholder={t('certificates.search')} className="w-64" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                <Input placeholder="Filter by category" className="w-48" />
                <Input placeholder="Filter by date" className="w-40" type="date" />
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <Table>
                <TableCaption>Static data for demonstration</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('certificates.certificateId')}</TableHead>
                    <TableHead>{t('certificates.recipient')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>{t('certificates.issuedDate')}</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">{t('certificates.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.number}>
                      <TableCell className="font-medium">{c.number}</TableCell>
                      <TableCell>{c.recipient}</TableCell>
                      <TableCell>{c.category}</TableCell>
                      <TableCell>{c.issueDate}</TableCell>
                      <TableCell>{c.expiryDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="border-gray-300">{t('common.preview')}</Button>
                          {(role === "Admin" || role === "Team") && (
                            <Button variant="outline" className="border-gray-300" onClick={() => openEdit(c)}>{t('common.edit')}</Button>
                          )}
                          {canDelete ? (
                            <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white" onClick={() => requestDelete(c.number)}>{t('common.delete')}</Button>
                          ) : (
                            <Button variant="outline" className="border-gray-300 opacity-50 cursor-not-allowed" aria-disabled>
                              {t('common.delete')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Edit Certificate Sheet - portal */}
      <Sheet open={!!isEditOpen} onOpenChange={(o) => setIsEditOpen(o ? isEditOpen : null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t('common.edit')} {t('certificates.title')}</SheetTitle>
            <SheetDescription>Update certificate details.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">{t('certificates.recipient')}</label>
              <Input value={draft?.recipient ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, recipient: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Category</label>
              <Input value={draft?.category ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">{t('certificates.issuedDate')}</label>
              <Input type="date" value={draft?.issueDate ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, issueDate: e.target.value } : d))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Expiry Date</label>
              <Input type="date" value={draft?.expiryDate ?? ""} onChange={(e) => setDraft((d) => (d ? { ...d, expiryDate: e.target.value } : d))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-gray-300" onClick={() => setIsEditOpen(null)}>{t('common.cancel')}</Button>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white" onClick={submitEdit}>{t('common.save')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}


