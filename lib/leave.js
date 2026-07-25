import prisma from "./prisma";

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
  }

  const extra = Math.floor((years - 1) / 2);
  return Math.min(15 + extra, 25);
}

function normalizeRemain(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Number(Math.max(0, numeric).toFixed(1));
}

function normalizeStatus(value) {
  return typeof value === "string" ? value.trim() : value;
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
    if (normalizeStatus(r.status) === "승인" && isRequestInRange(r, currentStart, nextStart)) {
      totalCost += await requestCost(r, prismaClient);
    }
  }
  return totalCost;
}

async function calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, refDate = new Date(), prismaClient) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, refDate);
  let totalCost = 0;
  for (const r of requests) {
    if (normalizeStatus(r.status) === "승인" && isRequestInRange(r, lastStart, currentStart)) {
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

async function syncUserRemainingLeave(userId, prismaClient = prisma) {
  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const requests = await prismaClient.request.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const approvedRequests = requests.filter((r) => normalizeStatus(r.status) === "승인");
  const calculatedRemain = await calcRemainingLeaveWithCarryover(approvedRequests, user.hireDate, prismaClient);
  const newRemain = normalizeRemain(calculatedRemain, user.manualRemain ?? 0);

  await prismaClient.user.update({
    where: { id: user.id },
    data: { manualRemain: newRemain },
  });

  return newRemain;
}

export {
  getHolidaySet,
  getDayInfo,
  requestCost,
  calcAnnualLeave,
  normalizeRemain,
  getLeaveYearStart,
  getLeaveYearRanges,
  isRequestInRange,
  calcApprovedLeaveForLeaveYear,
  calcApprovedLeaveForPreviousLeaveYear,
  calcRemainingLeaveWithCarryover,
  syncUserRemainingLeave,
};

export default {
  getHolidaySet,
  getDayInfo,
  requestCost,
  calcAnnualLeave,
  normalizeRemain,
  getLeaveYearStart,
  getLeaveYearRanges,
  isRequestInRange,
  calcApprovedLeaveForLeaveYear,
  calcApprovedLeaveForPreviousLeaveYear,
  calcRemainingLeaveWithCarryover,
  syncUserRemainingLeave,
};
