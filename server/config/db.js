import mongoose from "mongoose";

const connectDB = async () => {
  try {

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "jobportal",   // force database
      retryWrites: true,
      w: "majority",         // override wrong cached value
    });

    console.log("Database Connected");

  } catch (error) {
    console.log(error);
    throw error;
  }
};

export default connectDB;