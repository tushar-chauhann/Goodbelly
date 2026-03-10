import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";

const weeklySalesReport = asyncHandler(async (req, res) => {
  // Get the start of the week (7 days ago)
  const startOfWeek = new Date(new Date() - 7 * 24 * 60 * 60 * 1000);

  // Fetch orders from the last 7 days
  const weeklySales = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfWeek,
      },
    },
    select: {
      totalPrice: true,
      createdAt: true,
    },
  });

  // Group revenue by day
  const revenueByDay = {};

  weeklySales.forEach((order) => {
    const day = order.createdAt.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const revenue = order.totalPrice;

    if (!revenueByDay[day]) {
      revenueByDay[day] = 0;
    }

    revenueByDay[day] += revenue;
  });

  // Format the data for the front-end
  const formattedData = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].map((day) => ({
    day,
    revenue: revenueByDay[day] || 0,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedData,
        "Weekly revenue report retrieved successfully"
      )
    );
});

const monthlySalesReport = asyncHandler(async (req, res) => {
  // Fetch all orders
  const allOrders = await prisma.order.findMany({
    select: {
      totalPrice: true,
      createdAt: true,
    },
  });

  // Group sales by month and year
  const salesByMonth = {};

  allOrders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear().toString();
    const key = `${month} ${year}`; // Unique key for each month-year combination
    const sales = order.totalPrice;

    if (!salesByMonth[key]) {
      salesByMonth[key] = 0;
    }

    salesByMonth[key] += sales;
  });

  // Format the data for the front-end
  const formattedData = Object.keys(salesByMonth).map((key) => ({
    month: key,
    sales: salesByMonth[key],
  }));

  // Sort data by year and month
  formattedData.sort((a, b) => {
    const [monthA, yearA] = a.month.split(" ");
    const [monthB, yearB] = b.month.split(" ");
    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);
    return dateA - dateB;
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedData,
        "Monthly sales report retrieved successfully"
      )
    );
});

const yearlyRevenueReport = asyncHandler(async (req, res) => {
  // Fetch all orders
  const allOrders = await prisma.order.findMany({
    select: {
      totalPrice: true,
      createdAt: true,
    },
  });

  // Group sales by year
  const salesByYear = {};

  allOrders.forEach((order) => {
    const year = order.createdAt.getFullYear().toString(); // Extract year from createdAt
    const sales = order.totalPrice;

    if (!salesByYear[year]) {
      salesByYear[year] = 0;
    }

    salesByYear[year] += sales;
  });

  // Format the data for the front-end
  const formattedData = Object.keys(salesByYear).map((year) => ({
    year,
    sales: salesByYear[year],
  }));

  // Sort data by year (ascending order)
  formattedData.sort((a, b) => a.year - b.year);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedData,
        "Yearly revenue report retrieved successfully"
      )
    );
});

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};
const getTotalRevenue = asyncHandler(async (req, res) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [currentRevenue, previousRevenue] = await Promise.all([
    prisma.order.aggregate({
      _sum: {
        totalPrice: true,
      },
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
      },
    }),
    prisma.order.aggregate({
      _sum: {
        totalPrice: true,
      },
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
  ]);

  const currentRevenueValue = currentRevenue._sum.totalPrice || 0;
  const previousRevenueValue = previousRevenue._sum.totalPrice || 0;

  const percentageChange = calculatePercentageChange(
    currentRevenueValue,
    previousRevenueValue
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalRevenue: currentRevenueValue,
        percentageChange: percentageChange.toFixed(2),
      },
      "Total revenue fetched successfully"
    )
  );
});

const getTotalUsers = asyncHandler(async (req, res) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [currentUsers, previousUsers] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
  ]);

  const percentageChange = calculatePercentageChange(
    currentUsers,
    previousUsers
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers: currentUsers,
        percentageChange: percentageChange.toFixed(2),
      },
      "Total users fetched successfully"
    )
  );
});

