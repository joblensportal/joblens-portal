import dns from "dns";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** Bundled logo for CID embedding — works in Gmail without relying on Vercel/APP_URL */
const EMAIL_LOGO_CID_PATH = path.join(__dirname, "../assets/joblens-logo-email.png");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "JobLens Careers";
const APP_SUPPORT_EMAIL = process.env.APP_SUPPORT_EMAIL || EMAIL_USER || "";
const APP_URL = process.env.APP_URL || "";
const EMAIL_LOGO_URL = (process.env.EMAIL_LOGO_URL || "").trim();
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || "").trim();

const logoFileExists = () => {
  try {
    return fs.existsSync(EMAIL_LOGO_CID_PATH);
  } catch {
    return false;
  }
};

const getRemoteLogoUrl = () => {
  if (EMAIL_LOGO_URL) return EMAIL_LOGO_URL;
  const apiBase = API_PUBLIC_URL.replace(/\/$/, "");
  if (apiBase && logoFileExists()) return `${apiBase}/email-assets/joblens-logo.png`;
  const base = APP_URL.replace(/\/$/, "");
  if (base) return `${base}/joblens-logo.svg`;
  return "";
};

/**
 * CID attachment only when the HTML uses cid: — not when a public URL is used (avoids a separate attachment in most clients).
 * contentDisposition inline + explicit type reduces "attachment" appearance for inline images.
 */
const getEmailLogoAttachments = () => {
  if (getRemoteLogoUrl()) return [];
  if (!logoFileExists()) return [];
  return [
    {
      filename: "joblens-logo.png",
      path: EMAIL_LOGO_CID_PATH,
      cid: "joblenslogo",
      contentType: "image/png",
      contentDisposition: "inline",
    },
  ];
};

/**
 * Dark band: logo + tagline, then caller adds purple/status band.
 * Uses a public image URL when possible (no separate attachment); otherwise CID from server/assets/joblens-logo-email.png.
 */
const buildBrandHeaderRows = () => {
  const remote = getRemoteLogoUrl();

  if (remote) {
    return `
          <tr>
            <td style="background: #030712; padding: 28px 24px 22px; text-align: center;">
              <img src="${remote}" alt="JobLens" width="200" style="max-width: 220px; height: auto; display: block; margin: 0 auto; border: 0;" />
              <p style="margin: 14px 0 0; font-size: 12px; color: #cbd5e1; letter-spacing: 0.04em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">AI-Powered Talent Platform</p>
            </td>
          </tr>`;
  }

  if (logoFileExists()) {
    return `
          <tr>
            <td style="background: #030712; padding: 28px 24px 22px; text-align: center;">
              <img src="cid:joblenslogo" alt="JobLens" width="200" style="max-width: 220px; height: auto; display: block; margin: 0 auto; border: 0;" />
              <p style="margin: 14px 0 0; font-size: 12px; color: #cbd5e1; letter-spacing: 0.04em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">AI-Powered Talent Platform</p>
            </td>
          </tr>`;
  }

  return `
          <tr>
            <td style="background: #030712; padding: 28px 24px 22px; text-align: center;">
              <p style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                <span style="color: #00D1FF;">Job</span><span style="color: #A855F7;">Lens</span>
              </p>
              <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 0.04em;">AI-Powered Talent Platform</p>
            </td>
          </tr>`;
};

const buildRecruiterContactBlock = (companyName, recruiterEmail) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0 8px; border: 1px solid #e2e8f0; border-radius: 10px;">
    <tr>
      <td style="padding: 16px 18px; background: #f1f5f9;">
        <p style="margin: 0 0 10px; font-size: 12px; color: #475569; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Recruiter Contact Details</p>
        <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.5; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;"><strong>Company:</strong> ${companyName}</p>
        <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.5; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;"><strong>Recruiter Email:</strong> <a href="mailto:${recruiterEmail}" style="color: #2563eb; text-decoration: none;">${recruiterEmail}</a></p>
        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Note: This update is sent securely via JobLens. Reply directly to the recruiter email above for role-specific queries.</p>
      </td>
    </tr>
  </table>
