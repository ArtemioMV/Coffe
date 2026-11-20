import { z } from "zod";

export const orderInput = z.object({
  tableToken: z.string().min(16).max(150),
  guestName: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(500).default(""),
  items: z.array(z.object({ productId: z.string().cuid(), quantity: z.number().int().min(1).max(30), expectedPrice: z.string().regex(/^\d+(\.\d{1,2})?$/), notes: z.string().trim().max(200).default("") })).min(1).max(50)
});
export const transitionInput = z.object({ action: z.enum(["confirm", "reject", "prepare", "ready", "acknowledge", "deliver", "cancel"]), version: z.number().int().min(0), reason: z.string().trim().max(500).default("") });
export const productInput = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).default(""), price: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/), categoryId: z.string().cuid(), station: z.enum(["KITCHEN", "BAR"]), active: z.boolean().default(true), available: z.boolean().default(true) });
export const tableInput = z.object({ name: z.string().trim().min(1).max(40), zone: z.string().trim().min(1).max(60), seats: z.number().int().min(1).max(50), active: z.boolean().default(true) });
export const feedbackInput = z.object({ message: z.string().trim().min(10).max(4000), contact: z.union([z.email(), z.literal("")]).default("") });
export const claimInput = z.object({ kind: z.enum(["RECLAMO", "QUEJA"]), name: z.string().trim().min(3).max(150), document: z.string().trim().min(5).max(20), email: z.email(), phone: z.string().trim().max(30).default(""), address: z.string().trim().min(5).max(300), representative: z.string().trim().max(300).default(""), service: z.string().trim().min(3).max(1000), amount: z.union([z.string().regex(/^\d{1,8}(\.\d{1,2})?$/), z.literal("")]).default(""), detail: z.string().trim().min(10).max(4000), request: z.string().trim().min(5).max(4000) });

export const statusLabels: Record<string, string> = { AWAITING_WAITER: "Por confirmar", PENDING: "Confirmado", PREPARING: "En preparación", READY: "Listo para recoger", DELIVERED: "Entregado", REJECTED: "Rechazado", CANCELLED: "Cancelado" };
export const money = (value: number | string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value));

export function cents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Importe inválido");
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Importe fuera de rango");
  return result;
}
export const decimal = (value: number) => (value / 100).toFixed(2);

export const rolesForAction: Record<string, string[]> = {
  confirm: ["ADMIN", "WAITER"], reject: ["ADMIN", "WAITER"],
  prepare: ["ADMIN", "KITCHEN"], ready: ["ADMIN", "KITCHEN"],
  acknowledge: ["ADMIN", "WAITER"], deliver: ["ADMIN", "WAITER"], cancel: ["ADMIN"]
};
const transitions: Record<string, Record<string, string>> = {
  AWAITING_WAITER: { confirm: "PENDING", reject: "REJECTED", cancel: "CANCELLED" },
  PENDING: { prepare: "PREPARING", cancel: "CANCELLED" },
  PREPARING: { ready: "READY", cancel: "CANCELLED" },
  READY: { acknowledge: "READY", deliver: "DELIVERED", cancel: "CANCELLED" }
};
export function nextStatus(status: string, action: string, role: string): string {
  if (!rolesForAction[action]?.includes(role)) throw new Error("No tienes permiso para esta acción");
  const next = transitions[status]?.[action];
  if (!next) throw new Error("Transición no permitida");
  return next;
}
