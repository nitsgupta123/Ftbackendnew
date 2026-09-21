import { getAdminPanelBaseUrl } from "./admin-welcome-email";
import { sendMail, type SendMailResult } from "./email";

export async function sendAdminPasswordResetEmail(input: {
  email: string;
  fullName: string;
  token: string;
}): Promise<SendMailResult> {
  const resetUrl = `${getAdminPanelBaseUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;

  return sendMail({
    to: [input.email],
    subject: "Reset your Fayyaz Travels admin password",
    text: [
      `Hi ${input.fullName},`,
      "",
      "We received a request to reset your admin panel password.",
      "",
      `Open this link to choose a new password: ${resetUrl}`,
      "",
      "This link expires in 1 hour. If you did not request a reset, you can ignore this email.",
    ].join("\n"),
    html: `<p>Hi ${input.fullName},</p>
<p>We received a request to reset your admin panel password.</p>
<p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>`,
    isBtn: true,
    btnUrl: resetUrl,
  });
}