`;

const outerWrapper = (innerTable) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>JobLens</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);">
          ${innerTable}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const acceptanceTemplate = (applicantName, companyName, jobTitle, recruiterEmail) => {
  const inner = `
          ${buildBrandHeaderRows()}
          <tr>
            <td style="background: #6d28d9; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Application Accepted</h1>
              <p style="margin: 12px 0 0; color: #ede9fe; font-size: 13px; line-height: 1.45; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">This is an official update from JobLens Talent Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1e293b;">Dear ${applicantName},</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #475569;">Thank you for your interest in <strong style="color: #1e293b;">${companyName}</strong>.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">We are pleased to share that your application for the role of <strong style="color: #1e293b;">${jobTitle}</strong> has been <strong style="color: #059669;">accepted</strong> by the hiring team.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">The recruiter may contact you soon regarding interview coordination, timeline, and any required documentation. Please monitor your inbox and spam/promotions folder.</p>
              ${buildRecruiterContactBlock(companyName, recruiterEmail)}
              <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.7; color: #475569;">Warm regards,<br><strong style="color: #1e293b;">Talent Operations Team</strong><br>JobLens</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #64748b;">Sent from JobLens on behalf of ${companyName}. For platform support, contact <a href="mailto:${APP_SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">${APP_SUPPORT_EMAIL}</a>${APP_URL ? ` or visit <a href="${APP_URL}" style="color: #2563eb; text-decoration: none;">${APP_URL}</a>` : ""}.</p>
            </td>
          </tr>`;
  return outerWrapper(inner);
};

const rejectionTemplate = (applicantName, companyName, jobTitle, recruiterEmail) => {
  const inner = `
          ${buildBrandHeaderRows()}
          <tr>
            <td style="background: linear-gradient(180deg, #475569 0%, #334155 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Application Status Update</h1>
              <p style="margin: 12px 0 0; color: #cbd5e1; font-size: 13px; line-height: 1.45; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">This is an official update from JobLens Talent Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1e293b;">Dear ${applicantName},</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #475569;">Thank you for applying to <strong style="color: #1e293b;">${companyName}</strong> for the role of <strong style="color: #1e293b;">${jobTitle}</strong>.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">After careful evaluation, the hiring team has decided to proceed with other applicants for this role at this stage.</p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569;">We genuinely appreciate your time and encourage you to continue exploring relevant opportunities on JobLens.</p>
              ${buildRecruiterContactBlock(companyName, recruiterEmail)}
              <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.7; color: #475569;">Best wishes for your career journey,<br><strong style="color: #1e293b;">Talent Operations Team</strong><br>JobLens</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #64748b;">Sent from JobLens on behalf of ${companyName}. For platform support, contact <a href="mailto:${APP_SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">${APP_SUPPORT_EMAIL}</a>${APP_URL ? ` or visit <a href="${APP_URL}" style="color: #2563eb; text-decoration: none;">${APP_URL}</a>` : ""}.</p>
            </td>
          </tr>`;
  return outerWrapper(inner);
};

const SMTP_HOSTNAME = (process.env.EMAIL_SMTP_HOST || "smtp.gmail.com").trim();

const SMTP_TIMEOUT_MS = 45_000;

/**
 * Resolve SMTP to IPv4 and connect by IP with TLS SNI.
 * Avoids ENETUNREACH when the host has no working IPv6 route but DNS returns AAAA first
 * (common on cloud VMs / Render).
 */
const resolveSmtpConnectHost = async () => {
  try {
    const { address } = await dns.promises.lookup(SMTP_HOSTNAME, { family: 4 });
    return address;
  } catch (e) {
    console.warn(
      "[Email] IPv4 lookup failed for",
      SMTP_HOSTNAME,
      "— using hostname (may retry IPv6):",
      e.message
    );
    return SMTP_HOSTNAME;
  }
};

const createTransporterForPort = (connectHost, port) => {
  const secure = port === 465;
  const options = {
    host: connectHost,
    port,
    secure,
    auth: {
      user: EMAIL_USER.trim(),
      pass: String(EMAIL_APP_PASSWORD).replace(/\s/g, ""),
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    tls: {
      servername: SMTP_HOSTNAME,
      minVersion: "TLSv1.2",
    },
  };
  if (!secure) {
    options.requireTLS = true;
  }
  return nodemailer.createTransport(options);
};

const isSmtpTimeoutError = (err) =>
  err &&
  (err.code === "ETIMEDOUT" ||
    err.code === "ESOCKETTIMEDOUT" ||
    /connection timeout|timeout/i.test(String(err.message || "")));

/** Ports: 587 (STARTTLS) is allowed on more hosts than 465 (implicit TLS). */
const smtpPortsToTry = () => {
  const raw = (process.env.EMAIL_SMTP_PORT || "").trim();
  if (raw) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? [n] : [587, 465];
  }
  return [587, 465];
};

const fromAddress = () => `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`;

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
  if (!EMAIL_USER?.trim() || !EMAIL_APP_PASSWORD) {
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

  const attachments = getEmailLogoAttachments();
  const replyTo = (recruiterEmail || APP_SUPPORT_EMAIL || EMAIL_USER || "").trim() || EMAIL_USER;
  const mailPayload = {
    from: fromAddress(),
    replyTo,
    to: toEmail,
    subject,
    html,
    attachments,
  };

  const connectHost = await resolveSmtpConnectHost();
  const ports = smtpPortsToTry();
  let lastErr = null;

  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    const transporter = createTransporterForPort(connectHost, port);
    try {
      await transporter.sendMail(mailPayload);
      const logoMode = getRemoteLogoUrl() ? "remote" : attachments.length ? "CID" : "text";
      console.log(
        "[Email] Sent to",
        toEmail,
        "|",
        status,
        "| from",
        EMAIL_USER,
        "| smtp port",
        port,
        "| logo:",
        logoMode
      );
      return { success: true };
    } catch (err) {
      lastErr = err;
      console.error("[Email] Failed:", err.message, "| port", port);
      const tryNext = i < ports.length - 1 && isSmtpTimeoutError(err);
      if (tryNext) {
        console.warn(`[Email] Retrying SMTP on port ${ports[i + 1]}…`);
        continue;
      }
      break;
    }
  }

  const err = lastErr;
  let hint = err?.message || "Unknown error";
  if (err?.code === "EAUTH") {
    hint =
      "Gmail rejected login for system email. Use an App Password (not the normal password) and ensure 2-Step Verification is enabled.";
    console.error("[Email]", hint);
  } else if (err?.code === "ENETUNREACH" || /ENETUNREACH/i.test(String(err?.message))) {
    hint =
      "Network could not reach the mail server (often IPv6). This build uses IPv4 DNS for SMTP; redeploy or set EMAIL_SMTP_PORT=587 if it persists.";
  } else if (isSmtpTimeoutError(err)) {
    hint =
      "SMTP connection timed out. Your host may block outbound mail ports; try EMAIL_SMTP_PORT=587 or 465.";
  }
  return { success: false, message: hint };
};
