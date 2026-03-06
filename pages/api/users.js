import pool from "../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // 원하는 role 순서대로 정렬
      const roleOrder = ["교사", "보조교사", "연장교사", "야간반 연장 교사"];
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM \"User\" ORDER BY CASE role WHEN '교사' THEN 1 WHEN '보조교사' THEN 2 WHEN '연장교사' THEN 3 WHEN '야간반 연장 교사' THEN 4 ELSE 5 END, name ASC");
        const users = result.rows;
        res.status(200).json(users.map((u) => ({ ...u, pw: u.password })));
      } finally {
        client.release();
      }
    } else {
      res.status(405).json({ error: "Method not implemented in pg version" });
    }
  } catch (e) {
    console.error("[/api/users]", e.message);
    res.status(500).json({ error: e.message });
  }
}
