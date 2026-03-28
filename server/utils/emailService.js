import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "JobLens Careers";
const APP_SUPPORT_EMAIL = process.env.APP_SUPPORT_EMAIL || EMAIL_USER || "";
const APP_URL = process.env.APP_URL || "";
/** Full URL to logo image for HTML emails (optional). Falls back to APP_URL + /joblens-logo.png */
const EMAIL_LOGO_URL = (process.env.EMAIL_LOGO_URL || "").trim();

const getEmailLogoUrl = () => {
  if (EMAIL_LOGO_URL) return EMAIL_LOGO_URL;
  const base = APP_URL.replace(/\/$/, "");
  if (base) return `${base}/joblens-logo.png`;
  return "";
};

/** Dark header row with JobLens logo (or text fallback if no public URL). */
const buildLogoHeaderRow = () => {
  const url = getEmailLogoUrl();
  if (url) {
    return `
          <tr>
            <td style="background: #0a0a12; padding: 28px 24px 22px; text-align: center;">
              <img src="${url}" alt="JobLens" width="200" style="max-width: 240px; height: auto; display: block; margin: 0 auto; border: 0;" />
            </td>
          </tr>`;
  }
  return `
          <tr>
            <td style="background: #0a0a12; padding: 28px 24px 22px; text-align: center;">
              <p style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">
                <span style="color: #00A3FF;">Job</span><span style="color: #A855F7;">Lens</span>
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 0.02em;">AI-Powered Talent Platform</p>
            </td>
          </tr>`;
};

const getSystemTransporter = () => {
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER.trim(),
      pass: String(EMAIL_APP_PASSWORD).replace(/\s/g, ""),
    },
  });
};

const fromAddress = () => `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`;

const buildRecruiterContactBlock = (companyName, recruiterEmail) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0 8px; border: 1px solid #e2e8f0; border-radius: 10px;">
    <tr>
      <td style="padding: 16px 18px; background: #f8fafc;">
        <p style="margin: 0 0 10px; font-size: 13px; color: #475569; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;">Recruiter Contact Details</p>
        <p style="margin: 0 0 6px; font-size: 14px; color: #334155;"><strong>Company:</strong> ${companyName}</p>
        <p style="margin: 0 0 6px; font-size: 14px; color: #334155;"><strong>Recruiter Email:</strong> <a href="mailto:${recruiterEmail}" style="color: #2563eb; text-decoration: none;">${recruiterEmail}</a></p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">Note: This update is sent securely via JobLens. Reply directly to the recruiter email above for role-specific queries.</p>
      </td>
    </tr>
  </table>
`;

const acceptanceTemplate = (applicantName, companyName, jobTitle, recruiterEmail) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          ${buildLogoHeaderRow()}
          <tr>
            <td style="background: linear-gradient(135deg, #6b21a8 0%, #581c87 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Application Accepted</h1>
              <p style="margin: 10px 0 0; color: #e9d5ff; font-size: 13px;">This is an official update from JobLens Talent Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #334155;">Dear ${applicantName},</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #475569;">Thank you for your interest in <strong>${companyName}</strong>.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">We are pleased to share that your application for the role of <strong>${jobTitle}</strong> has been <strong style="color: #059669;">accepted</strong> by the hiring team.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">The recruiter may contact you soon regarding interview coordination, timeline, and any required documentation. Please monitor your inbox and spam/promotions folder.</p>
              ${buildRecruiterContactBlock(companyName, recruiterEmail)}
              <p style="margin: 16px 0 0; font-size: 15px; line-height: 1.7; color: #475569;">Warm regards,<br><strong>Talent Operations Team</strong><br>JobLens</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Sent from JobLens on behalf of ${companyName}. For platform support, contact <a href="mailto:${APP_SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">${APP_SUPPORT_EMAIL}</a>${APP_URL ? ` or visit <a href="${APP_URL}" style="color: #2563eb; text-decoration: none;">${APP_URL}</a>` : ""}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const rejectionTemplate = (applicantName, companyName, jobTitle, recruiterEmail) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          ${buildLogoHeaderRow()}
          <tr>
            <td style="background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Application Status Update</h1>
              <p style="margin: 10px 0 0; color: #cbd5e1; font-size: 13px;">This is an official update from JobLens Talent Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #334155;">Dear ${applicantName},</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #475569;">Thank you for applying to <strong>${companyName}</strong> for the role of <strong>${jobTitle}</strong>.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">After careful evaluation, the hiring team has decided to proceed with other applicants for this role at this stage.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">We genuinely appreciate your time and encourage you to continue exploring relevant opportunities on JobLens.</p>
              ${buildRecruiterContactBlock(companyName, recruiterEmail)}
              <p style="margin: 16px 0 0; font-size: 15px; line-height: 1.7; color: #475569;">Best wishes for your career journey,<br><strong>Talent Operations Team</strong><br>JobLens</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Sent from JobLens on behalf of ${companyName}. For platform support, contact <a href="mailto:${APP_SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">${APP_SUPPORT_EMAIL}</a>${APP_URL ? ` or visit <a href="${APP_URL}" style="color: #2563eb; text-decoration: none;">${APP_URL}</a>` : ""}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const sendApplicationStatusEmail = async ({
  toEmail,
  applicantName,
  companyName,
  jobTitle,
  status,
  recruiterEmail,
}) => {
  if (!toEmail || !applicantName || !companyName || !jobTitle) {
    return { success: false, message: "Missing applicant or job data" };
  }
  const transporter = getSystemTransporter();
  if (!transporter) {
    const msg = "Email service is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in server .env.";
    console.warn("[Email]", msg);
    return { success: false, message: msg };
  }
  const subject =
    status === "Accepted"
      ? `Congratulations! Your application for ${jobTitle} has been accepted`
      : `Application Update: ${jobTitle} at ${companyName}`;
  const html =
    status === "Accepted"
      ? acceptanceTemplate(applicantName, companyName, jobTitle, recruiterEmail || "Not provided")
      : rejectionTemplate(applicantName, companyName, jobTitle, recruiterEmail || "Not provided");
  try {
    await transporter.sendMail({
      from: fromAddress(),
      replyTo: recruiterEmail || APP_SUPPORT_EMAIL || EMAIL_USER,
      to: toEmail,
      subject,
      html,
    });
    console.log("[Email] Sent to", toEmail, "|", status, "| from", EMAIL_USER);
    return { success: true };
  } catch (err) {
    console.error("[Email] Failed:", err.message);
    let hint = err.message;
    if (err.code === "EAUTH") {
      hint =
        "Gmail rejected login for system email. Use an App Password (not the normal password) and ensure 2-Step Verification is enabled.";
      console.error("[Email]", hint);
    }
    return { success: false, message: hint };
  }
};
