import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@restaurant/database";
import { changeOrder, createOrder } from "@/modules/pedidos/service";
import { payOrder } from "@/modules/caja/service";
import { closeTable } from "@/modules/mesas/service";
import { expectStatus, key, openTable, orderBody, product, statusOf, user } from "./helpers";

type Actor = Awaited<ReturnType<typeof user>>;
let waiter: Actor, kitchen: Actor, cashier: Actor;

beforeAll(async () => {
  [waiter, kitchen, cashier] = await Promise.all([user("WAITER"), user("KITCHEN"), user("CASHIER")]);
});
afterAll(async () => { await db.$disconnect(); });

/** Pedido confirmado (cobrable), opcionalmente de un cliente registrado. */
async function billableOrder(price: string, customerId?: string) {
  const table = await openTable(waiter.id);
  const { order } = await createOrder(orderBody(table.qrToken, [await product(price)]), key(), customerId);
  const confirmed = await changeOrder(order.id, "confirm", 0, "", waiter);
  return { table, order: confirmed };
}
const cash = (amount: string) => ({ amount, method: "EFECTIVO", reference: "" });

describe("cobros", () => {
  it("no cobra solicitudes sin confirmar", async () => {
    const table = await openTable(waiter.id);
    const { order } = await createOrder(orderBody(table.qrToken, [await product("10.00")]), key());
    await expectStatus(payOrder(order.id, cash("10.00"), key(), cashier), 409);
  });

  it("acepta pagos parciales exactos y rechaza el exceso sin dejar eventos", async () => {
    const { order } = await billableOrder("33.30");
    await payOrder(order.id, cash("11.10"), key(), cashier);
    await payOrder(order.id, cash("11.10"), key(), cashier);
    await expectStatus(payOrder(order.id, cash("11.11"), key(), cashier), 409);
    await payOrder(order.id, cash("11.10"), key(), cashier);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(3);
    expect(await db.outboxEvent.count({ where: { aggregateId: order.id, type: "payment.confirmed" } })).toBe(3);
  });

  it("reintento con la misma clave devuelve el mismo pago; con otros datos responde 409", async () => {
    const { order } = await billableOrder("20.00");
    const k = key();
    const first = await payOrder(order.id, cash("5.00"), k, cashier);
    const again = await payOrder(order.id, cash("5.00"), k, cashier);
    expect(again.id).toBe(first.id);
    await expectStatus(payOrder(order.id, cash("6.00"), k, cashier), 409);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("dos cajas cobrando el total a la vez: solo un cobro entra", async () => {
    const { order } = await billableOrder("40.00");
    const results = await Promise.allSettled([
      payOrder(order.id, cash("40.00"), key(), cashier),
      payOrder(order.id, cash("40.00"), key(), cashier)
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(statusOf((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason)).toBe(409);
    const sum = await db.payment.aggregate({ where: { orderId: order.id }, _sum: { amount: true } });
    expect(sum._sum.amount?.toFixed(2)).toBe("40.00");
  });

  it("transferencia sin referencia no se registra", async () => {
    const { order } = await billableOrder("15.00");
    await expectStatus(payOrder(order.id, { amount: "15.00", method: "TRANSFERENCIA", reference: "" }, key(), cashier), 422);
  });
});

describe("puntos", () => {
  it("se abonan una sola vez al saldar, aunque el saldo se complete en varios pagos simultáneos", async () => {
    const customer = await user("CUSTOMER");
    const { order } = await billableOrder("25.90", customer.id);
    await payOrder(order.id, cash("10.00"), key(), cashier);
    await Promise.allSettled([payOrder(order.id, cash("15.90"), key(), cashier), payOrder(order.id, cash("15.90"), key(), cashier)]);

    const entries = await db.pointEntry.findMany({ where: { orderId: order.id } });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ points: 25, kind: "EARNED", userId: customer.id });
    expect((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).points).toBe(25);
  });

  it("no hay puntos para pedidos sin cliente ni antes de saldar", async () => {
    const customer = await user("CUSTOMER");
    const anonymous = await billableOrder("30.00");
    await payOrder(anonymous.order.id, cash("30.00"), key(), cashier);
    const partial = await billableOrder("30.00", customer.id);
    await payOrder(partial.order.id, cash("29.99"), key(), cashier);
    expect(await db.pointEntry.count({ where: { orderId: { in: [anonymous.order.id, partial.order.id] } } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).points).toBe(0);
  });
});

describe("cierre de mesa con saldo", () => {
  it("una mesa entregada pero sin pagar no cierra; pagada sí", async () => {
    const { table, order } = await billableOrder("12.00");
    let o = await changeOrder(order.id, "prepare", order.version, "", kitchen);
    o = await changeOrder(order.id, "ready", o.version, "", kitchen);
    o = await changeOrder(order.id, "deliver", o.version, "", waiter);
    await expectStatus(closeTable(table.id, waiter), 409);
    await payOrder(order.id, cash("12.00"), key(), cashier);
    expect((await closeTable(table.id, waiter)).closedAt).not.toBeNull();
  });

  it("no cancela un pedido con pagos registrados", async () => {
    const { order } = await billableOrder("8.00");
    await payOrder(order.id, cash("8.00"), key(), cashier);
    const admin = await user("ADMIN");
    await expectStatus(changeOrder(order.id, "cancel", order.version, "Cliente se retiró", admin), 409);
  });
});
