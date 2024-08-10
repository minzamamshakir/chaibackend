import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("Local File path not Found");
      return null;
    }
    const cloudinaryResponse = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File Path on Cloudinary : ", cloudinary.url);

    return cloudinaryResponse.url;
  } catch (error) {
    console.log("Error Uploading File to Cloudinary : ", error);
    fs.unlinkSync(localFilePath); // will Remove the locally saved temp file as operation got failed.
    return null;
  }
};

export { uploadOnCloudinary };
