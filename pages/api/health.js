import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", time: new Date().toISOString(), db: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", time: new Date().toISOString(), db: "disconnected", message: error.message });
  }
}
