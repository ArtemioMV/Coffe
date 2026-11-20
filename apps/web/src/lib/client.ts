export type User = { id: string; name: string; email: string; role: "ADMIN" | "WAITER" | "KITCHEN" | "CASHIER" | "CUSTOMER"; points: number };
export type Product = { id: string; name: string; description: string; price: string; available: boolean; active?: boolean; categoryId?: string; station: string; recipe?: { ingredientId: string; quantity: string }[] };
export type Category = { id: string; name: string; products: Product[] };
export type Order = { id: string; number: number; tableName: string; attentionId?: string | null; status: string; version: number; total: string; paid: string; createdAt: string; guestName: string; notes: string; acknowledgedAt: string | null; items: { id: string; name: string; price: string; quantity: number; notes: string; station: string }[] };
export type Table = { id: string; name: string; zone: string; seats: number; active: boolean; qrToken: string; attentions: { id: string; waiterId: string; waiter: { id: string; name: string } }[] };
export type Notice = { id: string; sequence: number; orderId: string | null; title: string; body: string; readAt: string | null; acknowledgedAt: string | null; createdAt: string };
/** Error de la API con el código HTTP, para distinguir sesión vencida (401) de otros fallos. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
/** Evento de ventana para avisar a la cabecera que la sesión cambió (ingreso, salida o vencimiento). */
export const SESSION_EVENT = "restaurant:session";
export const sessionExpired = (error: unknown) => error instanceof ApiError && error.status === 401;
export async function api<T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }, cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error || "No se pudo completar la operación", response.status);
  return result as T;
}
export function mutation<T = Record<string, unknown>>(path: string, data: unknown, method = "POST", extra: Record<string, string> = {}) {
  return api<T>(path, { method, body: JSON.stringify(data), headers: extra });
}
export const dateTime = (value: string) => new Date(value).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" });
