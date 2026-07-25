import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year + 1}-01-01`);
      const items = await prisma.holiday.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: 'asc' } });
      // return as yyyy-mm-dd strings
      const holidays = items.map((h) => ({ id: h.id, date: h.date.toISOString().slice(0, 10), label: h.label }));
      res.status(200).json({ year, holidays });
    } else if (req.method === "POST") {
      // create single or batch
      const body = req.body || {};
      if (Array.isArray(body.items) && body.items.length > 0) {
        // items: [{date:'YYYY-MM-DD', label}, ...]
        const data = body.items.map(it => ({ date: new Date(it.date), label: it.label || null }));
        // use createMany to skip duplicates
        const created = await prisma.holiday.createMany({ data, skipDuplicates: true });
        res.status(201).json({ created: created.count });
      } else {
        const { date, label } = body;
        if (!date) return res.status(400).json({ error: 'date required' });
        const d = new Date(date);
        const created = await prisma.holiday.create({ data: { date: d, label } });
        res.status(201).json({ id: created.id, date: created.date.toISOString().slice(0,10), label: created.label });
      }
    } else if (req.method === "PATCH") {
      // update { id, date?, label? }
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      const updates = {};
      if (req.body.date) updates.date = new Date(req.body.date);
      if (req.body.label !== undefined) updates.label = req.body.label;
      const up = await prisma.holiday.update({ where: { id }, data: updates });
      res.status(200).json({ id: up.id, date: up.date.toISOString().slice(0,10), label: up.label });
    } else if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      await prisma.holiday.delete({ where: { id } });
      res.status(204).end();
    } else {
      res.setHeader('Allow', ['GET','POST','PATCH','DELETE']);
      res.status(405).end();
    }
  } catch (e) {
    console.error("[/api/holidays]", e.message);
    res.status(500).json({ error: e.message });
  }
}
