import prisma from './lib/prisma.js';
import { syncUserRemainingLeave, calcRemainingLeaveWithCarryover } from './lib/leave.js';

const user = await prisma.user.findUnique({ where: { loginId: 'haeran' } });
console.log('user', { id: user.id, loginId: user.loginId, manualRemain: user.manualRemain, hireDate: user.hireDate.toISOString() });
const requests = await prisma.request.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
console.log('requests', requests.map(r => ({ id: r.id, status: r.status, date: r.date?.toISOString?.(), startDate: r.startDate?.toISOString?.(), endDate: r.endDate?.toISOString?.(), halfDay: r.halfDay }))); 
const calc = await calcRemainingLeaveWithCarryover(requests.filter(r => r.status === '승인'), user.hireDate, prisma);
console.log('calc', calc);
const updated = await syncUserRemainingLeave(user.id, prisma);
console.log('sync updated', updated);
const after = await prisma.user.findUnique({ where: { id: user.id } });
console.log('after', after.manualRemain);
await prisma.$disconnect();
