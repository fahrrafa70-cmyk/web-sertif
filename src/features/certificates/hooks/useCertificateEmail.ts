"use client";

/**
 * useCertificateEmail
 *
 * Encapsulates email send modal state and logic extracted from hero-section.tsx:
 *  - openSendEmailModal  – prepare and open the modal
 *  - confirmSendEmail    – validate form and POST to /api/send-certificate
 *  - modal state (open, form values, errors, loading)
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Certificate } from "@/features/certificates/types";

interface SendForm {
  email: string;
  subject: string;
  message: string;
}

interface SendFormErrors {
  email?: string;
  subject?: string;
  message?: string;
}

interface UseCertificateEmailOptions {
  t: (key: string) => string;
}

export function useCertificateEmail({ t }: UseCertificateEmailOptions) {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendFormErrors, setSendFormErrors] = useState<SendFormErrors>({});
  const [sendForm, setSendForm] = useState<SendForm>({ email: "", subject: "", message: "" });
  const [sendPreviewSrc, setSendPreviewSrc] = useState<string | null>(null);
  const [sendCert, setSendCert] = useState<Certificate | null>(null);

  /** Prepare and open the email send modal for a given certificate. */
  const openSendEmailModal = useCallback(
    async (certificate: Certificate) => {
      try {
        if (!certificate.certificate_image_url) {
          toast.error(t("hero.imageNotAvailableShort"));
          return;
        }

        // Normalise URL
        let srcRaw = certificate.certificate_image_url;
        if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith("/") && !srcRaw.startsWith("data:")) {
          srcRaw = `/${srcRaw}`;
        }
        const src =
          srcRaw.startsWith("/") && typeof window !== "undefined"
            ? `${window.location.origin}${srcRaw}`
            : srcRaw;

        setSendCert(certificate);
        setSendPreviewSrc(src);

        const subject = certificate.certificate_no
          ? t("hero.emailDefaultSubject").replace("{number}", certificate.certificate_no)
          : t("hero.emailDefaultSubjectNoNumber");

        const message = [
          `Certificate Information:`,
          ``,
          `• Certificate Number: ${certificate.certificate_no ?? "N/A"}`,
          `• Recipient Name: ${certificate.name ?? "N/A"}`,
          `• Issue Date: ${new Date(certificate.issue_date || certificate.created_at || new Date()).toLocaleDateString()}`,
          certificate.expired_date ? `• Expiry Date: ${new Date(certificate.expired_date).toLocaleDateString()}` : null,
          certificate.category ? `• Category: ${certificate.category}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        setSendForm({ email: "", subject, message });
        setSendFormErrors({});
        setSendModalOpen(true);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : t("hero.emailPrepareFailed"));
      }
    },
    [t],
  );

  /** Validate + submit the email form. */
  const confirmSendEmail = useCallback(async () => {
    if (!sendCert || !sendPreviewSrc || isSendingEmail) return;

    setSendFormErrors({});

    const errors: SendFormErrors = {};
    const recipientEmail = (sendForm.email || "").trim();

    if (!recipientEmail) {
      errors.email = t("hero.emailValidationRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      errors.email = t("hero.emailValidationInvalid");
    }
    if (!sendForm.subject.trim()) errors.subject = t("hero.subjectRequired");
    if (!sendForm.message.trim()) errors.message = t("hero.messageRequired");

    if (Object.keys(errors).length > 0) {
      setSendFormErrors(errors);
      return;
    }

    setIsSendingEmail(true);
    try {
      const payload = {
        recipientEmail,
        recipientName: sendCert.name,
        imageUrl: sendPreviewSrc,
        certificateNo: sendCert.certificate_no,
        subject: sendForm.subject.trim(),
        message: sendForm.message.trim(),
      };

      const res = await fetch("/api/send-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 400) throw new Error(t("hero.emailInvalidFields"));
        if (res.status === 404) throw new Error(t("hero.emailServiceUnavailable"));
        if (res.status === 500) throw new Error(t("hero.emailServerError"));
        throw new Error(json?.error || t("hero.emailSendFailed"));
      }

      if (json.previewUrl) {
        toast.success(t("hero.emailQueued"));
        try { window.open(json.previewUrl, "_blank"); } catch {}
      } else {
        toast.success(`${t("hero.emailSentSuccess")} ${recipientEmail}`);
      }

      // Reset modal state
      setSendModalOpen(false);
      setSendCert(null);
      setSendPreviewSrc(null);
      setSendForm({ email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Email send error:", err);
      toast.error(err instanceof Error ? err.message : t("hero.emailSendFailed"));
    } finally {
      setIsSendingEmail(false);
    }
  }, [sendCert, sendPreviewSrc, sendForm, isSendingEmail, t]);

  /** Close modal and reset form without sending. */
  const closeSendModal = useCallback(() => {
    setSendModalOpen(false);
    setSendCert(null);
    setSendPreviewSrc(null);
    setSendForm({ email: "", subject: "", message: "" });
    setSendFormErrors({});
  }, []);

  return {
    // State
    sendModalOpen,
    isSendingEmail,
    sendFormErrors,
    sendForm,
    setSendForm,
    sendPreviewSrc,
    sendCert,
    // Actions
    openSendEmailModal,
    confirmSendEmail,
    closeSendModal,
  };
}
