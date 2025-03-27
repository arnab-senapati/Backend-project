import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, "User not found");

        const accessToken = user.generateAccessToken();
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
      const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

  
      // Set HTTP-only cookies
      const options = {
        httpOnly: true,
        secure: true
      };
  
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(
          200,
          { accessToken, freshToken: newRefreshToken },
          "Access token refreshed"
        ));
  
    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token");
    }
  });


  //authenticated user to update their password securely
  const changeCurrentPassword = asyncHandler(async (req , res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))

  })

  //get current user
  const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json({
        status: 200,
        data: req.user,
        message: "Current user fetched successfully"
    });
});

  //update account details
  const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    // 1️⃣ Check if both fields are provided
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }
    // 2️⃣ Find the user by ID and update their details
    const user = await User.findByIdAndUpdate(
        req.user?._id,  // Find user by their ID from the request
        { $set: { fullname: fullName, email: email } }, // Update full name and email
        { new: true } // Return the updated user object
    ).select("-password -refreshToken"); // Exclude password and refresh token from the response
    // 3️⃣ Send response back to the client
    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});


  //update user avatar
  const updateuserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(500, "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{
      $set: {avatar: avatar.url}
    }, {new:true}).select("-password")

    return res.status(200).json(new ApiResponse(200, {}, "Avatar updated successfully"))

  })

    //update user coverImage
    const updateuserCoverImage = asyncHandler(async (req, res) => {
      const coverImageLocalPath = req.file?.path
      if(!coverImageLocalPath){
          throw new ApiError(400, "Cover image file is missing")
      }
      const coverimage = await uploadOnCloudinary(coverImageLocalPath)
      if(!coverimage.url){
          throw new ApiError(500, "Error while uploading on avatar")
      }
      const user = await User.findByIdAndUpdate(req.user?._id,{
        $set: {coverImage: coverimage.url}
      }, {new:true}).select("-password")

      return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"))
  
    })

    //get user channel profile
    const getUserChannelProfile = asyncHandler(async (req, res) => {
      const {username} = req.params 
      if (!username?.trim()){
          throw new ApiError(400, "Username is missing") }
       const channel = await User.aggregate([
        {
          $match:{username: username?.toLowerCase()}},
        {
          $lookup:{
            from:"subscriptions", 
            localField:"_id", 
            foreignField:"channel", 
            as:"subscribers"}
        },
        {
          $lookup:{
            from:"subscriptions", 
            localField:"_id", 
            foreignField:"subscribers", 
            as:"subscribedTo"
          }
        },
        {
          $addFields:{
            subscriberCount: {$size:"$subscribers"},
            subscribedToCount: {$size:"$subscribedTo"},
            isSubscribed: {
              $cond: {
                if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                then: true,
                else: false
              }
            }            
          }
        },
        {
          $project:{
            fullName:1,
            username:1,
            subscriberCount:1,
            subscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1,
            createdAt:1,
            updatedAt:1
          }
        }
       ])

       if(!channel?.length){
            throw new ApiError(404, "Channel does not exsits")
       }

       return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
    })

    //get watch history
     const getWatchHistory = asyncHandler(async (req, res) => {
      const user = await User.aggregate([
        {
          $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
          }
        },
        {
          $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
              {
                $lookup:{
                  from:"users",
                  localField:"owner",
                  foreignField:"_id",
                  as:"owner",
                  pipeline:[
                    {
                      $project:{
                        fullName:1,
                        username:1,
                        avatar:1
                      }
                    },
                    {
                      $addFields:{
                        owner:{$first:"$owner"}
                      } 
                    }
                  ]
                }
              }
            ]
          }
        }
      ])

      return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully"))
     })

     export { 
      registerUser, loginUser, logoutUser, refreshAccessToken,
      changeCurrentPassword, getCurrentUser, updateAccountDetails, 
      updateuserAvatar, updateuserCoverImage, getUserChannelProfile, getWatchHistory 
    }; 
    