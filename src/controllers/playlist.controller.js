import mongoose, { isValidObjectId } from "mongoose";
import { playlist } from "../models/playlist.model.js";
import { ApiError } from "../errors/ApiError.js";
import { ApiResponse } from "../responses/ApiResponse.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        throw new ApiError(400, "Playlist name is required.");
    }

    const newPlaylist = new playlist({ name, description, userId: req.user._id });
    await newPlaylist.save();
    res.json(new ApiResponse(newPlaylist));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const playlists = await playlist.find({ userId });
    res.json(new ApiResponse(playlists));
});

const getUserPlaylistById = asyncHandler(async (req, res) => {
    const playlistId = req.params.playlistId;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID.");
    }

    const userPlaylist = await playlist.findOne({ _id: playlistId, userId: req.user._id });
    if (!userPlaylist) {
        throw new ApiError(404, "Playlist not found.");
    }

    res.json(new ApiResponse(userPlaylist));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const playlistId = req.params.playlistId;
    const { videoId } = req.body;

    if (!isValidObjectId(playlistId) || !videoId) {
        throw new ApiError(400, "Invalid playlist ID or video ID.");
    }

    const userPlaylist = await playlist.findOne({ _id: playlistId, userId: req.user._id });
    if (!userPlaylist) {
        throw new ApiError(404, "Playlist not found.");
    }

    if (userPlaylist.videos.includes(videoId)) {
        throw new ApiError(400, "Video already exists in the playlist.");
    }

    userPlaylist.videos.push(videoId);
    await userPlaylist.save();

    res.json(new ApiResponse(userPlaylist));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const playlistId = req.params.playlistId;
    const videoId = req.params.videoId;

    if (!isValidObjectId(playlistId) || !videoId) {
        throw new ApiError(400, "Invalid playlist ID or video ID.");
    }

    const userPlaylist = await playlist.findOne({ _id: playlistId, userId: req.user._id });
    if (!userPlaylist) {
        throw new ApiError(404, "Playlist not found.");
    }

    const videoIndex = userPlaylist.videos.indexOf(videoId);
    if (videoIndex === -1) {
        throw new ApiError(404, "Video not found in the playlist.");
    }

    userPlaylist.videos.splice(videoIndex, 1);
    await userPlaylist.save();

    res.json(new ApiResponse(userPlaylist));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const playlistId = req.params.playlistId;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID.");
    }

    const deletedPlaylist = await playlist.findOneAndDelete({ _id: playlistId, userId: req.user._id });
    if (!deletedPlaylist) {
        throw new ApiError(404, "Playlist not found.");
    }

    res.json(new ApiResponse(null, "Playlist deleted successfully."));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const playlistId = req.params.playlistId;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID.");
    }

    const updatedPlaylist = await playlist.findOneAndUpdate(
        { _id: playlistId, userId: req.user._id },
        { name, description },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found.");
    }

    res.json(new ApiResponse(updatedPlaylist));
});

export {
    createPlaylist,
    getUserPlaylists,
    getUserPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};