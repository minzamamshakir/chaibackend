import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get Data from user
  const { username, email, password, fullName } = req.body;
  // console.log("Email : ", email);   // print email just to check data confirmation

  // validate data and check its !empty
  if (!fullName || !email || !password || !fullName) {
    throw new ApiError(400, "Something Went Wrong");
  }
  // check if username or email exist in database
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError(409, "User Already Exist in Database");
  }
  //  check for image, avatar and Cover image special check avatar
  const avatarPath = req.files?.avatar?.[0]?.path || null;
  // let coverImagePath = req.files?.coverImage[0]?.path || null;
  // console.log("CoverImagePath with Null", coverImagePath);
  const coverImagePath = req.files?.coverImage?.[0]?.path || null;

  if (!avatarPath) {
    throw new ApiError(400, "Please Provide Avatar to Register.");
  }
  //  upload images to cloudinary
  const avatarCloudinaryPath = await uploadOnCloudinary(avatarPath);
  const coverImageCloudinaryPath = await uploadOnCloudinary(coverImagePath);

  // console.log("This is AvatarCloudinaryPath", avatarCloudinaryPath.url);   //  Passed Cloudinary Path

  if (!avatarCloudinaryPath) {
    throw new ApiError(400, "Please provide Avatar");
  }
  //  create user object, create entry in db
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatarCloudinaryPath?.secure_url || "",
    coverImage: coverImageCloudinaryPath?.secure_url || "",
  });

  //  check for user creation
  //  remove password and refresh token field in response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went Wrong while Registering the User");
  }
  //  return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

export { registerUser };
