import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";

const HOLIDAYS = [
  "2026-01-01",
  "2026-02-18", "2026-02-19", "2026-02-20",
  "2026-03-01",
  "2026-05-05",
  "2026-05-15",
  "2026-06-06",
  "2026-08-15",
  "2026-09-23", "2026-09-24", "2026-09-25",
  "2026-10-03",
  "2026-10-09",
  "2026-12-25",
];

function getDayInfo(date) {
  const day = new Date(date).getDay();
  return { isWeekend: day === 0 || day === 6 };
}

function requestCost(r) {
  if (r.halfDay) return 0.5;
  const start = r.startDate ? new Date(r.startDate) : (r.date ? new Date(r.date) : null);
  const end = r.endDate ? new Date(r.endDate) : (r.date ? new Date(r.date) : null);
  if (start && end) {
    let count = 0;
    let d = new Date(start);
    while (d <= end) {
      const yyyyMMdd = d.toISOString().slice(0, 10);
      const info = getDayInfo(d);
      if (!info.isWeekend && !HOLIDAYS.includes(yyyyMMdd)) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }
  const singleDate = r.date || r.startDate;
  if (singleDate) {
    const d = new Date(singleDate);
    const yyyyMMdd = d.toISOString().slice(0, 10);
    const info = getDayInfo(d);
    return (!info.isWeekend && !HOLIDAYS.includes(yyyyMMdd)) ? 1 : 0;
  }
  return 1;
}

function calcRemainingLeaveWithCarryover(requests, hireDate) {
  const hire = new Date(hireDate);
  const currentYear = hire.getFullYear() + Math.floor((new Date().getFullYear() - hire.getFullYear()));
  const lastYear = currentYear - 1;
  
  // 작년 총 연차 계산
  const lastYearHire = new Date(hire);
  lastYearHire.setFullYear(lastYear);
  const lastYearTotal = calcAnnualLeave(lastYearHire);
  
  // 작년 사용 연차
  const lastYearUsed = requests
    .filter((r) => r.status === "승인")
    .filter((r) => {
      const reqDate = r.date || r.startDate;
      if (!reqDate) return false;
      const reqYear = new Date(reqDate).getFullYear();
      return reqYear === lastYear;
    })
    .reduce((acc, r) => acc + requestCost(r), 0);
    
  // 작년 남은 연차 (이월될 값)
  const lastYearRemain = lastYearTotal - lastYearUsed;
  
  // 올해 총 연차 + 작년 이월
  const currentYearTotal = calcAnnualLeave(hireDate);
  const adjustedTotal = currentYearTotal + lastYearRemain;
  
  // 올해 사용 연차
  const currentYearUsed = requests
    .filter((r) => r.status === "승인")
    .filter((r) => {
      const reqDate = r.date || r.startDate;
      if (!reqDate) return false;
      const reqYear = new Date(reqDate).getFullYear();
      return reqYear === currentYear;
    })
    .reduce((acc, r) => acc + requestCost(r), 0);
    
  return Math.max(0, adjustedTotal - currentYearUsed);
}

export default async function handler(req, res) {
  try {
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
      // update a single user (e.g. manualRemain)
      const { id } = req.query;
      const updates = { ...req.body };
      // password 해시
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      // if client sends manualRemain as string, convert to number
      if (updates.manualRemain !== undefined && updates.manualRemain !== null) {
        const v = parseFloat(updates.manualRemain);
        updates.manualRemain = Number.isFinite(v) ? v : null;
      }
      const u = await prisma.user.update({ where: { id }, data: updates });
      res.status(200).json({ ...u });
    } else if (req.method === "PUT") {
      // bulk operations. currently supports { action: 'applySystem' }
      const body = req.body || {};
      if (body.action === "applySystem") {
        // helper to compute annual leave (same rules as frontend)
        function calcAnnualLeave(hireDate) {
          const hire = new Date(hireDate);
          const today = new Date();
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
