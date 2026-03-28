import "dotenv/config";

import "./config/cloudinary.js";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import './config/instrument.js'
import express from 'express'
import cors from 'cors'
import connectDB from './config/db.js'
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