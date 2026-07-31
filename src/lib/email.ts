import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export interface SendMailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  replyTo?: string;
}

export interface SendMailResult {
  messageId: string;
}

function smtpConfig(): SMTPTransport.Options | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  };
}

export function isEmailConfigured(): boolean {
  return Boolean(smtpConfig());
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = smtpConfig();
  if (!config) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST (and usually SMTP_USER / SMTP_PASS) in the environment."
    );
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@fayyaztravels.com";

  const transporter = nodemailer.createTransport(config);
  const info = await transporter.sendMail({
    from,
    to: input.to.join(", "),
    cc: input.cc?.length ? input.cc.join(", ") : undefined,
    bcc: input.bcc?.length ? input.bcc.join(", ") : undefined,
    subject: input.subject,
    text: input.text,
    replyTo: input.replyTo,
  });

  return { messageId: info.messageId };
}
