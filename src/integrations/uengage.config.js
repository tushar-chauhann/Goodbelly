import dotenv from "dotenv";
dotenv.config();

export const UENGAGE_CONFIG = {
  BASE_URL: process.env.UENGAGE_BASE_URL,
  ACCESS_TOKEN: process.env.UENGAGE_ACCESS_TOKEN,
  HEADERS: {
    "Content-Type": "application/json",
    "access-token": process.env.UENGAGE_ACCESS_TOKEN,
  },
};
