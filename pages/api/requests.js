import pool from "../../lib/db";

export default async function handler(req, res) {
  try {
    const client = await pool.connect();
    if (req.method === "GET") {
      const result = await client.query('SELECT * FROM "Request"');
      res.status(200).json(result.rows);
    } else if (req.method === "POST") {
      const { userId, type, reason, status, date, startDate, endDate, halfDay } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!type) return res.status(400).json({ error: "type required" });
      if (!reason) return res.status(400).json({ error: "reason required" });
      if (!status) return res.status(400).json({ error: "status required" });
      let query, values;
      if (type === "연차") {
        if (!startDate) return res.status(400).json({ error: "startDate required for 연차" });
        if (!endDate) return res.status(400).json({ error: "endDate required for 연차" });
        query = 'INSERT INTO "Request" (userId, type, reason, status, startDate, endDate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        values = [userId, type, reason, status, startDate, endDate];
      } else if (type === "반차") {
        if (!date) return res.status(400).json({ error: "date required for 반차" });
        if (!halfDay) return res.status(400).json({ error: "halfDay required for 반차" });
        query = 'INSERT INTO "Request" (userId, type, reason, status, date, halfDay) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        values = [userId, type, reason, status, date, halfDay];
      } else {
        return res.status(400).json({ error: "type must be 연차 or 반차" });
      }
      const result = await client.query(query, values);
      res.status(201).json(result.rows[0]);
    } else if (req.method === "PATCH") {
      const { id } = req.query;
      const updates = req.body;
      // 동적으로 업데이트 쿼리 생성
      const fields = [];
      const values = [];
      let idx = 1;
      for (const key of ["type","reason","status","date","startDate","endDate","halfDay","approvedBy","approvedAt"]) {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${idx}`);
          values.push(updates[key]);
          idx++;
        }
      }
      if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
      values.push(id);
      const query = `UPDATE "Request" SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
      const result = await client.query(query, values);
      res.status(200).json(result.rows[0]);
    } else if (req.method === "DELETE") {
      const { id } = req.query;
      await client.query('DELETE FROM "Request" WHERE id = $1', [id]);
      res.status(204).end();
    } else {
      res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
      res.status(405).end();
    }
    client.release();
  } catch (e) {
    console.error("[/api/requests]", e.message);
    console.error("[/api/requests] full error:", e);
    res.status(500).json({ error: e.message, details: e.toString() });
  }
}
