import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../prismaClient.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  try {
    // 1) Prefer Bearer header, 2) fallback to cookie
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");
    const cookieToken = req.cookies?.accessToken;
    const token = headerToken || cookieToken;

    if (!token) {
      throw new ApiError(401, "Unauthorized: No token provided");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, "Session expired, please log in again");
      }
      throw new ApiError(401, "Invalid access token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profileImage: true,
        preference: true,
        vendor: true,
      },
    });

    req.user = user;

    // Check if the logged-in user is a consultant
    const consultant = await prisma.consultant.findUnique({
      where: { id: decodedToken?.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
        username: true,
        bio: true,
        tagline: true,
        experience: true,
        specialization: true,
        credentials: true,
        profileImage: true,
        isActive: true,
        bankDetails: true,
        availability: true,
        durations: true,
      },
    });

    if (consultant) {
      // If consultant, add consultant data to the request
      req.consultant = consultant;
    }

    if (!user && !consultant) {
      throw new ApiError(401, "User/Consultant not found");
    }

    next();
  } catch (error) {
    next(error);
  }
});
