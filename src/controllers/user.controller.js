import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, "User not found");

        const accessToken = user.generateAcessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

// Register User
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    if (![fullName, email, username, password].every(Boolean)) {
        throw new ApiError(400, "All fields are required");
    }

    if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
        throw new ApiError(400, "Avatar file is required");
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarFile = req.files.avatar[0].path;
    const coverImageFile = req.files.coverimage?.[0]?.path;

    const avatarUpload = await uploadOnCloudinary(avatarFile);
    const coverImageUpload = coverImageFile ? await uploadOnCloudinary(coverImageFile) : null;

    fs.unlinkSync(avatarFile);
    if (coverImageFile) fs.unlinkSync(coverImageFile);

    const user = await User.create({
        fullName,
        avatar: avatarUpload.url,
        coverimage: coverImageUpload?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Error while registering user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    console.log(email);
    
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = { httpOnly: true, secure: true };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request, user not found");
    }

    await User.findByIdAndUpdate(req.user._id, { refreshToken: undefined }, { new: true });

    const options = { httpOnly: true, secure: true };

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

//access token and refresh token 
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
    if (!incomingRefreshToken) { 
      throw new ApiError(401, "Unauthorized request");
    }
  
    try {
      // Verify refresh token
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
  
      // Fetch user from DB
      const user = await User.findById(decodedToken?._id);
      if (!user) {
        throw new ApiError(401, "Invalid refresh token");
      }
  
      // Validate refresh token
      if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used");
      }
  
      // Generate new tokens
      const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id);
  
      // Set HTTP-only cookies
      const options = {
        httpOnly: true,
        secure: true
      };
  
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(new ApiResponse(
          200,
          { accessToken, freshToken: newrefreshToken },
          "Access token refreshed"
        ));
  
    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token");
    }
  });

export { registerUser, loginUser, logoutUser , refreshAccessToken};