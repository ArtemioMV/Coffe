import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@restaurant/database";
import { accessibleOrder, changeOrder, createOrder } from "@/modules/pedidos/service";
import { closeTable } from "@/modules/mesas/service";
import { expectStatus, ingredient, key, openTable, orderBody, product, statusOf, user } from "./helpers";

type Actor = Awaited<ReturnType<typeof user>>;
let admin: Actor, waiter: Actor, otherWaiter: Actor, kitchen: Actor;

beforeAll(async () => {
  [admin, waiter, otherWaiter, kitchen] = await Promise.all([user("ADMIN"), user("WAITER"), user("WAITER"), user("KITCHEN")]);
});
afterAll(async () => { await db.$disconnect(); });

describe("crear pedido por QR", () => {
  it("calcula el total en servidor y guarda snapshot, historial, outbox y avisos en una transacción", async () => {
    const plato = await product("18.50");
    const table = await openTable(waiter.id);
    const { order } = await createOrder(orderBody(table.qrToken, [plato], 3), key());

    expect(order.status).toBe("AWAITING_WAITER");
    expect(order.total).toBe("55.50");
    expect(order.items[0]).toMatchObject({ name: plato.name, price: "18.50", quantity: 3 });
    expect(await db.orderHistory.count({ where: { orderId: order.id } })).toBe(1);
    const outbox = await db.outboxEvent.findMany({ where: { aggregateId: order.id } });
    expect(outbox.map(e => e.type)).toEqual(["order.created"]);
    const notified = (await db.notification.findMany({ where: { orderId: order.id } })).map(n => n.userId);
    expect(notified).toContain(waiter.id);
    expect(notified).toContain(admin.id);
  });

  it("repetir la misma clave devuelve el mismo pedido; otra clave con otro contenido no se confunde", async () => {
    const plato = await product();
    const table = await openTable(waiter.id);
    const k = key();
    const first = await createOrder(orderBody(table.qrToken, [plato]), k);
    const again = await createOrder(orderBody(table.qrToken, [plato]), k);
    expect(again.order.id).toBe(first.order.id);
    await expectStatus(createOrder(orderBody(table.qrToken, [plato], 2), k), 409);
    expect(await db.order.count({ where: { idempotencyKey: k } })).toBe(1);
  });

  it("doble clic simultáneo con la misma clave crea un solo pedido", async () => {
    const plato = await product();
    const table = await openTable(waiter.id);
    const k = key();
    const [a, b] = await Promise.all([createOrder(orderBody(table.qrToken, [plato]), k), createOrder(orderBody(table.qrToken, [plato]), k)]);
    // Ambos clics reciben el mismo pedido: el choque serializable se reintenta y encuentra el anterior.
    expect(b.order.id).toBe(a.order.id);
    expect(await db.order.count({ where: { idempotencyKey: k } })).toBe(1);
  });

  it("rechaza precio cambiado, plato agotado y mesa sin atención", async () => {
    const plato = await product("20.00");
    const table = await openTable(waiter.id);
    await expectStatus(createOrder({ ...orderBody(table.qrToken, [plato]), items: [{ productId: plato.id, quantity: 1, expectedPrice: "19.00" }] }, key()), 409);
    await db.product.update({ where: { id: plato.id }, data: { available: false } });
    await expectStatus(createOrder(orderBody(table.qrToken, [plato]), key()), 409);
    const closed = await db.diningTable.create({ data: { name: `Sin-${Date.now()}`, qrToken: `qr_${key()}` } });
    await expectStatus(createOrder(orderBody(closed.qrToken, [await product()]), key()), 409);
  });
});

describe("pedido tomado por el mozo", () => {
  it("el mozo de la mesa lo envía directo a cocina: confirmado, descuenta insumos y avisa a cocina", async () => {
    const papa = await ingredient("5.000");
    const plato = await product("20.00", [{ ingredientId: papa.id, quantity: "0.500" }]);
    const table = await openTable(waiter.id);
    const { order } = await createOrder(orderBody(table.qrToken, [plato], 2), key(), undefined, waiter);

    expect(order.status).toBe("PENDING");
    expect((await db.ingredient.findUniqueOrThrow({ where: { id: papa.id } })).stock.toFixed(3)).toBe("4.000");
    const history = await db.orderHistory.findMany({ where: { orderId: order.id } });
    expect(history).toMatchObject([{ status: "PENDING", actorId: waiter.id }]);
    const notified = (await db.notification.findMany({ where: { orderId: order.id } })).map(n => n.userId);
    expect(notified).toContain(kitchen.id);
    expect(notified).not.toContain(waiter.id);
    // Ya confirmado: no se puede volver a confirmar, cocina puede empezar.
    await expectStatus(changeOrder(order.id, "confirm", order.version, "", waiter), 409);
    expect((await changeOrder(order.id, "prepare", order.version, "", kitchen)).status).toBe("PREPARING");
  });

  it("otro mozo no puede tomar pedidos de una mesa ajena", async () => {
    const table = await openTable(waiter.id);
    await expectStatus(createOrder(orderBody(table.qrToken, [await product()]), key(), undefined, otherWaiter), 403);
  });

  it("si faltan insumos no se crea nada", async () => {
    const sal = await ingredient("0.100");
    const plato = await product("10.00", [{ ingredientId: sal.id, quantity: "1.000" }]);
    const table = await openTable(waiter.id);
    const k = key();
    await expectStatus(createOrder(orderBody(table.qrToken, [plato]), k, undefined, waiter), 409);
    expect(await db.order.count({ where: { idempotencyKey: k } })).toBe(0);
  });

  it("cocina o caja no confirman por la carta: su pedido queda por confirmar", async () => {
    const table = await openTable(waiter.id);
    const { order } = await createOrder(orderBody(table.qrToken, [await product()]), key(), undefined, kitchen);
    expect(order.status).toBe("AWAITING_WAITER");
  });
});

