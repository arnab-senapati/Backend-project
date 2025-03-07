import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req, res) => {
   //get user details from frontend
   //validation - not empty
   //check if user already exists: username , email
   //check for images , check for avater
   // upload them to cloudinary , avater
   //create user object - create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return res

   //Now One by one 

    //get user details from frontend
     const {fullname , email , username , password} = req.body
     console.log("email:",email);

    //validation - not empty
     if( 
        [fullname , email , username , password].some((field) =>
        field?.trim() === "")
     ){
        throw new ApiError(400 , "All fields are required")
     } 

     //check if user already exists: username , email
     const existedUser = User.findOne({
        $or: [{ username } , { email }]
     })

     if (existedUser){
        throw new ApiError(409 , "User with email or username already exists")
     }

     //check for images , check for avater
    const avatarLocalPath = req.files?.avater[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    } 

    // upload them to cloudinary , avater
   const avater = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avater){
      throw new ApiError(400,"Avatar file is required")
   }

   //create user object - create entry in db

   const user = await User.create({
      fullname,
      avater: avater.url,
      coverImage: coverImage.url  || "",
      email,
      password,
      username: username.toLowerCase()
   })

   //remove password and refresh token field from response
   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

    //check for user creation
    if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering the user")
    }

    //return res
    return res.status(201).json({
      new ApiResponse(200, createdUser, "User Registered Successfully")
    })
})

export {registerUser}