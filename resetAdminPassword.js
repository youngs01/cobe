const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('admin1234', 10);
  await prisma.user.update({
    where: { loginId: 'admin' },
    data: { password: hash }
  });
  console.log('관리자 비밀번호 재설정 완료');
  await prisma.$disconnect();
})();
