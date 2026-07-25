const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const userId = process.argv[2] || 'cmm8m3yp40000ta5we96fm5i2';
    const requests = await prisma.request.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, type: true, date: true, startDate: true, endDate: true, halfDay: true, createdAt: true },
    });
    console.log(JSON.stringify(requests, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
