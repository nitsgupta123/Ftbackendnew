import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Transporter } from "nodemailer";

export interface SendMailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  /** Plain-text body (also used as fallback / Ethereal). */
  text: string;
  /** Optional HTML body fragment inserted into the branded template. */
  html?: string;
  replyTo?: string;
  /** When true, render a CTA button in the branded template. */
  isBtn?: boolean;
  btnUrl?: string;
}

export interface SendMailResult {
  messageId: string;
  /** Present when using Ethereal test SMTP (local/dev only). */
  previewUrl?: string;
  mode: "graph" | "smtp" | "ethereal";
}

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedGraphToken: CachedToken | null = null;
let etherealTransporter: Transporter | null = null;
let etherealFrom: string | null = null;

function graphConfig() {
  const clientId = process.env.GRAPH_CLIENT_ID?.trim();
  const clientSecret = process.env.GRAPH_CLIENT_SECRET?.trim();
  const tenantId = process.env.GRAPH_TENANT_ID?.trim();
  const fromEmail =
    process.env.GRAPH_FROM_EMAIL?.trim() || "notifications@fayyaztravels.com";
  const fromName = process.env.GRAPH_FROM_NAME?.trim() || "Fayyaz Travels";

  if (!clientId || !clientSecret || !tenantId) return null;
  return { clientId, clientSecret, tenantId, fromEmail, fromName };
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

function allowEtherealFallback(): boolean {
  if (process.env.SMTP_USE_ETHEREAL === "false") return false;
  if (process.env.SMTP_USE_ETHEREAL === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export function isEmailConfigured(): boolean {
  return Boolean(graphConfig()) || Boolean(smtpConfig()) || allowEtherealFallback();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r\n|\r|\n/g, "<br>");
}

/** Branded Fayyaz Travels HTML email layout (ported from PHP Graph sender). */
export function buildEmailHtml(options: {
  emailBody: string;
  isBtn?: boolean;
  btnUrl?: string;
}): string {
  const { emailBody, isBtn = false, btnUrl = "" } = options;
  const year = new Date().getFullYear();
  const plainPreview = encodeURIComponent(
    emailBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );

  const buttonHtml =
    isBtn && btnUrl
      ? `
            <div style="text-align:center; margin: 25px 0;">
                <a href="${escapeHtml(btnUrl)}" class="button" style="display: inline-block; padding: 12px 24px; margin: 10px 5px; border-radius: 50px; text-decoration: none; background: linear-gradient(135deg, #14385C, #1a4a7c); color: white; font-weight: 500; border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">Click Here</a>
                <p>If you are unable to click the button above, please copy and paste the following link into your browser: <a href="${escapeHtml(btnUrl)}" style="color:#14385C; margin-top: 8px; display: inline-block;">${escapeHtml(btnUrl)}</a></p>
            </div>
            <div class="divider"></div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Poppins', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #333; line-height: 1.6; }
        .container { max-width: 650px; margin: 30px auto; background: #fff; padding: 0; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); overflow: hidden; border: 2px solid #14385C; }
        .header { background: linear-gradient(135deg, #14385C, #1a4a7c); color: #fff; padding: 25px 20px; text-align: center; }
        .header img { max-width: 200px; height: auto; }
        .content { padding: 35px 30px; text-align: left; font-size: 16px; line-height: 1.7; color: #444; border-bottom: 1px solid #eaeaea; }
        .content p { margin-bottom: 20px; }
        .footer { text-align: center; font-size: 13px; color: #777; padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; border-radius: 50px; text-decoration: none; background: linear-gradient(135deg, #14385C, #1a4a7c); color: white; font-weight: 500; border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .social-links { margin: 25px 0 15px; text-align: center; }
        .social-links a { display: inline-block; margin: 0 8px; }
        .social-links img { width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .company-info { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; line-height: 1.6; }
        .company-info p { margin: 8px 0; }
        .highlight { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #14385C; margin: 25px 0; border-radius: 0 8px 8px 0; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 25px 0; }
        @media (max-width: 600px) {
            .container { width: 95%; margin: 15px auto; }
            .content { padding: 25px 20px; }
            .button { display: block; margin: 15px auto; width: 80%; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://fayyaztravels.com/visa/assets/images/main-logo-white.png" alt="Fayyaz Travels Logo">
        </div>
        <div class="content">
            ${emailBody}
            ${buttonHtml}
            <div class="highlight">
                <p>Need assistance with your travel plans? Our team of experts is ready to help you create unforgettable experiences.</p>
                <a href="https://fayyaztravels.com/contact-us" class="button" style="color: white;">Contact Us</a>
            </div>
            <div class="company-info">
                <p><strong>Fayyaz Travels</strong><br>
                435 Orchard Rd, #11-00 Wisma Atria, Singapore 238877</p>
                <p>Phone: <a href="tel:+6562352900" style="color: #14385C; text-decoration: none;">+65 6235 2900</a><br>
                Email: <a href="mailto:info@fayyaztravels.com" style="color: #14385C; text-decoration: none;">info@fayyaztravels.com</a><br>
                Website: <a href="https://fayyaztravels.com" style="color: #14385C; text-decoration: none;">www.fayyaztravels.com</a></p>
                <div class="social-links">
                    <a href="https://facebook.com/fayyaztravels"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"></a>
                    <a href="https://instagram.com/fayyaztravels"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"></a>
                    <a href="https://twitter.com/fayyaztravels"><img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"></a>
                    <a href="https://linkedin.com/company/fayyaz-travels-pte-ltd"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn"></a>
                </div>
            </div>
        </div>
        <div class="footer">
            &copy; ${year} Fayyaz Travels. All rights reserved.<br>
            <small>This email was sent to you because you are a valued customer of Fayyaz Travels.<br>
            If you received this email by mistake, please delete it and notify us immediately.<br>
            <a href="mailto:unsubscribe@fayyaztravels.com?subject=Unsubscribe&body=Please%20unsubscribe%20me%20from%20your%20mailing%20list">Unsubscribe</a> |
            <a href="https://fayyaztravels.com/email-plain-text?content=${plainPreview}" style="color: #14385C; text-decoration: none;">View as plain text</a></small>
        </div>
    </div>
</body>
</html>`;
}

async function getGraphAccessToken(): Promise<string> {
  const config = graphConfig();
  if (!config) {
    throw new Error(
      "Microsoft Graph is not configured. Set GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_TENANT_ID."
    );
  }

  if (cachedGraphToken && cachedGraphToken.expiresAt > Date.now()) {
    return cachedGraphToken.accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    cachedGraphToken = null;
    const errText = await response.text();
    throw new Error(`Failed to get Graph access token: ${response.status} ${errText}`);
  }

  const token = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Cache with 5-minute safety buffer (same as PHP)
  cachedGraphToken = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in - 300) * 1000,
  };

  return token.access_token;
}

