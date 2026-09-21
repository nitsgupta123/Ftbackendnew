import { formatRoleLabel } from "./user-types";

export interface AdminWelcomeEmailInput {
  fullName: string;
  email: string;
  password: string;
  role: string;
  invitedByName?: string | null;
  companyName?: string | null;
}

export function getAdminPanelBaseUrl(): string {
  return (
    process.env.ADMIN_PANEL_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://fayyaz.travel/panel"
  ).replace(/\/+$/, "");
}

export function getAdminPanelLoginUrl(): string {
  return `${getAdminPanelBaseUrl()}/login`;
}

export function buildAdminWelcomeEmail(input: AdminWelcomeEmailInput): {
  subject: string;
  text: string;
  html: string;
  loginUrl: string;
} {
  const company = input.companyName?.trim() || "Fayyaz Travels";
  const roleLabel = formatRoleLabel(input.role);
  const loginUrl = getAdminPanelLoginUrl();
  const invitedBy = input.invitedByName?.trim();

  const subject = `Your ${company} admin account`;

  const textLines = [
    `Hi ${input.fullName.trim() || "there"},`,
    "",
    invitedBy
      ? `${invitedBy} has created an admin account for you on ${company}.`
      : `An admin account has been created for you on ${company}.`,
    "",
    `Role: ${roleLabel}`,
    `Email: ${input.email.trim().toLowerCase()}`,
    `Temporary password: ${input.password}`,
    "",
    `Sign in here: ${loginUrl}`,
    "",
    "Please sign in and change your password after your first login.",
    "",
    `— ${company} Admin`,
  ];

  const html = `
    <p>Hi ${escapeHtml(input.fullName.trim() || "there")},</p>
    <p>${
      invitedBy
        ? `${escapeHtml(invitedBy)} has created an admin account for you on <strong>${escapeHtml(company)}</strong>.`
        : `An admin account has been created for you on <strong>${escapeHtml(company)}</strong>.`
    }</p>
    <p>
      <strong>Role:</strong> ${escapeHtml(roleLabel)}<br>
      <strong>Email:</strong> ${escapeHtml(input.email.trim().toLowerCase())}<br>
      <strong>Temporary password:</strong> ${escapeHtml(input.password)}
    </p>
    <p>Please sign in and change your password after your first login.</p>
  `;

  return {
    subject,
    text: textLines.join("\n"),
    html,
    loginUrl,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
