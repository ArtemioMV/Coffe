import { describe, expect, it } from "vitest";
import { cents, decimal, nextStatus, orderInput } from "../../packages/contracts/src";

describe("confirmación del mozo", () => {
  it("impide que cocina prepare una solicitud del cliente sin aprobar", () => {
    expect(() => nextStatus("AWAITING_WAITER", "prepare", "KITCHEN")).toThrow();
    expect(() => nextStatus("AWAITING_WAITER", "confirm", "KITCHEN")).toThrow();
    expect(nextStatus("AWAITING_WAITER", "confirm", "WAITER")).toBe("PENDING");
  });
  it("separa recogida y entrega y bloquea saltos de estado", () => {
    expect(nextStatus("READY", "acknowledge", "WAITER")).toBe("READY");
    expect(nextStatus("READY", "deliver", "WAITER")).toBe("DELIVERED");
    expect(() => nextStatus("PENDING", "deliver", "WAITER")).toThrow();
    expect(() => nextStatus("PREPARING", "ready", "CUSTOMER")).toThrow();
  });
  it("permite rechazo solo antes de confirmar", () => {
    expect(nextStatus("AWAITING_WAITER", "reject", "WAITER")).toBe("REJECTED");
    expect(() => nextStatus("PREPARING", "reject", "WAITER")).toThrow();
  });
});
describe("dinero y contrato", () => {
  it("calcula centavos exactos sin acumulación de flotantes", () => {
    expect(cents("0.10") + cents("0.20")).toBe(30);
    expect(decimal(cents("12.35") * 3)).toBe("37.05");
    expect(() => cents("1.999")).toThrow();
    expect(() => cents("-1.00")).toThrow();
  });
  it("rechaza cantidades fuera de rango y exige precio revisado", () => {
    const data = { tableToken: "a".repeat(32), items: [{ productId: "cm123456789012345678901234", quantity: 1, expectedPrice: "12.00" }] };
    expect(orderInput.safeParse(data).success).toBe(true);
    expect(orderInput.safeParse({ ...data, items: [{ ...data.items[0], quantity: 0 }] }).success).toBe(false);
    expect(orderInput.safeParse({ ...data, items: [{ productId: data.items[0].productId, quantity: 1 }] }).success).toBe(false);
  });
});
