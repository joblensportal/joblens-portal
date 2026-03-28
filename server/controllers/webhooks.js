import { Webhook } from "svix";
import User from "../models/User.js";

// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
    try {

        // Create a Svix instance with clerk webhook secret.
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        const payload = req.body?.toString?.("utf8") || JSON.stringify(req.body)

        // Verifying Headers
        await whook.verify(payload, {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        // Getting Data from request body
        const parsedBody = typeof req.body === "object" && !Buffer.isBuffer(req.body)
            ? req.body
            : JSON.parse(payload)
        const { data, type } = parsedBody

        // Switch Cases for differernt Events
        switch (type) {
            case 'user.created': {

                const userData = {
                    clerkId: data.id,
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
                    image: data.image_url,
                    resume: ''
                }
                await User.create(userData)
                return res.json({})
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
                    image: data.image_url,
                }
                await User.findOneAndUpdate({ clerkId: data.id }, userData)
                return res.json({})
            }

            case 'user.deleted': {
                await User.findOneAndDelete({ clerkId: data.id })
                return res.json({})
            }
            default:
                return res.status(200).json({ success: true, message: "Unhandled webhook event" })
        }

    } catch (error) {
        return res.status(400).json({ success: false, message: error.message })
    }
}