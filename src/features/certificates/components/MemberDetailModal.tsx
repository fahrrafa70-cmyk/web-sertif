"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatReadableDate } from "@/lib/utils/certificate-formatters";

interface MemberDetail {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  job?: string;
  date_of_birth?: string | null;
  city?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface MemberDetailModalProps {
  memberDetailOpen: boolean;
  setMemberDetailOpen: (open: boolean) => void;
  detailMember: MemberDetail | null;
  loadingMemberDetail: boolean;
  language: string;
}

export function MemberDetailModal({
  memberDetailOpen, setMemberDetailOpen, detailMember, loadingMemberDetail, language,
}: MemberDetailModalProps) {
  if (!memberDetailOpen) return null;

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <Sheet open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
        <SheetContent side="bottom" className="md:hidden max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <div className="flex-shrink-0 mb-4">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <SheetHeader>
              <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Member Information</SheetTitle>
              <SheetDescription className="text-sm text-gray-600 dark:text-gray-400">
                {detailMember?.name || "Loading..."}
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="overflow-y-auto">
            {loadingMemberDetail ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading...</span>
              </div>
            ) : detailMember ? (
              <div className="space-y-4 pb-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                  <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100 break-words">{detailMember.name}</div>
                </div>
                {detailMember.email && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div>
                  </div>
                )}
                {detailMember.date_of_birth && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {formatReadableDate(detailMember.date_of_birth, language as "id" | "en")}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Dialog */}
      <div className="hidden md:block">
        <Dialog open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
          <DialogContent className="hidden md:flex max-w-3xl w-full max-h-[90vh] overflow-hidden flex-col p-4 md:p-6">
            <DialogHeader className="flex-shrink-0 pb-4">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">Member Information</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              {loadingMemberDetail ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading member details...</span>
                </div>
              ) : detailMember ? (
                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                      <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.name}</div>
                    </div>
                    {detailMember.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                        <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.email}</div>
                      </div>
                    )}
                    {detailMember.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                        <div className="mt-1 text-base text-gray-900 dark:text-gray-100">{detailMember.phone}</div>
                      </div>
                    )}
                    {detailMember.organization && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Organization</label>
                        <div className="mt-1 text-base text-gray-900 dark:text-gray-100 break-words">{detailMember.organization}</div>
                      </div>
                    )}
                    {detailMember.date_of_birth && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                        <div className="mt-1 text-base text-gray-900 dark:text-gray-100">
                          {formatReadableDate(detailMember.date_of_birth, language as "id" | "en")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
