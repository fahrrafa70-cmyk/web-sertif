"use client";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Member } from "@/features/members/types";

interface MembersMobileListProps {
  currentMembers: Member[];
  filteredMembers: Member[];
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

export function MembersMobileList({
  currentMembers, filteredMembers, role, canDelete, deleting,
  searchQuery, language, openDetailModal, openEdit, deleteMember,
  setAddModalOpen, setFormErrors, setSearchQuery, t,
}: MembersMobileListProps) {
  return (
    <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4">
      {currentMembers.map((m) => (
        <div key={m.id} onClick={() => openDetailModal(m)}
          className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-300">
          <div className="space-y-2 mb-3">
            <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.name")}</div><div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{m.name}</div></div>
            <div className="grid grid-cols-2 gap-x-3">
              <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.organization")}</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.organization || "—"}</div></div>
              <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.job")}</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.job || "—"}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Email</div><div className="text-gray-700 dark:text-gray-300 text-xs break-words">{m.email || "—"}</div></div>
              {m.phone && <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Phone</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.phone}</div></div>}
            </div>
            {m.city && <div><div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{t("members.table.city")}</div><div className="text-gray-700 dark:text-gray-300 text-xs">{m.city}</div></div>}
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            {(role === "owner" || role === "manager" || role === "staff") && (
              <Button variant="outline" size="sm" className="flex-1 border-gray-300" onClick={() => openEdit(m)}>{t("common.edit")}</Button>
            )}
            <LoadingButton size="sm"
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50"
              onClick={() => deleteMember(m.id)} isLoading={deleting === m.id}
              loadingText={language === "id" ? "Menghapus..." : "Deleting..."}
              variant="destructive" disabled={!canDelete || deleting === m.id}>
              {t("common.delete")}
            </LoadingButton>
          </div>
        </div>
      ))}
      {filteredMembers.length === 0 && (
        <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl text-gray-400">👥</span></div>
          {searchQuery ? (
            <>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.search.noResults")}</h3>
              <p className="text-gray-500 mb-4">{t("members.search.noMatch")} &quot;{searchQuery}&quot;</p>
              <button onClick={() => setSearchQuery("")} className="text-blue-600 hover:text-blue-700 font-medium">{t("members.search.clearSearch")}</button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">{t("members.noMembersTitle")}</h3>
              <p className="text-gray-500 mb-4">{t("members.noMembersMessage")}</p>
              {(role === "owner" || role === "manager" || role === "staff") && (
                <button onClick={() => { setAddModalOpen(true); setFormErrors({}); }} className="text-blue-600 hover:text-blue-700 font-medium">
                  {language === "id" ? "Tambah Data" : "Add Data"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
