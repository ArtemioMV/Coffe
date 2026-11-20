import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@restaurant/database";
import { changeOrder, createOrder } from "@/modules/pedidos/service";
import { payOrder, ticketData } from "@/modules/caja/service";
import { expectStatus, key, openTable, orderBody, product, user } from "./helpers";

type Actor = Awaited<ReturnType<typeof user>>;
let waiter: Actor, kitchen: Actor, cashier: Actor;

beforeAll(async () => {
  [waiter, kitchen, cashier] = await Promise.all([user("WAITER"), user("KITCHEN"), user("CASHIER")]);
});
afterAll(async () => { await db.$disconnect(); });

const cash = (amount: string) => ({ amount, method: "EFECTIVO", reference: "" });
const row = (id: string) => db.order.findUniqueOrThrow({ where: { id } });

describe("un pedido por mesa hasta cobrarlo", () => {
  it("lo nuevo se suma al pedido abierto como comanda adicional con su propio estado en cocina", async () => {
    const table = await openTable(waiter.id);
    const first = (await createOrder(orderBody(table.qrToken, [await product("10.00")]), key(), undefined, waiter)).order;
    await changeOrder(first.id, "prepare", first.version, "", kitchen);
    const second = (await createOrder(orderBody(table.qrToken, [await product("5.00")]), key(), undefined, waiter)).order;

    expect(second.accountNumber).toBe(first.number);
    expect(second.round).toBe(2);
    expect((await row(second.id)).parentId).toBe(first.id);
    expect(second.status).toBe("PENDING");
    expect((await row(first.id)).status).toBe("PREPARING"); // la primera comanda no retrocede
    const notice = await db.notification.findFirstOrThrow({ where: { orderId: second.id, userId: kitchen.id } });
    expect(notice.title).toBe(`Pedido #${first.number} · comanda 2: comanda nueva`);
  });

  it("un pedido del cliente por QR también se suma, y queda por confirmar solo esa comanda", async () => {
    const table = await openTable(waiter.id);
    const first = (await createOrder(orderBody(table.qrToken, [await product()]), key(), undefined, waiter)).order;
    const guest = (await createOrder(orderBody(table.qrToken, [await product()]), key())).order;
    expect(guest).toMatchObject({ accountNumber: first.number, round: 2, status: "AWAITING_WAITER" });
    expect((await row(first.id)).status).toBe("PENDING");
  });

  it("un cobro parcial no cierra el pedido; el cobro completo sí, y lo siguiente abre pedido nuevo", async () => {
    const table = await openTable(waiter.id);
    const first = (await createOrder(orderBody(table.qrToken, [await product("20.00")]), key(), undefined, waiter)).order;
    await payOrder(first.id, cash("5.00"), key(), cashier);
    const second = (await createOrder(orderBody(table.qrToken, [await product("8.00")]), key(), undefined, waiter)).order;
    expect(second.accountNumber).toBe(first.number);

    await payOrder(second.id, cash("23.00"), key(), cashier); // saldo del pedido: 15 + 8
    const third = (await createOrder(orderBody(table.qrToken, [await product("4.00")]), key(), undefined, waiter)).order;
    expect(third.accountNumber).toBe(third.number);
    expect(third.round).toBe(1);
  });

  it("el cobro se reparte entre comandas, ignora las no confirmadas y no excede el saldo del pedido", async () => {
    const table = await openTable(waiter.id);
    const a = (await createOrder(orderBody(table.qrToken, [await product("12.00")]), key(), undefined, waiter)).order;
    const b = (await createOrder(orderBody(table.qrToken, [await product("6.50")]), key(), undefined, waiter)).order;
    const pending = (await createOrder(orderBody(table.qrToken, [await product("30.00")]), key())).order;

    await expectStatus(payOrder(a.id, cash("18.51"), key(), cashier), 409);
    const k = key();
    await payOrder(a.id, cash("18.50"), k, cashier);
    const sums = await db.payment.groupBy({ by: ["orderId"], where: { orderId: { in: [a.id, b.id, pending.id] } }, _sum: { amount: true } });
    const paid = Object.fromEntries(sums.map(s => [s.orderId, s._sum.amount?.toFixed(2)]));
    expect(paid).toEqual({ [a.id]: "12.00", [b.id]: "6.50" });
    // Reintento del mismo cobro: no duplica.
    await payOrder(a.id, cash("18.50"), k, cashier);
    expect(await db.payment.count({ where: { orderId: { in: [a.id, b.id] } } })).toBe(2);
    // La comanda por confirmar mantiene el pedido abierto.
    const next = (await createOrder(orderBody(table.qrToken, [await product()]), key(), undefined, waiter)).order;
    expect(next.accountNumber).toBe(a.number);
  });

  it("la precuenta reúne todas las comandas confirmadas; la comanda de cocina solo la suya", async () => {
    const table = await openTable(waiter.id);
    const a = (await createOrder(orderBody(table.qrToken, [await product("10.00")]), key(), undefined, waiter)).order;
    const b = (await createOrder(orderBody(table.qrToken, [await product("2.50")]), key(), undefined, waiter)).order;
    await createOrder(orderBody(table.qrToken, [await product("99.00")]), key()); // por confirmar: fuera de la precuenta

    const ticket = await ticketData(b.id, waiter);
    expect(ticket.account).toMatchObject({ number: a.number, total: "12.50", paid: "0.00" });
    expect(ticket.account?.orders.map(o => o.id)).toEqual([a.id, b.id]);
    const command = await ticketData(b.id, kitchen);
    expect(command.account).toBeNull();
    expect(command.order.items).toHaveLength(1);
  });

  it("si la única comanda fue rechazada, lo siguiente abre pedido nuevo", async () => {
    const table = await openTable(waiter.id);
    const guest = (await createOrder(orderBody(table.qrToken, [await product()]), key())).order;
    await changeOrder(guest.id, "reject", guest.version, "Mesa equivocada", waiter);
    const next = (await createOrder(orderBody(table.qrToken, [await product()]), key(), undefined, waiter)).order;
    expect(next.round).toBe(1);
    expect(next.accountNumber).toBe(next.number);
  });
});