describe("transiciones", () => {
  async function newOrder(waiterId = waiter.id) {
    const table = await openTable(waiterId);
    const { order } = await createOrder(orderBody(table.qrToken, [await product()]), key());
    return { table, order };
  }

  it("dos dispositivos con la misma versión: solo uno gana y el otro recibe 409", async () => {
    const { order } = await newOrder();
    const results = await Promise.allSettled([
      changeOrder(order.id, "confirm", 0, "", waiter),
      changeOrder(order.id, "confirm", 0, "", admin)
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
    expect(statusOf(rejected.reason)).toBe(409);
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh).toMatchObject({ status: "PENDING", version: 1 });
    expect(await db.orderHistory.count({ where: { orderId: order.id, status: "PENDING" } })).toBe(1);
  });

  it("un mozo no puede tocar pedidos de otra mesa", async () => {
    const { order } = await newOrder(otherWaiter.id);
    await expectStatus(changeOrder(order.id, "confirm", 0, "", waiter), 403);
    await expectStatus(accessibleOrder(order.id, waiter, null), 404);
  });

  it("cocina no ve solicitudes sin confirmar y el acuse no equivale a entrega", async () => {
    const { order } = await newOrder();
    await expectStatus(accessibleOrder(order.id, kitchen, null), 404);
    let o = await changeOrder(order.id, "confirm", 0, "", waiter);
    o = await changeOrder(order.id, "prepare", o.version, "", kitchen);
    o = await changeOrder(order.id, "ready", o.version, "", kitchen);
    expect(await db.notification.count({ where: { orderId: order.id, userId: waiter.id, acknowledgedAt: null } })).toBeGreaterThan(0);
    o = await changeOrder(order.id, "acknowledge", o.version, "", waiter);
    expect(o.status).toBe("READY");
    expect(o.acknowledgedAt).not.toBeNull();
    expect(await db.notification.count({ where: { orderId: order.id, acknowledgedAt: null } })).toBe(0);
    await expectStatus(changeOrder(order.id, "acknowledge", o.version, "", waiter), 409);
    o = await changeOrder(order.id, "deliver", o.version, "", waiter);
    expect(o.status).toBe("DELIVERED");
  });

  it("cancelar exige motivo", async () => {
    const { order } = await newOrder();
    await expectStatus(changeOrder(order.id, "cancel", 0, "no", admin), 422);
  });
});

describe("insumos", () => {
  it("confirmaciones simultáneas no dejan stock negativo y cancelar antes de preparar devuelve insumos", async () => {
    const harina = await ingredient("1.000");
    const plato = await product("10.00", [{ ingredientId: harina.id, quantity: "1.000" }]);
    const a = await createOrder(orderBody((await openTable(waiter.id)).qrToken, [plato]), key());
    const b = await createOrder(orderBody((await openTable(waiter.id)).qrToken, [plato]), key());
    expect((await db.ingredient.findUniqueOrThrow({ where: { id: harina.id } })).stock.toFixed(3)).toBe("1.000");

    const results = await Promise.allSettled([changeOrder(a.order.id, "confirm", 0, "", waiter), changeOrder(b.order.id, "confirm", 0, "", waiter)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(statusOf((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason)).toBe(409);
    expect((await db.ingredient.findUniqueOrThrow({ where: { id: harina.id } })).stock.toFixed(3)).toBe("0.000");

    const winner = results[0].status === "fulfilled" ? a : b;
    await changeOrder(winner.order.id, "cancel", 1, "Cliente se retiró", admin);
    expect((await db.ingredient.findUniqueOrThrow({ where: { id: harina.id } })).stock.toFixed(3)).toBe("1.000");
  });
});

describe("cierre de mesa", () => {
  it("no cierra con pedidos sin entregar y sí con todo rechazado", async () => {
    const table = await openTable(waiter.id);
    const { order } = await createOrder(orderBody(table.qrToken, [await product()]), key());
    await expectStatus(closeTable(table.id, waiter), 409);
    await expectStatus(closeTable(table.id, otherWaiter), 403);
    await changeOrder(order.id, "reject", 0, "Pedido duplicado", waiter);
    const closed = await closeTable(table.id, waiter);
    expect(closed.closedAt).not.toBeNull();
  });
});
