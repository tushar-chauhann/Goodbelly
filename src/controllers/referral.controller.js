import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//  Create Referral (Link Referred User to Referrer)
const createReferral = asyncHandler(async (req, res) => {
    const { referrerId } = req.body;
    const referredId = req.user.id; // The user who signed up

    if (!referrerId) {
        throw new ApiError(400, "Referrer ID is required");
    }

    if (referrerId === referredId) {
        throw new ApiError(400, "You cannot refer yourself");
    }

    // Check if referral already exists
    const existingReferral = await prisma.referral.findFirst({
        where: { referredId },
    });

    if (existingReferral) {
        throw new ApiError(400, "Referral already exists for this user");
    }

    // Create referral entry
    const referral = await prisma.referral.create({
        data: { referrerId, referredId },
    });

    return res.status(201).json(new ApiResponse(201, referral, "Referral created successfully"));
});

//     Get Referrals Made by a User
const getUserReferrals = asyncHandler(async (req, res) => {
    const referrerId = req.user.id;

    const referrals = await prisma.referral.findMany({
        where: { referrerId },
        include: { referred: true },
    });

    return res.status(200).json(new ApiResponse(200, referrals, "Referrals retrieved successfully"));
});

//     Get Referral Details
const getReferralById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const referral = await prisma.referral.findUnique({
        where: { id },
        include: { referrer: true, referred: true },
    });

    if (!referral) {
        throw new ApiError(404, "Referral not found");
    }

    return res.status(200).json(new ApiResponse(200, referral, "Referral details retrieved"));
});

//     Apply Referral Reward (Give points when referred user makes first purchase)
const applyReferralReward = asyncHandler(async (req, res) => {
    const { referredId } = req.body;

    const referral = await prisma.referral.findFirst({ where: { referredId } });

    if (!referral) {
        throw new ApiError(404, "Referral not found");
    }

    const referrerId = referral.referrerId;
    const rewardPoints = 50; // Change reward value as needed

    // Update referrer's reward points
    await prisma.reward.upsert({
        where: { userId: referrerId },
        update: { points: { increment: rewardPoints } },
        create: { userId: referrerId, points: rewardPoints },
    });

    // Update referral record to store reward points
    await prisma.referral.update({
        where: { id: referral.id },
        data: { rewardPoints },
    });

    return res.status(200).json(new ApiResponse(200, {}, "Referral reward applied successfully"));
});


export { createReferral, getUserReferrals, getReferralById, applyReferralReward }