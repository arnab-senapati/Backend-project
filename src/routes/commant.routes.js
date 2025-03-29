import { Router } from "express";
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment
} from "../controllers/comment.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply verifyJWT middleware to all routes in this file
router.use(verifyJWT);

// Route to get all comments for a video and add a new comment
router
    .route("/:videoId")
    .get(getVideoComments) // Get comments for a specific video
    .post(addComment); // Add a new comment to a specific video

// Route to update or delete a specific comment by its ID
router
    .route("/c/:commentId")
    .patch(updateComment) // Update a specific comment
    .delete(deleteComment); // Delete a specific comment

export default router;