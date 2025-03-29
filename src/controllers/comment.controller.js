import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../errors/ApiError.js";
import { ApiResponse } from "../responses/ApiResponse.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const comments = await Comment.find({ videoId }).sort({ createdAt: -1 });
    res.json(new ApiResponse(comments));
});

const addComment = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    if (!text || text.trim() === "") {
        throw new ApiError(400, "Comment text is required.");
    }

    const newComment = new Comment({
        videoId,
        userId: req.user._id,
        text,
    });

    await newComment.save();
    res.json(new ApiResponse(newComment));
});

const updateComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID.");
    }

    if (!text || text.trim() === "") {
        throw new ApiError(400, "Comment text is required.");
    }

    const updatedComment = await Comment.findOneAndUpdate(
        { _id: commentId, userId: req.user._id },
        { text },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found or you are not authorized to update it.");
    }

    res.json(new ApiResponse(updatedComment));
});

const deleteComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID.");
    }

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        userId: req.user._id,
    });

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found or you are not authorized to delete it.");
    }

    res.json(new ApiResponse(null, "Comment deleted successfully."));
});

export { getVideoComments, addComment, updateComment, deleteComment };