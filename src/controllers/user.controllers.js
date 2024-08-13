import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // console.log("Access token Log", accessToken);   // Access Token Generating Now.

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("Access Token Error ", error);

    throw new ApiError(
      500,
      "Something went Wrong while Generating Access and Refresh Token"
    );
  }
};

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

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;
  // console.table([email, username, password]); // Printing Data from Req.Body to confirm

  // Validate Data and should not be empty
  if (!(email || username) || !password) {
    throw new ApiError(
      400,
      "Please Provide Email/Username and Password to Continue"
    );
  }
  // find the user
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(400, "User do not Exist in Database");
  }
  // password check
  const passwordCheck = await user.isPasswordCorrect(password);
  if (!passwordCheck) {
    throw new ApiError(400, "Please Provide Valid Password");
  }

  // access and refresh token generate
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    // secure: true,
  };
  // set cookie
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
  // give access
});

const logoutUser = asyncHandler(async (req, res) => {
  // remove cookie
  const UpdatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: "" } },
    { new: true }
  );
  
  // Getting User after Updating the Refresh Tokens
  // console.log("Updated User", UpdatedUser);

  const options = {
    httpOnly: true,
    // secure: true,
  };

  return res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //Get Refresh Token from Cookies or from the Req Body
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh Token is not Available");
  }

  try {
    //Verify and decode the Refresh Token
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // if (!decodedRefreshToken) {
    //   throw new ApiError(401, "Invalid Refresh Token");
    // }

    const user = await User.findById(decodedRefreshToken._id);

    if (!user) {
      throw new ApiError(400, "Invalid Refresh Token, Could not get User");
    }

    // Match the Refresh Tokens
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(400, "Invalid Refresh Token or Expired Token");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    // To check that are we getting values in Refresh And Access Token or not. 
    // console.log("New Refresh Token", newRefreshToken);
    // console.log("New Access Token", accessToken);

    const options = {
      httpOnly: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token and Refresh Token Updated"
        )
      );
  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid Refresh Token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
