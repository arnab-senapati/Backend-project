import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const healthCheck = asyncHandler(async (req, res) => {
    // Build a healthcheck response that returns the OK status with a message
    res.status(200).json(new ApiResponse({ message: "Health Check OK", status: "UP" }));
});

export { healthCheck };