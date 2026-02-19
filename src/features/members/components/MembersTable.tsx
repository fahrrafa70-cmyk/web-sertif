"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Member } from "@/features/members/types";

interface MembersTableProps {
  currentMembers: Member[];
  filteredMembers: Member[];
  indexOfFirstItem: number;
  role: string | null;
  canDelete: boolean;
  deleting: string | null;
  searchQuery: string;
  language: string;
  openDetailModal: (m: Member) => void;
  openEdit: (m: Member) => void;
  deleteMember: (id: string) => void;
  setAddModalOpen: (v: boolean) => void;
  setFormErrors: (e: Record<string, string>) => void;
  setSearchQuery: (q: string) => void;
  t: (key: string) => string;
}

export function MembersTable({
  currentMembers, filteredMembers, indexOfFirstItem, role, canDelete, deleting,
  searchQuery, language, openDetailModal, openEdit, deleteMember,
  setAddModalOpen, setFormErrors, setSearchQuery, t,
}: MembersTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.4 }}
      className="hidden xl:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden mt-4"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
              <TableHead className="w-10 text-center px-2">#</TableHead>
              <TableHead className="min-w-[120px] px-2">{t("members.table.name")}</TableHead>
              <TableHead className="min-w-[130px] px-2">{t("members.table.organization")}</TableHead>
              <TableHead className="min-w-[150px] px-2">{t("members.table.contact")}</TableHead>
              <TableHead className="min-w-[80px] px-2">{t("members.table.job")}</TableHead>
              <TableHead className="min-w-[100px] px-2">{t("members.table.city")}</TableHead>
              <TableHead className="min-w-[140px] px-2">
                <div className="w-full flex justify-center"><span className="text-center">{t("members.table.actions")}</span></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentMembers.map((m, index) => (
              <TableRow key={m.id} onClick={() => openDetailModal(m)} className="cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-gray-100 last:border-0">
                <TableCell className="text-gray-500 text-center px-2 py-1.5">{indexOfFirstItem + index + 1}</TableCell>
                <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-2 py-1.5 break-words min-w-[120px]">{m.name}</TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[130px]">{m.organization || "—"}</TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 min-w-[150px]">
                  <div className="flex flex-col">
                    <span className="text-gray-900 dark:text-gray-100 break-words">{m.email || "—"}</span>
                    {m.phone && <span className="text-xs text-gray-500 mt-0.5 break-words">{m.phone}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[80px]">{m.job || "—"}</TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300 px-2 py-1.5 break-words min-w-[100px]">{m.city || "—"}</TableCell>
                <TableCell className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-1.5">
                    {(role === "owner" || role === "manager" || role === "staff") && (
                      <Button variant="outline" size="sm" className="border-gray-300" onClick={() => openEdit(m)}>{t("common.edit")}</Button>
                    )}
                    <LoadingButton size="sm"
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => deleteMember(m.id)} isLoading={deleting === m.id}
                      loadingText={language === "id" ? "Menghapus..." : "Deleting..."}
                      variant="destructive" disabled={!canDelete || deleting === m.id}>
                      {t("common.delete")}
                    </LoadingButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 dark:text-gray-400 py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl text-gray-400">👥</span></div>
                    {searchQuery ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.search.noResults")}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">{t("members.search.noMatch")} &quot;{searchQuery}&quot;</p>
                        <button onClick={() => setSearchQuery("")} className="text-blue-600 hover:text-blue-700 font-medium">{t("members.search.clearSearch")}</button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.noMembersTitle")}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">{t("members.noMembersMessage")}</p>
                        {(role === "owner" || role === "manager" || role === "staff") && (
                          <button onClick={() => { setAddModalOpen(true); setFormErrors({}); }} className="text-blue-600 hover:text-blue-700 font-medium">
                            {language === "id" ? "Tambah Data" : "Add Data"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
