# Production Smoke Test Checklist

Use this checklist after deploying `client` and `server` on Vercel.

## 1) Environment and Health

- Open backend URL and verify it returns `API Working`.
- Verify backend env vars are present:
  - `MONGODB_URI`, `JWT_SECRET`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `CLOUDINARY_*`, `CORS_ORIGINS`.
- Verify frontend env vars are present:
  - `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BACKEND_URL`.

## 2) Authentication

- Sign in as a candidate user from frontend.
- Open `/applications` and verify profile data is loaded.
- Open recruiter login modal and verify:
  - company login works with valid credentials,
  - invalid credentials show a proper error.

## 3) Job Flows

- From recruiter dashboard, create a new job.
- Verify it appears on the home listing.
- Open a job details page and apply once.
- Verify second apply click is blocked as "Already Applied".
- On `/applications`, verify applied job appears with status `Pending`.

## 4) Resume Upload

- On `/applications`, click edit and upload a PDF resume.
- Verify success toast and persisted resume link.
- Verify resume opens in a new tab.

## 5) AI Features

- Open `/ai-chat`, submit a prompt, verify a response is returned.
- Open `/ai-resume-analyzer`, submit resume text, verify analysis is returned.
- Send invalid payloads (empty inputs) and verify user-friendly error handling.

## 6) Recruiter Applicant Flow

- Open `/dashboard/view-applications`.
- Verify applicant list renders with resume link.
- Change status to `Accepted` or `Rejected`.
- Verify status update is reflected.

## 7) Security and Observability

- Verify no secrets appear in server logs.
- Verify unauthorized calls to protected endpoints return `401`.
- Verify AI route abuse protection returns `429` after repeated rapid requests.
