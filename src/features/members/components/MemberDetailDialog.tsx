"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";
import type { Member } from "@/features/members/types";

interface MemberDetailDialogProps {
  detailModalOpen: boolean;
  setDetailModalOpen: (v: boolean) => void;
  detailMember: Member | null;
  role: string | null;
  language: string;
  openEdit: (m: Member) => void;
  t: (key: string) => string;
}

export function MemberDetailDialog({
  detailModalOpen, setDetailModalOpen, detailMember, role, language, openEdit, t,
}: MemberDetailDialogProps) {
  return (
    <Dialog open={detailModalOpen && !!detailMember} onOpenChange={setDetailModalOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 sm:p-6">
        <DialogHeader className="px-4 sm:px-0 pt-4 sm:pt-0 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t("members.detail.title")}</DialogTitle>
        </DialogHeader>
        {detailMember && (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-0 py-4 sm:py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Full Name</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.name}</div></div>
                {detailMember.email && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Email</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div></div>}
                {detailMember.phone && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Phone</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.phone}</div></div>}
                {detailMember.organization && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Organization / School</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.organization}</div></div>}
                {detailMember.job && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Job / Position</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.job}</div></div>}
                {detailMember.date_of_birth && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">Date of Birth</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{formatReadableDate(detailMember.date_of_birth, language as "id" | "en")}</div></div>}
                {detailMember.city && <div className="space-y-1"><label className="text-xs sm:text-sm font-medium text-gray-500">City</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{detailMember.city}</div></div>}
                {detailMember.address && <div className="space-y-1 sm:col-span-2"><label className="text-xs sm:text-sm font-medium text-gray-500">Address</label><div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.address}</div></div>}
                {detailMember.notes && <div className="space-y-1 sm:col-span-2"><label className="text-xs sm:text-sm font-medium text-gray-500">Notes</label><div className="text-sm sm:text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{detailMember.notes}</div></div>}
              </div>
              {(detailMember.created_at || detailMember.updated_at) && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                    <div>{detailMember.created_at && <><span className="font-medium">Created:</span> <span className="text-gray-600 dark:text-gray-300">{formatReadableDate(detailMember.created_at, language as "id" | "en")}</span></>}</div>
                    <div>{detailMember.updated_at && <><span className="font-medium">Updated:</span> <span className="text-gray-600 dark:text-gray-300">{formatReadableDate(detailMember.updated_at, language as "id" | "en")}</span></>}</div>
                  </div>
                </div>
              )}
            </div>
            {(role === "owner" || role === "manager" || role === "staff") && (
              <div className="flex-shrink-0 px-4 sm:px-0 pt-4 pb-4 sm:pb-0 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end gap-3">
                  <Button className="gradient-primary text-white text-sm sm:text-base px-4 sm:px-6" onClick={() => { setDetailModalOpen(false); openEdit(detailMember); }}>Edit</Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
