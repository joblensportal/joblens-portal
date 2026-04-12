/**
 * Test script to verify application status emails (accept/reject).
 * Run: TEST_EMAIL=recipient@x.com node scripts/test-email.js
 *
 * Uses system email credentials from server .env:
 * EMAIL_USER, EMAIL_APP_PASSWORD
 */
import "dotenv/config";
import { sendApplicationStatusEmail } from "../utils/emailService.js";

const TO_EMAIL = process.env.TEST_EMAIL || "your-test-email@gmail.com";
async function run() {
  console.log("Testing email (system sender)...\n");
  console.log("Recipient:", TO_EMAIL);
  console.log("(Set TEST_EMAIL; configure EMAIL_USER and EMAIL_APP_PASSWORD in .env)\n");

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.log("Skipping: set EMAIL_USER and EMAIL_APP_PASSWORD in server .env");
    process.exit(0);
  }

  // Test ACCEPTED email
  console.log("1. Sending ACCEPTED test email...");
  try {
    const r = await sendApplicationStatusEmail({
      toEmail: TO_EMAIL,
      applicantName: "Test Applicant",
      companyName: "Acme Corp",
      jobTitle: "Full Stack Developer",
      status: "Accepted",
      recruiterEmail: "recruiter@acme.com",
    });
    if (r.success) console.log("   -> Sent\n");
    else console.error("   ->", r.message, "\n");
  } catch (err) {
    console.error("   -> Error:", err.message);
  }

  // Test REJECTED email
  console.log("2. Sending REJECTED test email...");
  try {
    const r = await sendApplicationStatusEmail({
      toEmail: TO_EMAIL,
      applicantName: "Test Applicant",
      companyName: "Acme Corp",
      jobTitle: "Full Stack Developer",
      status: "Rejected",
      recruiterEmail: "recruiter@acme.com",
    });
    if (r.success) console.log("   -> Sent\n");
    else console.error("   ->", r.message, "\n");
  } catch (err) {
    console.error("   -> Error:", err.message);
  }

  console.log("Done. Check inbox (and spam) at", TO_EMAIL);
  process.exit(0);
}

run();
