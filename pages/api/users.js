import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";

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
        // build map of used per user
        const usedMap = {};
        for (const r of allRequests) {
          const cost = r.type === "반차" ? 0.5 : 1;
          usedMap[r.userId] = (usedMap[r.userId] || 0) + cost;
        }

        // update each staff user's manualRemain to total - used
        const updated = [];
        for (const u of staff) {
          const total = calcAnnualLeave(u.hireDate);
          const used = usedMap[u.id] || 0;
          const remain = total - used;
          // Only update manualRemain, do not overwrite any other fields
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
