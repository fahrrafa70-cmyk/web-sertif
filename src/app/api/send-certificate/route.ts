import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime (nodemailer isn't supported on Edge runtime)
export const runtime = "nodejs";

// Helper to fetch image as Buffer
async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mime: string; filename: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const blob = await res.blob();
  const arrayBuf = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const isPng = contentType.includes("png") || url.toLowerCase().endsWith(".png");
  const isJpg = contentType.includes("jpeg") || contentType.includes("jpg") || /\.(jpg|jpeg)$/i.test(url);
  const mime = isPng ? "image/png" : isJpg ? "image/jpeg" : contentType;
  const filename = `certificate.${isPng ? "png" : isJpg ? "jpg" : "bin"}`;
  return { buffer, mime, filename };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      recipientEmail,
      recipientName,
      imageUrl,
      certificateNo,
      fromEmail,
      subject,
      message,
      
    }: {
      recipientEmail?: string;
      recipientName?: string;
      imageUrl?: string;
      certificateNo?: string;
      fromEmail?: string;
      subject?: string;
      message?: string;
    } = body || {};

    if (!recipientEmail) {
      return NextResponse.json({ error: "recipientEmail is required" }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Build absolute URL for local public paths
    let src = imageUrl as string;
    if (src && !/^https?:\/\//i.test(src) && !src.startsWith("data:")) {
      // ensure leading slash
      if (!src.startsWith("/")) src = `/${src}`;
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_ORIGIN || "http://localhost:3000";
      src = `${origin}${src}`;
    }

    const { buffer, mime, filename } = await fetchImageBuffer(src);

    // Dynamically import nodemailer on the server
    const { default: nodemailer } = await import("nodemailer");

    // Configure transporter based on env
    let transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: /^true$/i.test(process.env.SMTP_SECURE || "false"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else if (/^true$/i.test(process.env.ETHEREAL || "")) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      return NextResponse.json({
        error: "Email transport is not configured. Set SMTP_* env vars or ETHEREAL=true for dev.",
      }, { status: 500 });
    }

    const from = fromEmail || process.env.EMAIL_FROM || "no-reply@example.com";

    const computedSubject = subject && subject.trim().length > 0
      ? subject
      : `Your Certificate${certificateNo ? ` #${certificateNo}` : ""}`;

    const bodyIntro = recipientName ? `Hello ${recipientName},` : `Hello,`;
    const bodyMessage = message && message.trim().length > 0
      ? message
      : `Attached is your certificate${certificateNo ? ` (No: ${certificateNo})` : ""}.`;

    const info = await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: computedSubject,
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
          <p>${bodyIntro}</p>
          <p>${bodyMessage}</p>
          <p>Thank you.</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: mime,
        },
      ],
    });

    // If using Ethereal, provide preview URL for dev
    const previewUrl = nodemailer.getTestMessageUrl?.(info) || undefined;

    return NextResponse.json({ ok: true, messageId: info.messageId, previewUrl });
  } catch (err: unknown) {
    console.error("/api/send-certificate error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send" }, { status: 500 });
  }
}