function toGraphRecipients(emails: string[] = []) {
  return emails
    .map((email) => email.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

async function sendViaGraph(input: SendMailInput): Promise<SendMailResult> {
  const config = graphConfig();
  if (!config) {
    throw new Error("Microsoft Graph is not configured.");
  }

  const accessToken = await getGraphAccessToken();
  const emailBody = input.html?.trim() || textToHtml(input.text);
  const finalHtml = buildEmailHtml({
    emailBody,
    isBtn: input.isBtn,
    btnUrl: input.btnUrl,
  });

  const message = {
    message: {
      subject: input.subject,
      body: {
        contentType: "HTML",
        content: finalHtml,
      },
      toRecipients: toGraphRecipients(input.to),
      ccRecipients: toGraphRecipients(input.cc),
      bccRecipients: toGraphRecipients(input.bcc),
      from: {
        emailAddress: {
          address: config.fromEmail,
          name: config.fromName,
        },
      },
      ...(input.replyTo
        ? {
            replyTo: [{ emailAddress: { address: input.replyTo } }],
          }
        : {}),
    },
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    // Force token refresh on next attempt for auth failures
    if (response.status === 401 || response.status === 403) {
      cachedGraphToken = null;
    }
    const errText = await response.text();
    throw new Error(`Graph sendMail failed: ${response.status} ${errText}`);
  }

  return {
    messageId: `graph-${Date.now()}`,
    mode: "graph",
  };
}

async function getEtherealTransporter(): Promise<{
  transporter: Transporter;
  from: string;
}> {
  if (etherealTransporter && etherealFrom) {
    return { transporter: etherealTransporter, from: etherealFrom };
  }

  const account = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
  etherealFrom =
    process.env.SMTP_FROM?.trim() ||
    `"Fayyaz Travels" <${account.user}>`;

  return { transporter: etherealTransporter, from: etherealFrom };
}

async function sendViaSmtpOrEthereal(
  input: SendMailInput
): Promise<SendMailResult> {
  const emailBody = input.html?.trim() || textToHtml(input.text);
  const html = buildEmailHtml({
    emailBody,
    isBtn: input.isBtn,
    btnUrl: input.btnUrl,
  });

  const config = smtpConfig();

  if (config) {
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
      html,
      replyTo: input.replyTo,
    });

    return { messageId: info.messageId, mode: "smtp" };
  }

  if (!allowEtherealFallback()) {
    throw new Error(
      "Email is not configured. Set GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET / GRAPH_TENANT_ID, or SMTP_HOST."
    );
  }

  const { transporter, from } = await getEtherealTransporter();
  const info = await transporter.sendMail({
    from,
    to: input.to.join(", "),
    cc: input.cc?.length ? input.cc.join(", ") : undefined,
    bcc: input.bcc?.length ? input.bcc.join(", ") : undefined,
    subject: input.subject,
    text: input.text,
    html,
    replyTo: input.replyTo,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  if (previewUrl) {
    console.info(
      `[email] Ethereal preview (not delivered to real inbox): ${previewUrl}`
    );
  }

  return {
    messageId: info.messageId,
    previewUrl,
    mode: "ethereal",
  };
}

/**
 * Send email via Microsoft Graph when configured; otherwise SMTP / Ethereal.
 * Must run on the server only — never call from browser React code.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (graphConfig()) {
    return sendViaGraph(input);
  }
  return sendViaSmtpOrEthereal(input);
}
