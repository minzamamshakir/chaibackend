import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const verifyJWT = async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // check that is Token available there
    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    // Verify Token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded) {
      throw new ApiError(
        401,
        "Unauthorized Request Unable to Verify Access Token"
      );
    }

    // Get User Id from decoded Token

    const verifiedUser = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!verifiedUser) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Set Verified User to the Req for Next Process
    req.user = verifiedUser;

    next();
  } catch (error) {
    throw new ApiError(500, error?.message || "Unable to VerifyUser");
  }
};
