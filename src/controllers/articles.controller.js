import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

// Create Article
const addArticles = asyncHandler(async (req, res) => {
  const { title, author, description } = req.body;

  if (!title || !author || !description) {
    throw new ApiError(400, "Title, author, and description are required");
  }

  let image = null;
  let publicId = null;

  if (req.file) {
    //upload to s3
    const response = await uploadToS3(req.file, "articles");
    if (!response) {
      throw new ApiError(500, "Failed to upload image");
    }
    image = response;
    publicId = response.split("/").pop();
  }

  const article = await prisma.article.create({
    data: {
      title,
      author,
      description,
      image,
      publicId,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, article, "Article created successfully"));
});

// Get All Articles
const getArticles = asyncHandler(async (req, res) => {
  const articles = await prisma.article.findMany();

  res
    .status(200)
    .json(new ApiResponse(200, articles, "Articles retrieved successfully"));
});

// Delete Article
const deleteArticles = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const article = await prisma.article.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!article) {
    throw new ApiError(404, "Article not found");
  }

  if (article.publicId) {
    await deleteFromS3(article.publicId);
  }

  await prisma.article.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Article deleted successfully"));
});

export { addArticles, getArticles, deleteArticles };
