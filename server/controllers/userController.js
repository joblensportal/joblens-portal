import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { fetchResumeFromUrl } from "../utils/fetchResumeFromUrl.js";


// =============================
// Helper: Get or Create User
// =============================
const getOrCreateUser = async (clerkUserId) => {

    // try finding existing user
    let user = await User.findOne({ clerkId: clerkUserId });

    // if not found → create automatically
    if (!user) {

        const clerkUser = await clerkClient.users.getUser(clerkUserId);

        user = await User.create({
            clerkId: clerkUserId,
            name: clerkUser.firstName || "User",
            email: clerkUser.emailAddresses[0].emailAddress,
            resume: ""
        });
    }

    return user;
};



// =============================
// Get User Data
// =============================
export const getUserData = async (req, res) => {

    const { userId } = req.auth();
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {

        const user = await getOrCreateUser(userId);

        return res.json({ success: true, user });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};



// =============================
// Apply For Job
// =============================
export const applyForJob = async (req, res) => {

    const { jobId } = req.body;
    const { userId } = req.auth();
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        if (!jobId) {
            return res.status(400).json({ success: false, message: "jobId is required" });
        }

        const user = await getOrCreateUser(userId);

        const isAlreadyApplied = await JobApplication.find({
            jobId,
            userId: user._id
        });

        if (isAlreadyApplied.length > 0) {
            return res.status(409).json({ success: false, message: "Already Applied" });
        }

        const jobData = await Job.findById(jobId);

        if (!jobData) {
            return res.status(404).json({ success: false, message: "Job Not Found" });
        }

        await JobApplication.create({
            companyId: jobData.companyId,
            userId: user._id,
            jobId,
            date: Date.now()
        });

        return res.json({ success: true, message: "Applied Successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};



// =============================
// Get User Applications
// =============================
export const getUserJobApplications = async (req, res) => {

    try {

        const { userId } = req.auth();
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const user = await getOrCreateUser(userId);

        const applications = await JobApplication.find({
            userId: user._id
        })
            .populate("companyId", "name email image")
            .populate("jobId", "title description location category level salary")
            .exec();

        return res.json({ success: true, applications });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};



// =============================
// Update User Resume
// =============================
export const updateUserResume = async (req, res) => {

    try {

        const { userId } = req.auth();
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const resumeFile = req.file;

        const user = await getOrCreateUser(userId);

        if (!resumeFile) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const uploadResult = await cloudinary.uploader.upload(resumeFile.path, {
            resource_type: "raw",
            use_filename: true,
        });

        user.resume = uploadResult.secure_url;

        await user.save();

        return res.json({
            success: true,
            message: "Resume Updated",
            resume: user.resume
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// =============================
// Stream own resume PDF (Clerk user) — same Cloudinary delivery fix as recruiter proxy
// =============================
export const streamMyResume = async (req, res) => {
    try {
        const { userId } = req.auth();
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await getOrCreateUser(userId);
        const resumeUrl = user.resume?.trim?.();
        if (!resumeUrl || typeof resumeUrl !== "string") {
            return res.status(404).json({ success: false, message: "No resume on file" });
        }

        const result = await fetchResumeFromUrl(resumeUrl);
        if (!result.ok || !result.buffer) {
            console.error("[streamMyResume] Fetch failed", result.status, result.error);
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
        console.error("[streamMyResume]", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};