import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//  Get User Rewards
const getUserRewards = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const rewards = await prisma.reward.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const totalPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalPoints, rewards },
        "Rewards retrieved successfully"
      )
    );
});

// Add Reward Points
const addReward = asyncHandler(async (req, res) => {
  const { userId, points, reason } = req.body;

  if (!userId || !points || !reason) {
    throw new ApiError(400, "All fields are required");
  }

  await prisma.reward.create({
    data: { userId, points, reason },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Reward added successfully"));
});

//  Get All Rewards
const getAllRewards = asyncHandler(async (req, res) => {
  const rewards = await prisma.reward.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, rewards, "All rewards retrieved successfully"));
});

//  Delete Reward
const deleteReward = asyncHandler(async (req, res) => {
  const { rewardId } = req.params;

  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });

  if (!reward) {
    throw new ApiError(404, "Reward not found");
  }

  await prisma.reward.delete({ where: { id: rewardId } });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Reward deleted successfully"));
});

export { getUserRewards, addReward, getAllRewards, deleteReward };
