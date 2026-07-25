const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    return !info.isWeekend && !holidays.includes(yyyyMMdd) ? 1 : 0;
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
  if (years < 1) return Math.min(months, 11);
  const extra = Math.floor((years - 1) / 2);
  return Math.min(15 + extra, 25);
}

function getLeaveYearStart(hireDate, refDate = new Date()) {
  const hire = new Date(hireDate);
  const now = new Date(refDate);
  const start = new Date(hire);
  start.setFullYear(now.getFullYear());
  start.setHours(0, 0, 0, 0);
  if (start > now) start.setFullYear(now.getFullYear() - 1);
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
  const holidays = [];
  return requests
    .filter((r) => r.status === '승인')
    .filter((r) => isRequestInRange(r, currentStart, nextStart))
    .reduce((acc, r) => acc + requestCost(r, holidays), 0);
}

function calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, refDate = new Date()) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, refDate);
  const holidays = [];
  return requests
    .filter((r) => r.status === '승인')
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

(async () => {
  try {
    const userId = process.argv[2] || 'cmm8m3yp40000ta5we96fm5i2';
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, hireDate: true } });
    const requests = await prisma.request.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { status: true, date: true, startDate: true, endDate: true, halfDay: true },
    });
    console.log('hireDate', user.hireDate);
    console.log('requests', JSON.stringify(requests, null, 2));
    console.log('remaining', calcRemainingLeaveWithCarryover(requests, user.hireDate));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
