/**
 * Test script to verify application status emails (accept/reject).
 * Run: TEST_EMAIL=recipient@x.com node scripts/test-email.js
 *
 * Configure one of: RESEND_API_KEY, SENDGRID_API_KEY, or EMAIL_USER + EMAIL_APP_PASSWORD
 */
import "dotenv/config";
import { sendApplicationStatusEmail } from "../utils/emailService.js";

const TO_EMAIL = process.env.TEST_EMAIL || "your-test-email@gmail.com";
async function run() {
  console.log("Testing applicant notification email…\n");
  console.log("Recipient:", TO_EMAIL);
  console.log(
    "Providers: RESEND_API_KEY, SENDGRID_API_KEY, or EMAIL_USER + EMAIL_APP_PASSWORD\n"
  );

  const configured =
    process.env.RESEND_API_KEY?.trim() ||
    process.env.SENDGRID_API_KEY?.trim() ||
    (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
  if (!configured) {
    console.log("Skipping: set RESEND_API_KEY (recommended) or other provider in server .env");
    process.exit(0);
  }

  const runOnce = async (label, status) => {
    const result = await sendApplicationStatusEmail({
      toEmail: TO_EMAIL,
      applicantName: "Test Applicant",
      companyName: "Acme Corp",
      jobTitle: "Full Stack Developer",
      status,
      recruiterEmail: "recruiter@acme.com",
    });
    if (result.success) console.log(`   ${label} -> OK\n`);
    else console.error(`   ${label} ->`, result.message, "\n");
  };

  console.log("1. ACCEPTED…");
  await runOnce("Accepted", "Accepted");
  console.log("2. REJECTED…");
  await runOnce("Rejected", "Rejected");

  console.log("Done. Check inbox (and spam) at", TO_EMAIL);
  process.exit(0);
}

run();
