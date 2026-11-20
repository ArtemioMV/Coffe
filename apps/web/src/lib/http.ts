import { Prisma } from "@restaurant/database";
import { ZodError } from "zod";
import { origin } from "./env";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assert(value: unknown, status: number, message: string): asserts value {
  if (!value) throw new HttpError(status, message);
}
export function checkOrigin(request: Request) {
  assert(request.headers.get("origin") === origin(), 403, "Origen no autorizado");
}
export async function body(request: Request) {
  const text = await request.text();
  assert(Buffer.byteLength(text) <= 32_768, 413, "Solicitud demasiado grande");
  try { return JSON.parse(text); } catch { throw new HttpError(400, "JSON inválido"); }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: "Revisa los campos del formulario", fields: error.flatten() }, 422);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return json({ error: "Ya existe un registro con estos datos" }, 409);
    if (error.code === "P2025") return json({ error: "Registro no encontrado" }, 404);
    if (error.code === "P2034") return json({ error: "Otra operación cambió los datos. Vuelve a intentarlo." }, 409);
  }
  console.error("api_error", error instanceof Error ? error.name : "unknown");
  return json({ error: "No se pudo completar la operación. Revisa la conexión e inténtalo nuevamente." }, 503);
}