const getPendingOrders = asyncHandler(async (req, res) => {
  const pendingOrders = await prisma.order.count({
    where: {
      status: "PROCESSING",
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { pendingOrders },
        "Pending orders fetched successfully"
      )
    );
});

// API for Successful Orders
const getSuccessfulOrders = asyncHandler(async (req, res) => {
  const successfulOrders = await prisma.order.count({
    where: {
      status: "DELIVERED",
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { successfulOrders },
        "Successful orders fetched successfully"
      )
    );
});

const addStats = asyncHandler(async (req, res) => {
  const { heading, subheading, kitchens, orders, places } = req.body;

  if (!heading || !kitchens || !orders || !places) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  // handle image if uploaded...
  let image = null;
  let publicId = null;
  if (req.file) {
    const response = await uploadToS3(req.file, "stats");
    if (response) {
      image = response;
      publicId = response.split("/").pop();
    }
  }
  const stats = await prisma.stats.create({
    data: {
      heading,
      subheading,
      kitchens: parseInt(kitchens),
      orders: parseInt(orders),
      places: parseInt(places),
      image,
      publicId,
    },
  });
  return res
    .status(201)
    .json(new ApiResponse(201, stats, "Stats added successfully"));
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await prisma.stats.findMany();
  return res
    .status(200)
    .json(new ApiResponse(200, stats[0], "Stats fetched successfully"));
});

const updateStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { heading, subheading, kitchens, orders, places } = req.body;

  //check existing data
  const existingStats = await prisma.stats.findUnique({ where: { id } });
  if (!existingStats) {
    return res.status(404).json(new ApiError(404, "Stats not found"));
  }

  // handle image if uploaded...
  let image = null;
  let publicId = null;
  if (req.file) {
    const response = await uploadToS3(req.file, "stats");
    if (response) {
      image = response;
      publicId = response.split("/").pop();
    }
  }

  const stats = await prisma.stats.update({
    where: { id },
    data: {
      heading: heading || existingStats.heading,
      subheading: subheading || existingStats.subheading,
      kitchens: parseInt(kitchens) || existingStats.kitchens,
      orders: parseInt(orders) || existingStats.orders,
      places: parseInt(places) || existingStats.places,
      image: image || existingStats.image,
      publicId: publicId || existingStats.publicId,
    },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Stats updated successfully"));
});

const updateScoop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { heading, content } = req.body;

  // Check if scoop exists
  const existingScoop = await prisma.scoop.findUnique({ where: { id } });
  if (!existingScoop) {
    return res.status(404).json(new ApiError(404, "Scoop not found"));
  }

  // Handle image upload if provided
  let imageUrl = existingScoop.imageUrl;
  let publicId = existingScoop.publicId;

  if (req.file) {
    const response = await uploadToS3(req.file, "scoops");
    if (response) {
      imageUrl = response;
      publicId = response.split("/").pop();
    }
  }

  // Update scoop
  const updatedScoop = await prisma.scoop.update({
    where: { id },
    data: {
      heading: heading || existingScoop.heading,
      content: content || existingScoop.content,
      imageUrl,
      publicId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedScoop, "Scoop updated successfully"));
});

const createScoop = asyncHandler(async (req, res) => {
  const { heading, content } = req.body;

  // Validate required fields
  if (!heading || !content) {
    return res
      .status(400)
      .json(new ApiError(400, "Heading and content are required"));
  }

  // Handle image if provided
  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    const response = await uploadToS3(req.file, "scoops");
    if (response) {
      imageUrl = response;
      publicId = response.split("/").pop();
    }
  }

  // Create new Scoop
  const newScoop = await prisma.scoop.create({
    data: {
      heading,
      content,
      imageUrl,
      publicId,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newScoop, "Scoop created successfully"));
});

const getScoop = asyncHandler(async (req, res) => {
  const scoop = await prisma.scoop.findMany();
  return res
    .status(200)
    .json(new ApiResponse(200, scoop[0] || {}, "Scoop fetched successfully"));
});

export {
  weeklySalesReport,
  yearlyRevenueReport,
  monthlySalesReport,
  getTotalRevenue,
  getTotalUsers,
  getPendingOrders,
  getSuccessfulOrders,
  addStats,
  getStats,
  updateStats,
  updateScoop,
  createScoop,
  getScoop,
};
