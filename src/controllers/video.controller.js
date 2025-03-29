import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../errors/ApiError.js";
import { ApiResponse } from "../responses/ApiResponse.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(videos));
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description, url } = req.body;

    if (!title || !description || !url) {
        throw new ApiError(400, "Title, description, and URL are required.");
    }

    const newVideo = new Video({
        title,
        description,
        url,
        userId: req.user._id,
        isPublished: true,
    });

    await newVideo.save();
    res.status(201).json(new ApiResponse(newVideo));
});

const getVideoById = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found.");
    }

    res.status(200).json(new ApiResponse(video));
});

const updateVideo = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;
    const { title, description, url } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const updatedVideo = await Video.findOneAndUpdate(
        { _id: videoId, userId: req.user._id },
        { title, description, url },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(404, "Video not found or you are not authorized to update it.");
    }

    res.status(200).json(new ApiResponse(updatedVideo));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const deletedVideo = await Video.findOneAndDelete({ _id: videoId, userId: req.user._id });

    if (!deletedVideo) {
        throw new ApiError(404, "Video not found or you are not authorized to delete it.");
    }

    res.status(200).json(new ApiResponse(null, "Video deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const video = await Video.findOne({ _id: videoId, userId: req.user._id });

    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized to update it.");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    res.status(200).json(new ApiResponse(video));
});

export { getAllVideos, publishVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus };