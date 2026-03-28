import express from 'express'
import { applyForJob, getUserData, getUserJobApplications, streamMyResume, updateUserResume } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { requireAuth } from '@clerk/express'


const router = express.Router()

// Get user Data
router.get('/user', requireAuth(), getUserData)

// View own resume PDF (proxied — same as company dashboard)
router.get('/my-resume', requireAuth(), streamMyResume)

// Apply for a job
router.post('/apply', requireAuth(), applyForJob)

// Get applied jobs data
router.get('/applications', requireAuth(), getUserJobApplications)

// Update user profile (resume)
router.post('/update-resume', requireAuth(), upload.single('resume'), updateUserResume)

export default router;