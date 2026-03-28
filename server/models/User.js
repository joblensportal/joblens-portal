import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    clerkId: {
        type: String,
        required: true,
        unique: true
    },

    name: String,

    email: String,

    image: {
        type: String,
        default: ""
    },

    resume: {
        type: String,
        default: ""
    }

}, { timestamps: true });

export default mongoose.model("User", userSchema);