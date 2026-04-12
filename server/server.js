import "dotenv/config";

import "./config/cloudinary.js";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import './config/instrument.js'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import connectDB from './config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const emailBrandLogoPath = path.join(__dirname, 'assets/joblens-logo-email.png')
import * as Sentry from "@sentry/node";
import { clerkWebhooks } from './controllers/webhooks.js'
import companyRoutes from './routes/companyRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import aiRoutes from "./routes/aiRoutes.js";



// Initialize Express
const app = express()

// Connect to database
connectDB()

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
  })
)
app.use(clerkMiddleware())

// Routes
app.get('/', (req, res) => res.send("API Working"))
/** Public logo for HTML emails (no attachment); same file as CID fallback in emailService */
app.get('/email-assets/joblens-logo.png', (req, res) => {
  if (!fs.existsSync(emailBrandLogoPath)) {
    return res.status(404).send('Not found')
  }
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=2592000')
  fs.createReadStream(emailBrandLogoPath).pipe(res)
})
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});
app.post('/webhooks', express.raw({ type: 'application/json' }), clerkWebhooks)
app.use(express.json({ limit: "1mb" }))
app.use('/api/company', companyRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/users', userRoutes)
app.use("/api/ai", aiRoutes);

// Port
const PORT = process.env.PORT || 5000

Sentry.setupExpressErrorHandler(app);

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  })
}

export default app