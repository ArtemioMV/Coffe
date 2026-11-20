import { describe, expect, it } from "vitest";
import { cents, claimInput, decimal, money, nextStatus, orderInput, rolesForAction, statusLabels, transitionInput } from "../../packages/contracts/src";

const ROLES = ["ADMIN", "WAITER", "KITCHEN", "CASHIER", "CUSTOMER"] as const;
const STATUSES = Object.keys(statusLabels);
const ACTIONS = transitionInput.shape.action.options;

// Especificación independiente del código (docs/REQUISITOS.md + flujo QR): [estado, acción] → estado siguiente.
const PERMITIDAS: Record<string, string> = {
  "AWAITING_WAITER:confirm": "PENDING",
  "AWAITING_WAITER:reject": "REJECTED",
  "AWAITING_WAITER:cancel": "CANCELLED",
  "PENDING:prepare": "PREPARING",
  "PENDING:cancel": "CANCELLED",
  "PREPARING:ready": "READY",
  "PREPARING:cancel": "CANCELLED",
  "READY:acknowledge": "READY",
  "READY:deliver": "DELIVERED",
  "READY:cancel": "CANCELLED"
};
const ROLES_POR_ACCION: Record<string, string[]> = {
  confirm: ["ADMIN", "WAITER"], reject: ["ADMIN", "WAITER"],
  prepare: ["ADMIN", "KITCHEN"], ready: ["ADMIN", "KITCHEN"],
  acknowledge: ["ADMIN", "WAITER"], deliver: ["ADMIN", "WAITER"],
  cancel: ["ADMIN"]
};

describe("cents y decimal", () => {
  it.each([
    ["0", 0], ["0.1", 10], ["0.10", 10], ["1.05", 105], ["12.5", 1250], ["999999.99", 99999999]
  ])("convierte %s a %i céntimos sin errores de coma flotante", (input, expected) => {
    expect(cents(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-1", "1,50", " 1", "1.", ".5", "1e3"])("rechaza el importe inválido %j", input => {
    expect(() => cents(input)).toThrow("Importe inválido");
  });

  it("rechaza importes fuera del rango entero seguro", () => {
    expect(() => cents("9".repeat(20))).toThrow("Importe fuera de rango");
  });

  it("suma 0.10 + 0.20 exactamente", () => {
    expect(decimal(cents("0.10") + cents("0.20"))).toBe("0.30");
  });

  it("formatea céntimos con dos decimales", () => {
    expect(decimal(0)).toBe("0.00");
    expect(decimal(105)).toBe("1.05");
    expect(decimal(cents("12.5") * 3)).toBe("37.50");
  });

  it("muestra soles peruanos", () => {
    expect(money("12.5")).toMatch(/^S\/\s?12\.50$/);
  });
});

describe("nextStatus: matriz completa estado × acción × rol", () => {
  it("cubre todos los estados y acciones del contrato", () => {
    expect(STATUSES).toEqual(["AWAITING_WAITER", "PENDING", "PREPARING", "READY", "DELIVERED", "REJECTED", "CANCELLED"]);
    expect(Object.keys(rolesForAction).sort()).toEqual([...ACTIONS].sort());
  });

  for (const status of STATUSES) {
    for (const action of ACTIONS) {
      for (const role of ROLES) {
        const allowedRole = ROLES_POR_ACCION[action].includes(role);
        const target = PERMITIDAS[`${status}:${action}`];
        const name = `${status} --${action}--> como ${role}`;
        if (!allowedRole) {
          it(`${name}: sin permiso`, () => expect(() => nextStatus(status, action, role)).toThrow("No tienes permiso"));
        } else if (!target) {
          it(`${name}: transición no permitida`, () => expect(() => nextStatus(status, action, role)).toThrow("Transición no permitida"));
        } else {
          it(`${name}: ${target}`, () => expect(nextStatus(status, action, role)).toBe(target));
        }
      }
    }
  }

  it("los estados finales no admiten ninguna acción", () => {
    for (const status of ["DELIVERED", "REJECTED", "CANCELLED"]) {
      for (const action of ACTIONS) expect(() => nextStatus(status, action, "ADMIN")).toThrow();
    }
  });

  it("caja y cliente nunca cambian el estado de un pedido", () => {
    for (const status of STATUSES) for (const action of ACTIONS) {
      expect(() => nextStatus(status, action, "CASHIER")).toThrow("No tienes permiso");
      expect(() => nextStatus(status, action, "CUSTOMER")).toThrow("No tienes permiso");
    }
  });
});

describe("orderInput", () => {
  const item = { productId: "ckabcdefghijklmnopqrstuvw", quantity: 2, expectedPrice: "18.50" };
  const valid = { tableToken: "x".repeat(32), items: [item] };

  it("acepta un pedido mínimo y aplica valores por defecto", () => {
    const parsed = orderInput.parse({ ...valid, notes: "  sin ají  " });
    expect(parsed.notes).toBe("sin ají");
    expect(parsed.guestName).toBe("");
    expect(parsed.items[0].notes).toBe("");
  });

  it.each([
    ["cantidad 0", { ...item, quantity: 0 }],
    ["cantidad 31", { ...item, quantity: 31 }],
    ["cantidad decimal", { ...item, quantity: 1.5 }],
    ["producto no cuid", { ...item, productId: "1" }],
    ["precio esperado con 3 decimales", { ...item, expectedPrice: "18.505" }],
    ["precio esperado numérico", { ...item, expectedPrice: 18.5 }]
  ])("rechaza %s", (_, bad) => {
    expect(orderInput.safeParse({ ...valid, items: [bad] }).success).toBe(false);
  });

  it("rechaza pedidos vacíos o con más de 50 líneas", () => {
    expect(orderInput.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(orderInput.safeParse({ ...valid, items: Array(51).fill(item) }).success).toBe(false);
  });

  it("rechaza tokens de mesa cortos", () => {
    expect(orderInput.safeParse({ ...valid, tableToken: "corto" }).success).toBe(false);
  });
});

describe("claimInput", () => {
  const valid = {
    kind: "RECLAMO", name: "Ana Pérez", document: "12345678", email: "ana@example.com",
    address: "Jr. Amalia Puga 123, Cajamarca", service: "Almuerzo", detail: "El plato llegó frío y tarde.", request: "Reembolso"
  };

  it("acepta un reclamo sin monto ni representante", () => {
    const parsed = claimInput.parse(valid);
    expect(parsed.amount).toBe("");
    expect(parsed.representative).toBe("");
  });

  it("solo admite RECLAMO o QUEJA", () => {
    expect(claimInput.safeParse({ ...valid, kind: "QUEJA" }).success).toBe(true);
    expect(claimInput.safeParse({ ...valid, kind: "SUGERENCIA" }).success).toBe(false);
  });

  it("valida correo e importe", () => {
    expect(claimInput.safeParse({ ...valid, email: "no-es-correo" }).success).toBe(false);
    expect(claimInput.safeParse({ ...valid, amount: "45.90" }).success).toBe(true);
    expect(claimInput.safeParse({ ...valid, amount: "-1" }).success).toBe(false);
  });
});
