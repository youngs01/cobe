import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const calls = await prisma.request.findMany();
      res.status(200).json(calls);
    } else if (req.method === "POST") {
      const { userId, type, reason, status, date, startDate, endDate, halfDay } = req.body;
      console.log("[/api/requests POST] received:", { userId, type, reason, status, date, startDate, endDate, halfDay });
      
      // validate required fields
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!type) return res.status(400).json({ error: "type required" });
      if (!reason) return res.status(400).json({ error: "reason required" });
      if (!status) return res.status(400).json({ error: "status required" });
      
      // build data based on type
      let data = { userId, type, reason, status };
      
      if (type === "연차") {
        if (!startDate) return res.status(400).json({ error: "startDate required for 연차" });
        if (!endDate) return res.status(400).json({ error: "endDate required for 연차" });
        data.startDate = typeof startDate === "string" ? new Date(startDate) : startDate;
        data.endDate = typeof endDate === "string" ? new Date(endDate) : endDate;
        data.date = null;
        data.halfDay = null;
      } else if (type === "반차") {
        if (!date) return res.status(400).json({ error: "date required for 반차" });
        if (!halfDay) return res.status(400).json({ error: "halfDay required for 반차" });
        data.date = typeof date === "string" ? new Date(date) : date;
        data.halfDay = halfDay;
        data.startDate = null;
        data.endDate = null;
      } else {
        return res.status(400).json({ error: "type must be 연차 or 반차" });
      }
      
      console.log("[/api/requests POST] final data:", JSON.stringify(data, null, 2));
      
      try {
        const r = await prisma.request.create({ data });
        console.log("[/api/requests POST] created:", r);
        res.status(201).json(r);
      } catch (createErr) {
        console.error("[/api/requests POST] prisma error:", createErr.message);
        throw createErr;
      }
    } else if (req.method === "PATCH") {
      const { id } = req.query;
      const updates = { ...req.body };
      // Convert date/startDate/endDate/approvedAt to DateTime if provided
      if (updates.date && typeof updates.date === "string") updates.date = new Date(updates.date);
      if (updates.startDate && typeof updates.startDate === "string") updates.startDate = new Date(updates.startDate);
      if (updates.endDate && typeof updates.endDate === "string") updates.endDate = new Date(updates.endDate);
      if (updates.approvedAt && typeof updates.approvedAt === "string") updates.approvedAt = new Date(updates.approvedAt);
      const r = await prisma.request.update({ where: { id }, data: updates });
      res.status(200).json(r);
    } else if (req.method === "DELETE") {
      const { id } = req.query;
      await prisma.request.delete({ where: { id } });
      res.status(204).end();
    } else {
      res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
      res.status(405).end();
    }
  } catch (e) {
    console.error("[/api/requests]", e.message);
    console.error("[/api/requests] full error:", e);
    res.status(500).json({ error: e.message, details: e.toString() });
  }
}
