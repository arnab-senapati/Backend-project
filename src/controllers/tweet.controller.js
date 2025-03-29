import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../errors/ApiError.js";
import { ApiResponse } from "../responses/ApiResponse.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required.");
    }

    const newTweet = new Tweet({ content, userId: req.user._id });
    await newTweet.save();
    res.status(201).json(new ApiResponse(newTweet));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const tweets = await Tweet.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(tweets));
});

const updateTweet = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required.");
    }

    const updatedTweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, userId: req.user._id },
        { content },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(404, "Tweet not found or you are not authorized to update it.");
    }

    res.status(200).json(new ApiResponse(updatedTweet));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const deletedTweet = await Tweet.findOneAndDelete({ _id: tweetId, userId: req.user._id });

    if (!deletedTweet) {
        throw new ApiError(404, "Tweet not found or you are not authorized to delete it.");
    }

    res.status(200).json(new ApiResponse(null, "Tweet deleted successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };