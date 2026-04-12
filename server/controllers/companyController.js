import mongoose from "mongoose";
import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import cloudinary from "../config/cloudinary.js";
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { sendApplicationStatusEmail } from "../utils/emailService.js";
import { fetchResumeFromUrl } from "../utils/fetchResumeFromUrl.js";

// Register a new company
export const registerCompany = async (req, res) => {

    const { name, email, password } = req.body

    const imageFile = req.file;

    if (!name || !email || !password || !imageFile) {
        return res.status(400).json({ success: false, message: "Missing Details" })
    }

    try {

        const companyExists = await Company.findOne({ email })

        if (companyExists) {
            return res.status(409).json({ success: false, message: 'Company already registered' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        const company = await Company.create({
            name,
            email,
            password: hashPassword,
            image: imageUpload.secure_url,
        })

        return res.json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image
            },
            token: generateToken(company._id)
        })

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// Login Company
export const loginCompany = async (req, res) => {

    const { email, password } = req.body

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" })
        }

        const company = await Company.findOne({ email })
        if (!company) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

        if (await bcrypt.compare(password, company.password)) {

            return res.json({
                success: true,
                company: {
                    _id: company._id,
                    name: company.name,
                    email: company.email,
                    image: company.image
                },
                token: generateToken(company._id)
            })

        }
        else {
            return res.status(401).json({ success: false, message: 'Invalid email or password' })
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }

}

// Get Company Data
export const getCompanyData = async (req, res) => {

    try {

        const company = req.company
        const obj = company.toObject ? company.toObject() : { ...company }
        const emailConfigured = Boolean(
            (process.env.RESEND_API_KEY || "").trim() ||
                (process.env.SENDGRID_API_KEY || "").trim() ||
                (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD)
        )
        res.json({ success: true, company: { ...obj, emailConfigured } })

    } catch (error) {
        res.json({
            success: false, message: error.message
        })
    }

}

// Post New Job
export const postJob = async (req, res) => {

    const { title, description, location, salary, level, category } = req.body

    const companyId = req.company._id

    try {

        const newJob = new Job({
            title,
            description,
            location,
            salary,
            companyId,
            date: Date.now(),
            level,
            category
        })

        await newJob.save()

        res.json({ success: true, newJob })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }


}

// Get Company Job Applicants
export const getCompanyJobApplicants = async (req, res) => {
    try {

        const companyId = req.company._id

        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name image resume email clerkId')
            .populate('jobId', 'title location category level salary')
            .exec()

        const syncedUsers = new Set()
        for (const app of applications) {
            const u = app.userId
            if (!u?.clerkId || syncedUsers.has(u._id.toString())) continue
            const needsImage = !u.image?.trim?.()
            const needsEmail = !u.email?.trim?.()
            if (!needsImage && !needsEmail) continue
            syncedUsers.add(u._id.toString())
            try {
                const clerkUser = await clerkClient.users.getUser(u.clerkId)
                const email = clerkUser.emailAddresses[0]?.emailAddress || ""
                const name =
                    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
                    clerkUser.username ||
                    u.name
                const image = clerkUser.imageUrl || ""
                const $set = {}
                if (email && email !== u.email) $set.email = email
                if (name && name !== u.name) $set.name = name
                if (image && image !== u.image) $set.image = image
                if (Object.keys($set).length > 0) {
                    await User.updateOne({ _id: u._id }, { $set })
                    Object.assign(u, $set)
                }
            } catch (e) {
                console.warn("[Applicants] Clerk profile sync failed:", e.message)
            }
        }

        return res.json({ success: true, applications })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Company Posted Jobs
export const getCompanyPostedJobs = async (req, res) => {
    try {

        const companyId = req.company._id

        const jobs = await Job.find({ companyId })

        // Adding No. of applicants info in data
        const jobsData = await Promise.all(jobs.map(async (job) => {
            const applicants = await JobApplication.find({ jobId: job._id });
            return { ...job.toObject(), applicants: applicants.length }
        }))

        res.json({ success: true, jobsData })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Change Job Application Status
export const ChangeJobApplicationsStatus = async (req, res) => {

    try {

        const { id, status } = req.body

        // Fetch application with full details for email
        const application = await JobApplication.findById(id)
            .populate('userId', 'name email')
            .populate('jobId', 'title')
            .populate('companyId', 'name email')

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' })
        }

        const appCompanyId = application.companyId?._id ?? application.companyId
        if (appCompanyId?.toString() !== req.company._id.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden' })
        }

        // Update status
        await JobApplication.findOneAndUpdate({ _id: id }, { status })

        const user = application.userId
        const job = application.jobId
        const company = application.companyId

        if (status !== 'Accepted' && status !== 'Rejected') {
            return res.json({ success: true, message: 'Status updated' })
        }

        const canSendEmail = Boolean(user?.email && job && company)
        let emailNotification

        if (!user?.email) {
            console.warn('[Email] Applicant has no email in database, skipping notification')
            emailNotification = {
                success: false,
                message: 'Applicant has no email on file; email not sent.',
            }
        } else if (!job || !company) {
            emailNotification = {
                success: false,
                message: 'Missing job or company data; email not sent.',
            }
        }

        const isVercel = process.env.VERCEL === '1'

        // Vercel serverless: finish email before responding (process may stop after res.json).
        // Render / long-running Node: respond immediately so the UI is not blocked by SMTP (can hang 30s+).
        if (isVercel && canSendEmail) {
            emailNotification = await sendApplicationStatusEmail({
                toEmail: user.email,
                applicantName: user.name || 'Applicant',
                companyName: company.name,
                jobTitle: job.title,
                status,
                recruiterEmail: company.email,
            })
            if (!emailNotification.success) {
                console.warn('[Email] Applicant notification failed:', emailNotification.message)
            }
            return res.json({
                success: true,
                message: 'Status updated',
                emailNotification,
            })
        }

        if (canSendEmail) {
            emailNotification = { queued: true, message: 'Email is being sent in the background.' }
        }

        res.json({
            success: true,
            message: 'Status updated',
            emailNotification,
        })

        if (canSendEmail) {
            setImmediate(() => {
                void sendApplicationStatusEmail({
                    toEmail: user.email,
                    applicantName: user.name || 'Applicant',
                    companyName: company.name,
                    jobTitle: job.title,
                    status,
                    recruiterEmail: company.email,
                })
                    .then((emailResult) => {
                        if (!emailResult.success) {
                            console.warn('[Email] Applicant notification failed:', emailResult.message)
                        }
                    })
                    .catch((err) => console.error('[Email] Applicant notification error:', err))
            })
        }

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message })
        }
    }
}

// Change Job Visiblity
export const changeVisiblity = async (req, res) => {
    try {

        const { id } = req.body

        const companyId = req.company._id

        const job = await Job.findById(id)

        if (companyId.toString() === job.companyId.toString()) {
            job.visible = !job.visible
        }

        await job.save()

        res.json({ success: true, job })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

/**
 * Stream applicant resume PDF through the API so recruiters' browsers don't hit
 * Cloudinary directly (fixes Chrome "Failed to load PDF document" / CORS / disposition issues).
 */
export const streamApplicantResume = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application id" });
    }

    const application = await JobApplication.findById(applicationId).populate("userId", "resume");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (application.companyId.toString() !== req.company._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const resumeUrl = application.userId?.resume?.trim?.();
    if (!resumeUrl || typeof resumeUrl !== "string") {
      return res.status(404).json({ success: false, message: "No resume on file" });
    }

    const result = await fetchResumeFromUrl(resumeUrl);
    if (!result.ok || !result.buffer) {
      console.error("[Resume proxy] Fetch failed", {
        status: result.status,
        error: result.error,
        resumeUrl: resumeUrl.slice(0, 80),
      });
      const msg = result.error
        ? result.error
        : result.status
          ? `Resume storage returned HTTP ${result.status}`
          : "Could not load resume file";
      return res.status(502).json({ success: false, message: msg });
    }

    const upstreamType = result.contentType || "";
    const mime = upstreamType.includes("pdf")
      ? "application/pdf"
      : upstreamType || "application/octet-stream";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", 'inline; filename="resume.pdf"');
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(result.buffer);
  } catch (error) {
    console.error("[Resume proxy]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCompany = async (req, res) => {
  try {

    const { name, email } = req.body;
    const file = req.file;

    let imageUrl = "";

    if (file) {
      const upload = await cloudinary.uploader.upload(file.path);
      imageUrl = upload.secure_url;
    }

    const company = await Company.create({
      name,
      email,
      image: imageUrl
    });

    return res.json({ success: true, company });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};