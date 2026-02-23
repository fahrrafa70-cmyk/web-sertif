"use client";

import { useCallback, useEffect } from "react";
import { useSearchCore } from "./useSearchCore";
import { useCertificateExport } from "@/features/certificates/hooks/useCertificateExport";
import { useCertificateEmail } from "@/features/certificates/hooks/useCertificateEmail";

export function useSearchPage() {
  const core = useSearchCore();
  const exportOps = useCertificateExport({ t: core.t });
  const emailOps = useCertificateEmail({ t: core.t });

  // In the original useSearchPage, closing the send email dialog also automatically 
  // closed the underlying preview dialog to return directly to the search list.
  const handleCloseSendModal = useCallback(() => {
    emailOps.closeSendModal();
    core.setPreviewOpen(false);
    core.setPreviewCert(null);
    core.setIsModalOpen(false);
  }, [emailOps, core]);

  // If the emailOps internally closes the send modal (e.g. after a successful send),
  // we should also ensure the preview dialong gets closed to stay consistent with original behavior.
  useEffect(() => {
    if (!emailOps.sendModalOpen && core.previewOpen) {
      core.setPreviewOpen(false);
      core.setPreviewCert(null);
      core.setIsModalOpen(false);
    }
  }, [emailOps.sendModalOpen, core.previewOpen, core]);

  // Wrap the confirmSendEmail so that it also triggers the dialog close cleanup consistently
  const handleConfirmSendEmail = useCallback(async () => {
    await emailOps.confirmSendEmail();
    if (!emailOps.sendModalOpen) {
      core.setPreviewOpen(false);
      core.setPreviewCert(null);
      core.setIsModalOpen(false);
    }
  }, [emailOps, core]);

  return {
    ...core,
    ...exportOps,
    ...emailOps,
    closeSendModal: handleCloseSendModal,
    confirmSendEmail: handleConfirmSendEmail,
    // Provide explicit setter for form errors in case old components need it, 
    // although we refactored SendEmailDialog to not need it.
    setSendFormErrors: () => {}, 
  };
}

