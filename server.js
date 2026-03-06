// simple Express API using Prisma
import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const prisma = new PrismaClient();
app.use(express.json());

// users
app.get("/api/users", async (req, res) => {
  try {
    let users = await prisma.user.findMany({ include: { requests: true } });
    // if no users exist, create default admin account
    if (users.length === 0) {
      await prisma.user.create({
        data: {
          loginId: 'admin',
          password: 'admin1234', // production: hash this!
          name: '시스템관리자',
          role: '최종관리자',
          hireDate: new Date('2008-05-23'),
          active: true,
        },
      });
      users = await prisma.user.findMany({ include: { requests: true } });
      console.log('Seeded default admin user');
    }
    res.json(users);
  } catch (err) {
    console.error('Error fetching users', err);
    res.status(500).json({ error: 'db-error' });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/users", async (req, res) => {
  const { id } = req.query;
  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

// requests
app.get("/api/requests", async (req, res) => {
  const calls = await prisma.request.findMany();
  res.json(calls);
});

app.post("/api/requests", async (req, res) => {
  try {
    const r = await prisma.request.create({ data: req.body });
    res.status(201).json(r);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch("/api/requests", async (req, res) => {
  const { id } = req.query;
  const updates = req.body;
  const r = await prisma.request.update({ where: { id }, data: updates });
  res.json(r);
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("API server listening on", port));
