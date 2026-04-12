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
/** HTTPS email APIs (work when the host blocks outbound SMTP — e.g. many PaaS plans). */
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const RESEND_FROM =
  (process.env.RESEND_FROM || "").trim() || "JobLens Careers <onboarding@resend.dev>";
const SENDGRID_API_KEY = (process.env.SENDGRID_API_KEY || "").trim();
const SENDGRID_FROM_EMAIL = (process.env.SENDGRID_FROM_EMAIL || "").trim();
const SENDGRID_FROM_NAME = (process.env.SENDGRID_FROM_NAME || "").trim() || EMAIL_FROM_NAME;
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

const API_FETCH_TIMEOUT_MS = 35_000;

const fetchWithTimeout = (url, init = {}) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API_FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

/** Inline logo for API transports (same cid:joblenslogo as templates when no public logo URL). */
const logoAttachmentsForApi = () => {
  if (getRemoteLogoUrl()) return [];
  if (!logoFileExists()) return [];
  try {
    const content = fs.readFileSync(EMAIL_LOGO_CID_PATH).toString("base64");
    return [
      {
        filename: "joblens-logo.png",
        content,
        content_id: "joblenslogo",
        content_type: "image/png",
      },
    ];
  } catch {
    return [];
  }
};

const sendViaResend = async ({ toEmail, replyTo, subject, html }) => {
  if (!RESEND_API_KEY) return { success: false, message: "Resend not configured" };
  const attachments = logoAttachmentsForApi();
  const body = {
    from: RESEND_FROM,
    to: [toEmail],
    subject,
    html,
  };
  if (replyTo) body.reply_to = [replyTo];
  if (attachments.length) body.attachments = attachments;

  try {
    const res = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.message ||
        (Array.isArray(data.errors) && data.errors.map((e) => e.message).join("; ")) ||
        res.statusText;
      return { success: false, message: msg || "Resend API error" };
    }
    return { success: true };
  } catch (e) {
    const msg = e.name === "AbortError" ? "Resend request timed out" : e.message;
    return { success: false, message: msg };
  }
};

const sendViaSendGrid = async ({ toEmail, replyTo, subject, html }) => {
  if (!SENDGRID_API_KEY) return { success: false, message: "SendGrid not configured" };
  const fromEmail = SENDGRID_FROM_EMAIL || EMAIL_USER?.trim();
  if (!fromEmail) {
    return {
      success: false,
      message: "Set SENDGRID_FROM_EMAIL (verified sender) or EMAIL_USER for SendGrid.",
    };
  }

  const attachments = logoAttachmentsForApi().map((a) => ({
    content: a.content,
    type: a.content_type || "image/png",
    filename: a.filename,
    disposition: "inline",
    content_id: a.content_id,
  }));

  const body = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: fromEmail, name: SENDGRID_FROM_NAME },
    subject,
    content: [{ type: "text/html", value: html }],
  };
  if (replyTo) body.reply_to = { email: replyTo };
  if (attachments.length) body.attachments = attachments;

  try {
    const res = await fetchWithTimeout("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status >= 200 && res.status < 300) {
      return { success: true };
    }
    const text = await res.text();
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text);
      if (j.errors?.length) msg = j.errors.map((e) => e.message).join("; ");
    } catch {
      /* use text */
    }
    return { success: false, message: msg };
  } catch (e) {
    const msg = e.name === "AbortError" ? "SendGrid request timed out" : e.message;
    return { success: false, message: msg };
  }
};

const sendViaSmtp = async ({ mailPayload }) => {
  if (!EMAIL_USER?.trim() || !EMAIL_APP_PASSWORD) {
    return { success: false, message: "SMTP credentials not set" };
  }
  const connectHost = await resolveSmtpConnectHost();
  const ports = smtpPortsToTry();
  let lastErr = null;

  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    const transporter = createTransporterForPort(connectHost, port);
    try {
      await transporter.sendMail(mailPayload);
      const logoMode = getRemoteLogoUrl() ? "remote" : mailPayload.attachments?.length ? "CID" : "text";
      console.log(
        "[Email] Sent via SMTP to",
        mailPayload.to,
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
      "SMTP connection timed out. Many hosts block outbound mail; set RESEND_API_KEY or SENDGRID_API_KEY to send via HTTPS instead.";
  }
  return { success: false, message: hint };
};

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

  const hasResend = Boolean(RESEND_API_KEY);
  const hasSendGrid = Boolean(SENDGRID_API_KEY);
  const hasSmtp = Boolean(EMAIL_USER?.trim() && EMAIL_APP_PASSWORD);

  if (!hasResend && !hasSendGrid && !hasSmtp) {
    const msg =
      "Email not configured. Set RESEND_API_KEY (recommended on Render), or SENDGRID_API_KEY, or EMAIL_USER + EMAIL_APP_PASSWORD for Gmail SMTP.";
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

  const replyTo = (recruiterEmail || APP_SUPPORT_EMAIL || EMAIL_USER || "").trim() || undefined;

  let lastFailure = null;

  if (hasResend) {
    const r = await sendViaResend({ toEmail, replyTo, subject, html });
    if (r.success) {
      console.log("[Email] Sent via Resend to", toEmail, "|", status);
      return { success: true };
    }
    console.warn("[Email] Resend failed:", r.message);
    lastFailure = r;
  }

  if (hasSendGrid) {
    const r = await sendViaSendGrid({ toEmail, replyTo, subject, html });
    if (r.success) {
      console.log("[Email] Sent via SendGrid to", toEmail, "|", status);
      return { success: true };
    }
    console.warn("[Email] SendGrid failed:", r.message);
    lastFailure = r;
  }

  if (hasSmtp) {
    const mailPayload = {
      from: fromAddress(),
      replyTo: replyTo || EMAIL_USER,
      to: toEmail,
      subject,
      html,
      attachments: getEmailLogoAttachments(),
    };
    const r = await sendViaSmtp({ mailPayload });
    if (r.success) {
      console.log("[Email] Sent to", toEmail, "|", status, "| from", EMAIL_USER);
      return { success: true };
    }
    lastFailure = r;
  }

  return lastFailure || { success: false, message: "Email delivery failed" };
};
