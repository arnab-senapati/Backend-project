import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Total videos uploaded by the user
    const totalVideos = await Video.countDocuments({ userId });

    // Total views across all videos
    const totalViews = await Video.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
    ]);
    const views = totalViews.length > 0 ? totalViews[0].totalViews : 0;

    // Total subscribers
    const totalSubscribers = await Subscription.countDocuments({ channelId: userId });

    // Total likes across all videos
    const totalLikes = await Like.countDocuments({ videoId: { $in: await Video.find({ userId }).distinct("_id") } });

    res.status(200).json(
        new ApiResponse({
            totalVideos,
            totalViews: views,
            totalSubscribers,
            totalLikes,
        })
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch all videos uploaded by the user
    const videos = await Video.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(videos));
});

export { getChannelStats, getChannelVideos };