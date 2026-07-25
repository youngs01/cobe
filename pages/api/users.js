import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";

// server-loaded holidays (yyyy-mm-dd strings) populated per request
let SERVER_HOLIDAYS = [];
function getServerHolidays(year) {
  const prefix = String(year) + "-";
  return SERVER_HOLIDAYS.filter(d => d.startsWith(prefix));
}

function getDayInfo(date) {
  const day = new Date(date).getDay();
  return { isWeekend: day === 0 || day === 6 };
}

function requestCost(r, holidays = []) {
  if (r.halfDay) return 0.5;
  const start = r.startDate ? new Date(r.startDate) : (r.date ? new Date(r.date) : null);
  const end = r.endDate ? new Date(r.endDate) : (r.date ? new Date(r.date) : null);
  if (start && end) {
    let count = 0;
    let d = new Date(start);
    while (d <= end) {
      const yyyyMMdd = d.toISOString().slice(0, 10);
      const info = getDayInfo(d);
      if (!info.isWeekend && !holidays.includes(yyyyMMdd)) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }
  const singleDate = r.date || r.startDate;
  if (singleDate) {
    const d = new Date(singleDate);
    const yyyyMMdd = d.toISOString().slice(0, 10);
    const info = getDayInfo(d);
    return (!info.isWeekend && !holidays.includes(yyyyMMdd)) ? 1 : 0;
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

function calcApprovedLeaveForLeaveYear(requests, hireDate, refDate = new Date()) {
  const { currentStart, nextStart } = getLeaveYearRanges(hireDate, refDate);
  const holidays = getServerHolidays(currentStart.getFullYear());
  return requests
    .filter((r) => r.status === "승인")
    .filter((r) => isRequestInRange(r, currentStart, nextStart))
    .reduce((acc, r) => acc + requestCost(r, holidays), 0);
}

function calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, refDate = new Date()) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, refDate);
  const holidays = getServerHolidays(lastStart.getFullYear());
  return requests
    .filter((r) => r.status === "승인")
    .filter((r) => isRequestInRange(r, lastStart, currentStart))
    .reduce((acc, r) => acc + requestCost(r, holidays), 0);
}

function calcRemainingLeaveWithCarryover(requests, hireDate) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, new Date());

  const lastYearTotal = calcAnnualLeave(hireDate, lastStart);
  const lastYearUsed = calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, new Date());
  const lastYearRemain = lastYearTotal - lastYearUsed;

  const currentYearTotal = calcAnnualLeave(hireDate, currentStart);
  const adjustedTotal = currentYearTotal + lastYearRemain;
  const currentYearUsed = calcApprovedLeaveForLeaveYear(requests, hireDate, new Date());

  return Math.max(0, adjustedTotal - currentYearUsed);
}

async function syncUserRemainingLeave(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const requests = await prisma.request.findMany({ where: { userId, status: "승인" }, orderBy: { createdAt: "asc" } });
  const newRemain = calcRemainingLeaveWithCarryover(requests, user.hireDate);

  await prisma.user.update({
    where: { id: user.id },
    data: { manualRemain: newRemain },
  });

  return newRemain;
}

export default async function handler(req, res) {
  try {
    // load holidays from DB for this request
    try {
      const items = await prisma.holiday.findMany();
      SERVER_HOLIDAYS = items.map(h => h.date.toISOString().slice(0,10));
    } catch (e) {
      SERVER_HOLIDAYS = [];
    }
    if (req.method === "GET") {
      let users = await prisma.user.findMany();
      if (users.length === 0) {
        await prisma.user.create({
          data: {
            loginId: "admin",
            password: "admin1234",
            name: "시스템관리자",
            role: "최종관리자",
            hireDate: new Date("2020-01-01"),
            active: true,
          },
        });
        users = await prisma.user.findMany();
      }
      // 비밀번호 응답에서 제거
      res.status(200).json(users.map(({ password, ...u }) => u));
    } else if (req.method === "POST") {
      const data = { ...req.body };
      
      // pw → password 변환 및 해시
      if (data.pw !== undefined) {
        data.password = await bcrypt.hash(data.pw, 10);
        delete data.pw;
      }
      
      // hireDate를 DateTime으로 변환
      if (data.hireDate) {
        data.hireDate = new Date(data.hireDate);
      }
      
      
      const user = await prisma.user.create({ data });
      res.status(201).json({ ...user });
    } else if (req.method === "DELETE") {
      const { id } = req.query;
      // First delete all requests for this user, then delete the user
      await prisma.request.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });
      res.status(204).end();
    } else if (req.method === "PATCH") {
      const { id } = req.query;
      const updates = { ...req.body };
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      if (updates.manualRemain !== undefined && updates.manualRemain !== null) {
        const v = parseFloat(updates.manualRemain);
        updates.manualRemain = Number.isFinite(v) ? v : null;
      }
      const u = await prisma.user.update({ where: { id }, data: updates });
      if (updates.manualRemain !== undefined) {
        await syncUserRemainingLeave(id);
      }
      res.status(200).json({ ...u });
    } else if (req.method === "PUT") {
      // bulk operations. currently supports { action: 'applySystem' }
      const body = req.body || {};
      if (body.action === "applySystem") {
        const staff = await prisma.user.findMany({ where: { role: { not: "최종관리자" }, active: true } });
        const allRequests = await prisma.request.findMany({ where: { status: "승인" } });
        // calculate remaining leave with carryover for each user
        const updated = [];
        for (const u of staff) {
          const userRequests = allRequests.filter(r => r.userId === u.id);
          const remain = calcRemainingLeaveWithCarryover(userRequests, u.hireDate);
          // Update manualRemain to current remaining leave
          const up = await prisma.user.update({ where: { id: u.id }, data: { manualRemain: remain } });
          updated.push(up);
        }
        res.status(200).json({ applied: updated.length });
      } else {
        res.status(400).json({ error: "Unknown action" });
      }
    } else {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      res.status(405).end();
    }
  } catch (e) {
    console.error("[/api/users]", e.message);
    res.status(500).json({ error: e.message });
  }
}
