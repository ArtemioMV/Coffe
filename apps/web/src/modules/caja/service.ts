import { z } from "zod";
import { cents, decimal } from "@restaurant/contracts";
import { serial, Actor, accessibleOrder, orderView } from "@/modules/pedidos/service";
import { assert } from "@/lib/http";
import { business } from "@/lib/env";
import { event } from "@/modules/notificaciones/service";

/** Datos del ticket/comanda/precuenta. Lo usan la API y la página de impresión (render en servidor). */
export async function ticketData(id: string, actor: Actor) {
  assert(["ADMIN", "WAITER", "CASHIER", "KITCHEN"].includes(actor.role), 403, "No tienes permiso para esta operación");
  const order = await accessibleOrder(id, actor, null);
  if (actor.role === "KITCHEN") assert(!["AWAITING_WAITER", "REJECTED", "CANCELLED"].includes(order.status), 403, "Comanda aún no confirmada");
  return {
    order: orderView(order, true),
    business: business(),
    payments: actor.role === "KITCHEN" ? [] : order.payments.map(p => ({ amount: p.amount.toFixed(2), method: p.method, reference: p.reference, createdAt: p.createdAt })),
    fiscal: { enabled: false, message: "Documento interno. No es comprobante de pago electrónico." }
  };
}
export async function payOrder(orderId: string, input: unknown, key: string | null, actor: Actor) {
  assert(key && /^[a-zA-Z0-9_-]{20,100}$/.test(key), 400, "Falta clave de idempotencia");
  const data = z.object({ amount: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/), method: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]), reference: z.string().trim().max(100).default("") }).parse(input);
  assert(cents(data.amount) > 0, 422, "El importe debe ser positivo");
  assert(data.method === "EFECTIVO" || data.reference.length >= 3, 422, "Indica referencia del cobro conciliado");
  return serial(async tx => {
    const previous = await tx.payment.findUnique({ where: { idempotencyKey: key } });
    if (previous) {
      assert(previous.orderId === orderId && previous.actorId === actor.id && cents(previous.amount.toFixed(2)) === cents(data.amount) && previous.method === data.method && previous.reference === data.reference, 409, "La clave corresponde a otro cobro");
      return previous;
    }
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    assert(order && ["PENDING", "PREPARING", "READY", "DELIVERED"].includes(order.status), 409, "Pedido no habilitado para cobro");
    const paid = order.payments.reduce((s, p) => s + cents(p.amount.toFixed(2)), 0);
    assert(paid + cents(data.amount) <= cents(order.total.toFixed(2)), 409, "El cobro excede el saldo");
    const payment = await tx.payment.create({ data: { orderId, actorId: actor.id, amount: decimal(cents(data.amount)), method: data.method, reference: data.reference, idempotencyKey: key } });
    if (order.customerId && paid + cents(data.amount) === cents(order.total.toFixed(2))) {
      const points = Math.floor(cents(order.total.toFixed(2)) / 100);
      await tx.pointEntry.create({ data: { userId: order.customerId, orderId, points, kind: "EARNED" } });
      await tx.user.update({ where: { id: order.customerId }, data: { points: { increment: points } } });
    }
    await event(tx, "payment.confirmed", orderId, `Pago de pedido #${order.number} registrado`, order.customerId ? [order.customerId] : []);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "payment.create", resource: payment.id } });
    return payment;
  });
}
