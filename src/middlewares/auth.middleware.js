import ApiError  from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Extract the token from cookies or Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();

        // If token is missing, reject the request
        if (!token) {
            throw new ApiError(401, "Unauthorized request, token missing");
        }

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Fetch user details from database, excluding password and refresh token
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // If user not found, reject the request
        if (!user) {
            throw new ApiError(401, "Invalid access token, user not found");
        }

        // Attach user to the request for further use in routes
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(403, "Access token expired, please log in again");
        } else {
            throw new ApiError(401, "Invalid access token");
        }
    }
});
