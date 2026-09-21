import { getAdminPanelBaseUrl } from "./admin-welcome-email";
import { sendMail, type SendMailResult } from "./email";

export async function sendAdminVerificationEmail(input: {
  email: string;
  fullName: string;
  token: string;
  invitedByAdmin?: boolean;
}): Promise<SendMailResult> {
  const verifyUrl = `${getAdminPanelBaseUrl()}/verify-email?token=${encodeURIComponent(input.token)}`;
  const intro = input.invitedByAdmin
    ? "An administrator created an account for you on the Fayyaz Travels admin panel."
    : "Thanks for signing up for the Fayyaz Travels admin panel.";

  return sendMail({
    to: [input.email],
    subject: "Verify your Fayyaz Travels admin account",
    text: [
      `Hi ${input.fullName},`,
      "",
      intro,
      "",
      "Please verify your email to activate your account.",
      "",
      `Open this link to verify: ${verifyUrl}`,
      "",
      "This link expires in 24 hours. Until you verify, your account will not appear in User Management and you cannot sign in.",
      input.invitedByAdmin
        ? "After verifying, sign in with the password your administrator gave you."
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<p>Hi ${input.fullName},</p>
<p>${intro}</p>
<p>Please verify your email to activate your account.</p>
<p>Until you verify, your account will not appear in User Management and you cannot sign in.</p>
${
  input.invitedByAdmin
    ? "<p>After verifying, sign in with the password your administrator gave you.</p>"
    : ""
}
<p>This link expires in 24 hours.</p>`,
    isBtn: true,
    btnUrl: verifyUrl,
  });
}
