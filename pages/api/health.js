import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      time: new Date().toISOString(),
      db: "connected",
      app: "cobe-main",
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
      branch: process.env.VERCEL_GIT_COMMIT_REF || "local",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      deployment: process.env.VERCEL_URL || "local",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      time: new Date().toISOString(),
      db: "disconnected",
      message: error.message,
      app: "cobe-main",
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
      branch: process.env.VERCEL_GIT_COMMIT_REF || "local",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      deployment: process.env.VERCEL_URL || "local",
    });
  }
}
