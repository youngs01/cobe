import prisma from "../../lib/prisma";

async function getHolidaySet(prismaClient, years = []) {
  const uniqueYears = Array.from(new Set(years.filter(Boolean)));
  if (uniqueYears.length === 0) return new Set();

  try {
    const start = new Date(`${uniqueYears[0]}-01-01`);
    const end = new Date(`${uniqueYears[uniqueYears.length - 1]}-12-31`);
    const dbHolidays = await prismaClient.holiday.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      select: { date: true },
    });
    return new Set(dbHolidays.map((h) => h.date.toISOString().slice(0, 10)));
  } catch (error) {
    console.warn("[holiday lookup] failed", error.message);
    return new Set();
  }
}

function getDayInfo(date) {
  const day = new Date(date).getDay();
  return { isWeekend: day === 0 || day === 6 };
}

async function requestCost(r, prismaClient) {
  if (r.halfDay) return 0.5;
  const start = r.startDate ? new Date(r.startDate) : (r.date ? new Date(r.date) : null);
  const end = r.endDate ? new Date(r.endDate) : (r.date ? new Date(r.date) : null);

  const years = [];
  if (start) years.push(start.getFullYear());
  if (end) years.push(end.getFullYear());
  if (r.date || r.startDate) years.push(new Date(r.date || r.startDate).getFullYear());

  const holidays = await getHolidaySet(prismaClient, years);

  if (start && end) {
    let count = 0;
    let d = new Date(start);
    while (d <= end) {
      const yyyyMMdd = d.toISOString().slice(0, 10);
      const info = getDayInfo(d);
      if (!info.isWeekend && !holidays.has(yyyyMMdd)) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }
  const singleDate = r.date || r.startDate;
  if (singleDate) {
    const d = new Date(singleDate);
    const yyyyMMdd = d.toISOString().slice(0, 10);
    const info = getDayInfo(d);
    return !info.isWeekend && !holidays.has(yyyyMMdd) ? 1 : 0;
  }
  return 1;
}

function calcAnnualLeave(hireDate, asOfDate = new Date()) {
  const hire = new Date(hireDate);
  const today = new Date(asOfDate);
  const diffMs = today - hire;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor(diffDays / 30);

  if (years < 1) {
    return Math.min(months, 11);
  } else {
    const extra = Math.floor((years - 1) / 2);
    return Math.min(15 + extra, 25);
  }
}

function getLeaveYearStart(hireDate, refDate = new Date()) {
  const hire = new Date(hireDate);
  const now = new Date(refDate);
  const start = new Date(hire);
  start.setFullYear(now.getFullYear());
  start.setHours(0, 0, 0, 0);
  if (start > now) {
    start.setFullYear(now.getFullYear() - 1);
  }
  return start;
}

function getLeaveYearRanges(hireDate, refDate = new Date()) {
  const currentStart = getLeaveYearStart(hireDate, refDate);
  const lastStart = new Date(currentStart);
  lastStart.setFullYear(currentStart.getFullYear() - 1);
  const nextStart = new Date(currentStart);
  nextStart.setFullYear(currentStart.getFullYear() + 1);
  return { lastStart, currentStart, nextStart };
}

function isRequestInRange(r, start, end) {
  const reqDate = r.date || r.startDate;
  if (!reqDate) return false;
  const d = new Date(reqDate);
  return d >= start && d < end;
}

async function calcApprovedLeaveForLeaveYear(requests, hireDate, refDate = new Date(), prismaClient) {
  const { currentStart, nextStart } = getLeaveYearRanges(hireDate, refDate);
  let totalCost = 0;
  for (const r of requests) {
    if (r.status === "승인" && isRequestInRange(r, currentStart, nextStart)) {
      totalCost += await requestCost(r, prismaClient);
    }
  }
  return totalCost;
}

async function calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, refDate = new Date(), prismaClient) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, refDate);
  let totalCost = 0;
  for (const r of requests) {
    if (r.status === "승인" && isRequestInRange(r, lastStart, currentStart)) {
      totalCost += await requestCost(r, prismaClient);
    }
  }
  return totalCost;
}

async function calcRemainingLeaveWithCarryover(requests, hireDate, prismaClient) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, new Date());
  const lastYearTotal = calcAnnualLeave(hireDate, lastStart);
  const lastYearUsed = await calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, new Date(), prismaClient);
  const lastYearRemain = lastYearTotal - lastYearUsed;
  const currentYearTotal = calcAnnualLeave(hireDate, currentStart);
  const adjustedTotal = currentYearTotal + lastYearRemain;
  const currentYearUsed = await calcApprovedLeaveForLeaveYear(requests, hireDate, new Date(), prismaClient);
  return Math.max(0, adjustedTotal - currentYearUsed);
}

async function syncUserRemainingLeave(userId, prismaClient) {
  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const requests = await prismaClient.request.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const approvedRequests = requests.filter((r) => r.status === "승인");
  const newRemain = await calcRemainingLeaveWithCarryover(approvedRequests, user.hireDate, prismaClient);

  console.log("[syncUserRemainingLeave]", { userId, existingManualRemain: user.manualRemain, newRemain, approvedCount: approvedRequests.length });

  await prismaClient.user.update({
    where: { id: user.id },
    data: { manualRemain: newRemain },
  });

  return newRemain;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const calls = await prisma.request.findMany();
      res.status(200).json(calls);
    } else if (req.method === "POST") {
      const { userId, type, reason, status, date, startDate, endDate, halfDay } = req.body;
      console.log("[/api/requests POST] received:", { userId, type, reason, status, date, startDate, endDate, halfDay });
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!type) return res.status(400).json({ error: "type required" });
      if (!reason) return res.status(400).json({ error: "reason required" });
      if (!status) return res.status(400).json({ error: "status required" });

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
        await syncUserRemainingLeave(userId, prisma);
        console.log("[/api/requests POST] created:", r);
        res.status(201).json(r);
      } catch (createErr) {
        console.error("[/api/requests POST] prisma error:", createErr.message);
        throw createErr;
      }
    } else if (req.method === "PATCH") {
      const { id } = req.query;
      const updates = { ...req.body };
      const oldReq = await prisma.request.findUnique({ where: { id } });
      if (!oldReq) return res.status(404).json({ error: "Request not found" });
      const oldStatus = oldReq.status;
      const newStatus = updates.status ?? oldStatus;
      const statusChanged = newStatus !== oldStatus;

      if (updates.date && typeof updates.date === "string") updates.date = new Date(updates.date);
      if (updates.startDate && typeof updates.startDate === "string") updates.startDate = new Date(updates.startDate);
      if (updates.endDate && typeof updates.endDate === "string") updates.endDate = new Date(updates.endDate);
      if (updates.approvedAt && typeof updates.approvedAt === "string") updates.approvedAt = new Date(updates.approvedAt);

      console.log("[/api/requests PATCH] status transition", { id, oldStatus, newStatus, statusChanged });
      const r = await prisma.request.update({ where: { id }, data: updates });
      await syncUserRemainingLeave(oldReq.userId, prisma);

      res.status(200).json(r);
    } else if (req.method === "DELETE") {
      const { id } = req.query;
      const existing = await prisma.request.findUnique({ where: { id } });
      await prisma.request.delete({ where: { id } });
      if (existing) {
        await syncUserRemainingLeave(existing.userId, prisma);
      }
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
