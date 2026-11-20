import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { db, Role } from "@restaurant/database";
import { z } from "zod";
import { assert } from "@/lib/http";
import { secret, origin } from "@/lib/env";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const safeUser = (user: { id: string; name: string; email: string; role: Role; points: number }) => ({ id: user.id, name: user.name, email: user.email, role: user.role, points: user.points });
export async function currentUser() {
  const token = (await cookies()).get("restaurant_session")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
  return session && session.expiresAt > new Date() && session.user.active ? safeUser(session.user) : null;
}
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  assert(user, 401, "Inicia sesión para continuar");
  assert(!roles || roles.includes(user.role), 403, "No tienes permiso para esta operación");
  return user;
}
async function session(userId: string) {
  secret();
  const token = randomBytes(32).toString("base64url");
  const hours = Math.max(1, Math.min(Number(process.env.SESSION_HOURS || 12), 72));
  await db.session.create({ data: { tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + hours * 3600_000) } });
  (await cookies()).set("restaurant_session", token, { httpOnly: true, secure: origin().startsWith("https:"), sameSite: "strict", path: "/", maxAge: hours * 3600 });
}
const credentials = z.object({ email: z.email().transform(v => v.toLowerCase()), password: z.string().min(1).max(100) });
export async function login(input: unknown) {
  const data = credentials.parse(input);
  const user = await db.user.findUnique({ where: { email: data.email } });
  // Hash de relleno para que una cuenta ausente también realice bcrypt.
  const valid = await compare(data.password, user?.passwordHash.replace(/^\$2y\$/, "$2b$") || "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYH.jhSu7mMbn5W4KNc9UGcGfk5vPf2a");
  assert(user?.active && valid, 401, "Correo o contraseña inválidos");
  await session(user.id);
  return safeUser(user);
}
export async function register(input: unknown) {
  const data = credentials.extend({ name: z.string().trim().min(2).max(120), password: z.string().min(10).max(100) }).parse(input);
  const user = await db.user.create({ data: { email: data.email, name: data.name, passwordHash: await hash(data.password, 12), role: "CUSTOMER" } });
  await session(user.id);
  return safeUser(user);
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("restaurant_session")?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete("restaurant_session");
}

export async function requestReset(input: unknown) {
  const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(input);
  const user = await db.user.findUnique({ where: { email } });
  if (user?.active) {
    const access = randomBytes(32).toString("base64url");
    // El secreto de recuperación solo se guarda cifrado en el trabajo de correo.
    const { createCipheriv } = await import("node:crypto");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(digest(secret()), "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(access, "utf8"), cipher.final()]);
    const envelope = `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
    await db.$transaction(async tx => {
      await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      const reset = await tx.passwordReset.create({ data: { userId: user.id, tokenHash: digest(access), expiresAt: new Date(Date.now() + 30 * 60_000) } });
      await tx.outboxEvent.create({ data: { type: "auth.reset", aggregateId: reset.id, payload: { envelope, email: user.email } } });
    });
  }
  return { message: "Si existe una cuenta activa con ese correo, tramitaremos un enlace de recuperación." };
}
export async function resetPassword(input: unknown) {
  const data = z.object({ token: z.string().min(32).max(100), password: z.string().min(10).max(100) }).parse(input);
  const passwordHash = await hash(data.password, 12);
  await db.$transaction(async tx => {
    const reset = await tx.passwordReset.findUnique({ where: { tokenHash: digest(data.token) } });
    assert(reset && !reset.usedAt && reset.expiresAt > new Date(), 400, "El enlace venció o ya fue utilizado");
    const updated = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    assert(updated.count, 400, "El enlace ya fue utilizado");
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
  });
  return { message: "Contraseña actualizada. Inicia sesión nuevamente." };
}
