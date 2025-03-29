import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../errors/ApiError.js";
import { ApiResponse } from "../responses/ApiResponse.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const existingLike = await Like.findOne({ videoId, userId });

    if (existingLike) {
        // Unlike the video
        await existingLike.deleteOne();
        res.json(new ApiResponse({ message: "Video unliked successfully." }));
    } else {
        // Like the video
        const newLike = new Like({ videoId, userId });
        await newLike.save();
        res.json(new ApiResponse({ message: "Video liked successfully." }));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID.");
    }

    const existingLike = await Like.findOne({ commentId, userId });

    if (existingLike) {
        // Unlike the comment
        await existingLike.deleteOne();
        res.json(new ApiResponse({ message: "Comment unliked successfully." }));
    } else {
        // Like the comment
        const newLike = new Like({ commentId, userId });
        await newLike.save();
        res.json(new ApiResponse({ message: "Comment liked successfully." }));
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const existingLike = await Like.findOne({ tweetId, userId });

    if (existingLike) {
        // Unlike the tweet
        await existingLike.deleteOne();
        res.json(new ApiResponse({ message: "Tweet unliked successfully." }));
    } else {
        // Like the tweet
        const newLike = new Like({ tweetId, userId });
        await newLike.save();
        res.json(new ApiResponse({ message: "Tweet liked successfully." }));
    }
});

const getVideoLikes = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likes = await Like.find({ userId, videoId: { $exists: true } }).populate("videoId");
    res.json(new ApiResponse(likes));
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getVideoLikes };