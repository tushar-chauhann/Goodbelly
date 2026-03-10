// prismaClient.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

// Prevent creating multiple clients during development (hot reload)
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
