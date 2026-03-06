// seed default admin user for Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { loginId: 'admin' } });
  if (!admin) {
    await prisma.user.create({
      data: {
        loginId: 'admin',
        password: 'admin1234', // *실제 서비스에서는 해시 처리하세요*
        name: '시스템관리자',
        role: '최종관리자',
        hireDate: new Date('2020-01-01'),
        active: true,
      },
    });
    console.log('최고관리자 계정 생성: admin/admin1234');
  } else {
    console.log('최고관리자 계정 이미 존재');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
