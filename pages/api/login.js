import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ error: "Missing loginId or password" });
  }
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  // 보안상 password 필드는 제거
  const { password: _, ...safeUser } = user;
  res.status(200).json(safeUser);
}
