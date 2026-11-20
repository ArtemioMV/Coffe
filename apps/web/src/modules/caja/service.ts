import { z } from "zod";
import { cents, decimal } from "@restaurant/contracts";
import { db, Prisma } from "@restaurant/database";
import { serial, Actor, accessibleOrder, orderView, orderInclude, BILLABLE, paidCents } from "@/modules/pedidos/service";
import { assert } from "@/lib/http";
import { business } from "@/lib/env";
import { event } from "@/modules/notificaciones/service";

/** Comandas del pedido de la mesa (la primera y las que se le sumaron), en orden. */
async function accountOrders(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, parentId: true } });
  assert(order, 404, "Pedido no encontrado");
  const rootId = order.parentId ?? order.id;
  return tx.order.findMany({ where: { OR: [{ id: rootId }, { parentId: rootId }] }, include: orderInclude, orderBy: { round: "asc" } });
}

/** Datos del ticket/comanda/precuenta. Lo usan la API y la página de impresión (render en servidor). */
export async function ticketData(id: string, actor: Actor) {
  assert(["ADMIN", "WAITER", "CASHIER", "KITCHEN"].includes(actor.role), 403, "No tienes permiso para esta operación");
  const order = await accessibleOrder(id, actor, null);
  if (actor.role === "KITCHEN") assert(!["AWAITING_WAITER", "REJECTED", "CANCELLED"].includes(order.status), 403, "Comanda aún no confirmada");
  // Precuenta y ticket son del pedido completo de la mesa: todas sus comandas confirmadas. Cocina solo ve su comanda.
  const group = actor.role === "KITCHEN" ? [] : (await accountOrders(db, id)).filter(o => BILLABLE.includes(o.status));
  const total = group.reduce((sum, o) => sum + cents(o.total.toFixed(2)), 0);
  const paid = group.reduce((sum, o) => sum + paidCents(o), 0);
  return {
    order: orderView(order, true),
    account: actor.role === "KITCHEN" ? null : {
      number: order.parent?.number ?? order.number,
      orders: group.map(o => orderView(o, true)),
      total: decimal(total),
      paid: decimal(paid)
    },
    business: business(),
    payments: actor.role === "KITCHEN" ? [] : group.flatMap(o => o.payments).map(p => ({ amount: p.amount.toFixed(2), method: p.method, reference: p.reference, createdAt: p.createdAt })),
    fiscal: { enabled: false, message: "Documento interno. No es comprobante de pago electrónico." }
  };
}

/**
 * Cobro sobre el pedido completo de la mesa: el importe se reparte entre sus comandas confirmadas, de la más antigua a la más nueva.
 * Un pedido de una sola comanda se comporta igual que antes. La clave de idempotencia identifica el cobro entero.
 */
export async function payOrder(orderId: string, input: unknown, key: string | null, actor: Actor) {
  assert(key && /^[a-zA-Z0-9_-]{20,100}$/.test(key), 400, "Falta clave de idempotencia");
  const data = z.object({ amount: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/), method: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]), reference: z.string().trim().max(100).default("") }).parse(input);
  assert(cents(data.amount) > 0, 422, "El importe debe ser positivo");
  assert(data.method === "EFECTIVO" || data.reference.length >= 3, 422, "Indica referencia del cobro conciliado");
  return serial(async tx => {
    const group = await accountOrders(tx, orderId);
    const previous = await tx.payment.findMany({ where: { OR: [{ idempotencyKey: key }, { idempotencyKey: { startsWith: `${key}#` } }] }, orderBy: { createdAt: "asc" } });
    if (previous.length) {
      const ids = new Set(group.map(o => o.id));
      const same = previous.every(p => ids.has(p.orderId) && p.actorId === actor.id && p.method === data.method && p.reference === data.reference)
        && previous.reduce((sum, p) => sum + cents(p.amount.toFixed(2)), 0) === cents(data.amount);
      assert(same, 409, "La clave corresponde a otro cobro");
      return previous[0];
    }
    const billable = group.filter(o => BILLABLE.includes(o.status));
    assert(billable.length, 409, "Pedido no habilitado para cobro");
    const due = (o: (typeof billable)[number]) => cents(o.total.toFixed(2)) - paidCents(o);
    assert(cents(data.amount) <= billable.reduce((sum, o) => sum + due(o), 0), 409, "El cobro excede el saldo");

    let remaining = cents(data.amount);
    const payments: Prisma.PaymentGetPayload<object>[] = [];
    const customers = new Set<string>();
    for (const order of billable) {
      const part = Math.min(due(order), remaining);
      if (part <= 0) continue;
      const payment = await tx.payment.create({ data: { orderId: order.id, actorId: actor.id, amount: decimal(part), method: data.method, reference: data.reference, idempotencyKey: payments.length ? `${key}#${payments.length + 1}` : key } });
      payments.push(payment);
      if (order.customerId) {
        customers.add(order.customerId);
        // Puntos una sola vez por comanda, al quedar saldada.
        if (part === due(order)) {
          const points = Math.floor(cents(order.total.toFixed(2)) / 100);
          await tx.pointEntry.create({ data: { userId: order.customerId, orderId: order.id, points, kind: "EARNED" } });
          await tx.user.update({ where: { id: order.customerId }, data: { points: { increment: points } } });
        }
      }
      remaining -= part;
      if (!remaining) break;
    }
    const root = group[0];
    await event(tx, "payment.confirmed", root.id, `Pago de pedido #${root.number} registrado`, [...customers]);
    for (const payment of payments) await tx.auditLog.create({ data: { actorId: actor.id, action: "payment.create", resource: payment.id } });
    return payments[0];
  });
}
