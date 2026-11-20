import { createHmac } from "node:crypto";
import { db, Prisma, OrderStatus, Role } from "@restaurant/database";
import { orderInput, nextStatus, cents, decimal } from "@restaurant/contracts";
import { assert, HttpError } from "@/lib/http";
import { secret } from "@/lib/env";
import { digest } from "@/modules/identidad/service";
import { event, staffIds } from "@/modules/notificaciones/service";

export type Actor = { id: string; role: Role };
export const orderInclude = { items: true, attention: { include: { table: true } }, payments: true } satisfies Prisma.OrderInclude;
export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
export function orderView(order: FullOrder, internal = false) {
  return { id: order.id, number: order.number, status: order.status, version: order.version, mode: order.mode,
    guestName: order.guestName, notes: order.notes, total: order.total.toFixed(2), createdAt: order.createdAt,
    acknowledgedAt: order.acknowledgedAt, tableName: order.attention?.table.name || "—", attentionId: internal ? order.attentionId : undefined,
    paid: decimal(order.payments.reduce((sum, p) => sum + cents(p.amount.toFixed(2)), 0)),
    items: order.items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price.toFixed(2), notes: item.notes, station: item.station })) };
}
export async function serial<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(fn, { isolationLevel: "Serializable", timeout: 10000 }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 2) continue; throw e; }
  }
}
/** Descuenta insumos según receta. Se llama al confirmar (mozo) o al crear un pedido tomado por el propio mozo. */
async function consumeStock(tx: Prisma.TransactionClient, order: { id: string; number: number; items: { productId: string; name: string; quantity: number }[] }, actorId: string) {
  for (const item of order.items) {
    const product = await tx.product.findUnique({ where: { id: item.productId }, include: { recipe: true, category: true } });
    assert(product?.active && product.available && product.category.active, 409, `${item.name} no está disponible`);
    for (const recipe of product.recipe) {
      const quantity = recipe.quantity.mul(item.quantity);
      const updated = await tx.ingredient.updateMany({ where: { id: recipe.ingredientId, active: true, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
      assert(updated.count === 1, 409, `Insumos insuficientes para ${item.name}`);
      await tx.stockMovement.create({ data: { ingredientId: recipe.ingredientId, orderId: order.id, actorId, quantity: quantity.negated(), kind: "CONSUMO", reason: `Confirmación pedido #${order.number}` } });
    }
  }
}
/**
 * Crea un pedido para una mesa con atención abierta.
 * - Cliente por QR: queda «Por confirmar» y avisa al mozo de la mesa.
 * - Mozo de la mesa (o administración) tomando el pedido: ya está confirmado, descuenta insumos y va directo a cocina.
 */
export async function createOrder(input: unknown, key: string | null, customerId?: string, taker?: Actor | null) {
  assert(key && /^[a-zA-Z0-9_-]{20,100}$/.test(key), 400, "Falta una clave de idempotencia válida");
  const data = orderInput.parse(input);
  const requestHash = digest(JSON.stringify({ ...data, customerId: customerId || null }));
  const token = createHmac("sha256", secret()).update(`order:${key}`).digest("base64url");
  return serial(async tx => {
    const previous = await tx.order.findUnique({ where: { idempotencyKey: key }, include: orderInclude });
    if (previous) {
      assert(previous.requestHash === requestHash, 409, "La clave ya corresponde a otro pedido");
      return { order: orderView(previous), token };
    }
    const table = await tx.diningTable.findUnique({ where: { qrToken: data.tableToken } });
    assert(table?.active, 404, "Esta mesa no está disponible");
    const attention = await tx.attention.findFirst({ where: { tableId: table.id, closedAt: null } });
    assert(attention, 409, "Pide al mozo que abra la atención de tu mesa");
    if (taker?.role === "WAITER") assert(attention.waiterId === taker.id, 403, "Esta mesa la atiende otro mozo");
    const staff = taker && ["ADMIN", "WAITER"].includes(taker.role) ? taker : null;
    const ids = data.items.map(i => i.productId);
    assert(new Set(ids).size === ids.length, 422, "Agrupa las cantidades de cada plato");
    const products = await tx.product.findMany({ where: { id: { in: ids }, active: true, available: true, category: { active: true } } });
    assert(products.length === ids.length, 409, "Un plato ya no está disponible. Revisa la carta.");
    const items = data.items.map(item => { const p = products.find(p => p.id === item.productId)!; assert(cents(item.expectedPrice) === cents(p.price.toFixed(2)), 409, `Cambió el precio de ${p.name}. Actualiza la carta y revisa tu pedido.`); return { productId: p.id, name: p.name, price: p.price, quantity: item.quantity, notes: item.notes, station: p.station }; });
    const total = items.reduce((sum, item) => sum + cents(item.price.toFixed(2)) * item.quantity, 0);
    const history = staff
      ? { actorId: staff.id, status: "PENDING", reason: "Pedido tomado por el mozo; enviado a cocina" }
      : { status: "AWAITING_WAITER", reason: "Pedido por QR; pendiente de confirmación" };
    const order = await tx.order.create({ data: { attentionId: attention.id, customerId, guestName: data.guestName, notes: data.notes, total: decimal(total), idempotencyKey: key, requestHash, trackingHash: digest(token), status: staff ? "PENDING" : "AWAITING_WAITER", items: { create: items }, history: { create: history } }, include: orderInclude });
    if (staff) {
      await consumeStock(tx, order, staff.id);
      await event(tx, "order.confirm", order.id, `Pedido #${order.number}: comanda nueva`, await staffIds(tx, ["ADMIN", "KITCHEN"]), `Mesa ${table.name}`);
    } else {
      await event(tx, "order.created", order.id, `Mesa ${table.name}: pedido #${order.number} por confirmar`, [attention.waiterId, ...await staffIds(tx, ["ADMIN"])], "Revisa el pedido antes de enviarlo a cocina.");
    }
    return { order: orderView(order, Boolean(staff)), token };
  });
}
export async function accessibleOrder(id: string, actor: Actor | null, token: string | null) {
  const order = await db.order.findUnique({ where: { id }, include: orderInclude });
  assert(order, 404, "Pedido no encontrado");
  const guest = token && digest(token) === order.trackingHash;
  const owner = actor?.role === "CUSTOMER" && actor.id === order.customerId;
  const staff = actor && actor.role !== "CUSTOMER" && (actor.role !== "WAITER" || order.attention?.waiterId === actor.id);
  assert(guest || owner || staff, 404, "Pedido no encontrado");
  if (!guest && !owner && actor?.role === "KITCHEN") assert(["PENDING", "PREPARING", "READY", "DELIVERED"].includes(order.status), 404, "Pedido no encontrado");
  return order;
}
export async function changeOrder(id: string, action: string, version: number, reason: string, actor: Actor) {
  return serial(async tx => {
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    assert(order, 404, "Pedido no encontrado");
    if (actor.role === "WAITER") assert(order.attention?.waiterId === actor.id, 403, "Este pedido corresponde a otro mozo");
    assert(order.version === version, 409, "El pedido cambió. Actualiza antes de continuar.");
    let status: string;
    try { status = nextStatus(order.status, action, actor.role); } catch (e) { throw new HttpError(409, (e as Error).message); }
    if (["reject", "cancel"].includes(action)) assert(reason.trim().length >= 5, 422, "Indica el motivo");
    if (action === "cancel") assert(order.payments.length === 0, 409, "Resuelve el pago antes de cancelar");
    if (action === "acknowledge") assert(!order.acknowledgedAt, 409, "La recogida ya fue confirmada");
    // El consumo se descuenta al confirmar, nunca al enviar una solicitud por QR.
    if (action === "confirm") await consumeStock(tx, order, actor.id);
    // Antes de comenzar la preparación se pueden devolver los insumos reservados.
    if (action === "cancel" && order.status === "PENDING") {
      const movements = await tx.stockMovement.findMany({ where: { orderId: id, kind: "CONSUMO" } });
      for (const movement of movements) {
        await tx.ingredient.update({ where: { id: movement.ingredientId }, data: { stock: { increment: movement.quantity.abs() } } });
        await tx.stockMovement.create({ data: { ingredientId: movement.ingredientId, orderId: id, actorId: actor.id, quantity: movement.quantity.abs(), kind: "DEVOLUCION", reason: `Cancelación antes de preparar #${order.number}` } });
      }
    }
    const updated = await tx.order.updateMany({ where: { id, version }, data: { status: status as OrderStatus, version: { increment: 1 }, ...(action === "acknowledge" ? { acknowledgedAt: new Date() } : {}) } });
    assert(updated.count === 1, 409, "El pedido cambió");
    await tx.orderHistory.create({ data: { orderId: id, actorId: actor.id, status: action === "acknowledge" ? "ACKNOWLEDGED" : status, reason } });
    const recipients = action === "confirm" ? await staffIds(tx, ["ADMIN", "KITCHEN"]) : [order.attention?.waiterId, ...await staffIds(tx, ["ADMIN"])].filter((v): v is string => !!v);
    if (order.customerId) recipients.push(order.customerId);
    const title = action === "ready" ? `Mesa ${order.attention?.table.name}: pedido #${order.number} listo` : `Pedido #${order.number}: ${action === "confirm" ? "comanda nueva" : status.toLowerCase()}`;
    await event(tx, `order.${action}`, id, title, recipients, reason);
    if (["acknowledge", "deliver", "reject", "cancel"].includes(action)) await tx.notification.updateMany({ where: { orderId: id, acknowledgedAt: null }, data: { acknowledgedAt: new Date() } });
    const fresh = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    return orderView(fresh, true);
  });
}
