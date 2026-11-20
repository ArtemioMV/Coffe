import { Prisma, db } from "@restaurant/database";

export async function event(tx: Prisma.TransactionClient, type: string, aggregateId: string, title: string, recipientIds: string[], body = "") {
  const record = await tx.outboxEvent.create({ data: { type, aggregateId, payload: { title, body, recipients: recipientIds } } });
  if (recipientIds.length) await tx.notification.createMany({ data: [...new Set(recipientIds)].map(userId => ({ eventId: record.id, userId, orderId: type.startsWith("order.") ? aggregateId : null, title, body })), skipDuplicates: true });
  return record;
}
export async function staffIds(tx: Prisma.TransactionClient, roles: ("ADMIN" | "WAITER" | "KITCHEN" | "CASHIER")[]) {
  return (await tx.user.findMany({ where: { active: true, role: { in: roles } }, select: { id: true } })).map(u => u.id);
}
export async function notifications(userId: string) {
  return db.notification.findMany({ where: { userId }, orderBy: { sequence: "desc" }, take: 100 });
}
