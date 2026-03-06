import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = 'cmm8m88o00000l204n07vgr8m';
  try {
    const updated = await prisma.user.update({ where: { id }, data: { manualRemain: 3 } });
    console.log('updated', updated);
  } catch (e) {
    console.error('error', e);
  }
}

main()
  .catch((e) => console.error('fatal', e))
  .finally(() => prisma.$disconnect());
