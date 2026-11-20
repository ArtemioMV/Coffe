import { createHmac } from "node:crypto";
import { db, Prisma, OrderStatus, Role } from "@restaurant/database";
import { orderInput, nextStatus, cents, decimal } from "@restaurant/contracts";
import { assert, HttpError } from "@/lib/http";
import { secret } from "@/lib/env";
import { digest } from "@/modules/identidad/service";
import { event, staffIds } from "@/modules/notificaciones/service";

export type Actor = { id: string; role: Role };
export const orderInclude = { items: true, attention: { include: { table: true } }, payments: true, parent: { select: { number: true } } } satisfies Prisma.OrderInclude;
export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
/** Estados que forman parte de la cuenta: confirmados por el mozo y no anulados. */
export const BILLABLE: OrderStatus[] = ["PENDING", "PREPARING", "READY", "DELIVERED"];
export const paidCents = (order: { payments: { amount: Prisma.Decimal }[] }) => order.payments.reduce((sum, p) => sum + cents(p.amount.toFixed(2)), 0);
/** «#12» para el pedido; «#12 · comanda 2» para lo que se sumó después. */
export const orderLabel = (order: { number: number; round: number; parent?: { number: number } | null }) =>
  order.round > 1 && order.parent ? `#${order.parent.number} · comanda ${order.round}` : `#${order.number}`;
/**
 * Pedido abierto de la atención: el último pedido que aún tiene algo por cobrar (o por confirmar).
 * Mientras exista, lo nuevo que pida la mesa se suma como comanda; cobrado por completo, se abre otro.
 */
async function openAccount(tx: Prisma.TransactionClient, attentionId: string) {
  const orders = await tx.order.findMany({ where: { attentionId }, include: { payments: true }, orderBy: { createdAt: "asc" } });
  const root = [...orders].reverse().find(order => !order.parentId);
  if (!root) return null;
  const group = orders.filter(order => order.id === root.id || order.parentId === root.id);
  const pending = group.some(order => !["REJECTED", "CANCELLED"].includes(order.status) && paidCents(order) < cents(order.total.toFixed(2)));
  return pending ? { root, round: Math.max(...group.map(order => order.round)) + 1 } : null;
}
export function orderView(order: FullOrder, internal = false) {
  return { id: order.id, number: order.number, accountId: order.parentId ?? order.id, accountNumber: order.parent?.number ?? order.number, round: order.round, status: order.status, version: order.version, mode: order.mode,
    guestName: order.guestName, notes: order.notes, total: order.total.toFixed(2), createdAt: order.createdAt,
    acknowledgedAt: order.acknowledgedAt, tableName: order.attention?.table.name || "—", attentionId: internal ? order.attentionId : undefined,
    paid: decimal(paidCents(order)),
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
    const account = await openAccount(tx, attention.id);
    const order = await tx.order.create({ data: { attentionId: attention.id, parentId: account?.root.id, round: account?.round ?? 1, customerId, guestName: data.guestName, notes: data.notes, total: decimal(total), idempotencyKey: key, requestHash, trackingHash: digest(token), status: staff ? "PENDING" : "AWAITING_WAITER", items: { create: items }, history: { create: history } }, include: orderInclude });
    if (staff) {
      await consumeStock(tx, order, staff.id);
      // Cocina recibe la comanda; si la tomó administración, también se entera el mozo de la mesa. Nadie se avisa a sí mismo.
      const recipients = [attention.waiterId, ...await staffIds(tx, ["ADMIN", "KITCHEN"])].filter(id => id !== staff.id);
      await event(tx, "order.confirm", order.id, `Pedido ${orderLabel(order)}: comanda nueva`, recipients, `Mesa ${table.name}`);
    } else {
      await event(tx, "order.created", order.id, `Mesa ${table.name}: pedido ${orderLabel(order)} por confirmar`, [attention.waiterId, ...await staffIds(tx, ["ADMIN"])], "Revisa el pedido antes de enviarlo a cocina.");
    }
    return { order: orderView(order, Boolean(staff)), token };
  });
}
export async function listPanelOrders(actor: Actor) {
  const where: Prisma.OrderWhereInput = actor.role === "CUSTOMER" ? { customerId: actor.id } : actor.role === "WAITER" ? { attention: { waiterId: actor.id } } : actor.role === "KITCHEN" ? { status: { in: ["PENDING", "PREPARING", "READY"] } } : {};
  // Una atención abierta debe seguir visible aunque haya cien comandas posteriores.
  const staffHistory = ["ADMIN", "WAITER", "CASHIER"].includes(actor.role);
  let scope = where;
  if (staffHistory) {
    const recent = await db.order.findMany({ where, select: { id: true, parentId: true }, orderBy: { number: "desc" }, take: 100 });
    const accounts = recent.map(order => order.parentId ?? order.id);
    scope = { AND: [where, { OR: [{ attention: { closedAt: null } }, { id: { in: accounts } }, { parentId: { in: accounts } }] }] };
  }
  return db.order.findMany({ where: scope, include: orderInclude, orderBy: { number: "desc" }, take: actor.role === "CUSTOMER" ? 100 : undefined });
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
    // Confirmar o rechazar resuelve la solicitud «por confirmar»: ese aviso se cierra antes de crear los nuevos (la comanda de cocina queda abierta).
    if (["confirm", "reject"].includes(action)) await tx.notification.updateMany({ where: { orderId: id, acknowledgedAt: null }, data: { acknowledgedAt: new Date() } });
    const recipients = (action === "confirm" ? await staffIds(tx, ["ADMIN", "KITCHEN"]) : [order.attention?.waiterId, ...await staffIds(tx, ["ADMIN"])])
      .filter((v): v is string => !!v && v !== actor.id); // nadie recibe aviso de su propia acción
    if (order.customerId) recipients.push(order.customerId);
    const title = action === "ready" ? `Mesa ${order.attention?.table.name}: pedido ${orderLabel(order)} listo` : `Pedido ${orderLabel(order)}: ${action === "confirm" ? "comanda nueva" : status.toLowerCase()}`;
    await event(tx, `order.${action}`, id, title, recipients, reason);
    if (["acknowledge", "deliver", "reject", "cancel"].includes(action)) await tx.notification.updateMany({ where: { orderId: id, acknowledgedAt: null }, data: { acknowledgedAt: new Date() } });
    const fresh = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    return orderView(fresh, true);
  });
}
