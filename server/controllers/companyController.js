import mongoose from "mongoose";
import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import cloudinary from "../config/cloudinary.js";
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import { sendApplicationStatusEmail } from "../utils/emailService.js";

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
        const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD)
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

        // Find job applications for the user and populate related data
        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name image resume email')
            .populate('jobId', 'title location category level salary')
            .exec()

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

        // Update status
        await JobApplication.findOneAndUpdate({ _id: id }, { status })

        // Send email notification (non-blocking, graceful on failure)
        const user = application.userId
        const job = application.jobId
        const company = application.companyId
        let emailResult = null
        if (!user?.email && (status === 'Accepted' || status === 'Rejected')) {
            console.warn('[Email] Applicant has no email in database, skipping notification')
            emailResult = { success: false, message: 'Applicant has no email on file (Clerk user).' }
        } else if (user?.email && job && company && (status === 'Accepted' || status === 'Rejected')) {
            emailResult = await sendApplicationStatusEmail({
                toEmail: user.email,
                applicantName: user.name || 'Applicant',
                companyName: company.name,
                jobTitle: job.title,
                status,
                recruiterEmail: company.email,
            })
        }

        res.json({
            success: true,
            message: 'Status Changed',
            emailSent: emailResult?.success ?? null,
            emailError: emailResult && !emailResult.success ? emailResult.message : undefined,
        })

    } catch (error) {

        res.json({ success: false, message: error.message })

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

    const resumeUrl = application.userId?.resume;
    if (!resumeUrl || typeof resumeUrl !== "string") {
      return res.status(404).json({ success: false, message: "No resume on file" });
    }

    const upstream = await fetch(resumeUrl);
    if (!upstream.ok) {
      console.error("[Resume proxy] Upstream failed", upstream.status, resumeUrl);
      return res.status(502).json({ success: false, message: "Could not load resume file" });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const upstreamType = upstream.headers.get("content-type") || "";
    const mime = upstreamType.includes("pdf") ? "application/pdf" : upstreamType || "application/octet-stream";

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", 'inline; filename="resume.pdf"');
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
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