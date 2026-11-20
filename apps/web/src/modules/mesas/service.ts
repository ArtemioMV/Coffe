import { db, Role } from "@restaurant/database";
import { assert } from "@/lib/http";
import { serial, Actor } from "@/modules/pedidos/service";
import { cents } from "@restaurant/contracts";

export async function openTable(tableId: string, actor: Actor) {
  return serial(async tx => {
    const table = await tx.diningTable.findUnique({ where: { id: tableId } });
    assert(table?.active, 409, "Mesa desactivada o inexistente");
    const existing = await tx.attention.findFirst({ where: { tableId, closedAt: null } });
    assert(!existing, 409, "La mesa ya tiene una atención abierta");
    return tx.attention.create({ data: { tableId, waiterId: actor.id } });
  });
}
export async function closeTable(tableId: string, actor: Actor) {
  return serial(async tx => {
    const attention = await tx.attention.findFirst({ where: { tableId, closedAt: null }, include: { orders: { include: { payments: true } } } });
    assert(attention, 404, "La mesa no tiene atención abierta");
    assert(actor.role === Role.ADMIN || attention.waiterId === actor.id, 403, "Esta mesa corresponde a otro mozo");
    const complete = attention.orders.every(o => ["REJECTED", "CANCELLED"].includes(o.status) || (o.status === "DELIVERED" && o.payments.reduce((s, p) => s + cents(p.amount.toFixed(2)), 0) === cents(o.total.toFixed(2))));
    assert(complete, 409, "Hay pedidos pendientes de entrega o pago");
    return tx.attention.update({ where: { id: attention.id }, data: { closedAt: new Date() } });
  });
}
export async function tableList() {
  return db.diningTable.findMany({ orderBy: [{ zone: "asc" }, { name: "asc" }], include: { attentions: { where: { closedAt: null }, include: { waiter: { select: { id: true, name: true } } } } } });
}
