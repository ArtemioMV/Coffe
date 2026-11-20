import { Queue, Worker } from "bullmq";
import nodemailer from "nodemailer";
import { db } from "@restaurant/database";
import { createHash, createDecipheriv } from "node:crypto";

const url = new URL(process.env.REDIS_QUEUE_URL || "redis://127.0.0.1:56380");
const connection = { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined, password: url.password || undefined, ...(url.protocol === "rediss:" ? { tls: {} } : {}) };
const queue = new Queue("restaurant-outbox", { connection });
const mailer = process.env.SMTP_HOST && process.env.MAIL_FROM ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === "465", auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined }) : null;

const worker = new Worker("restaurant-outbox", async job => {
  const record = await db.outboxEvent.findUnique({ where: { id: String(job.data.id) } });
  if (!record || record.processedAt) return;
  try {
    if (record.type === "auth.reset") {
      if (!mailer) throw new Error("SMTP no configurado; entrega pendiente");
      const reset = await db.passwordReset.findUniqueOrThrow({ where: { id: record.aggregateId } });
      if (!reset.usedAt && reset.expiresAt > new Date()) {
        const payload = record.payload as { envelope: string; email: string };
        const [iv, tag, text] = payload.envelope.split(".");
        const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(process.env.AUTH_SECRET || "").digest(), Buffer.from(iv, "base64url"));
        decipher.setAuthTag(Buffer.from(tag, "base64url"));
        const access = Buffer.concat([decipher.update(Buffer.from(text, "base64url")), decipher.final()]).toString("utf8");
        await mailer.sendMail({ from: process.env.MAIL_FROM, to: payload.email, messageId: `<${record.id}@restaurant.local>`, subject: "Recupera tu acceso", text: `Abre este enlace antes de 30 minutos para cambiar tu contraseña:\n${process.env.APP_ORIGIN}/recuperar#${access}\nSi no lo solicitaste, ignora este mensaje.` });
      }
    }
    if (record.type.startsWith("claim.")) {
      if (!mailer) throw new Error("SMTP no configurado; entrega pendiente");
      const claim = await db.claim.findUniqueOrThrow({ where: { id: record.aggregateId } });
      const isResponse = record.type === "claim.response";
      await mailer.sendMail({ from: process.env.MAIL_FROM, to: claim.email,
        messageId: `<${record.id}@restaurant.local>`,
        subject: `${isResponse ? "Respuesta" : "Constancia"} · Hoja ${claim.number}`,
        text: `${isResponse ? "Respuesta a tu hoja" : "Registramos tu hoja"} #${claim.number}\nFecha: ${claim.createdAt.toISOString()}\nTipo: ${claim.kind}\nServicio: ${claim.service}\nDetalle: ${claim.detail}\nPedido: ${claim.request}\n${isResponse ? `Respuesta: ${claim.response}` : "Conserva la constancia descargable desde el enlace de seguimiento que recibiste al registrar la hoja."}` });
      if (!isResponse && process.env.CLAIMS_EMAIL) await mailer.sendMail({ from: process.env.MAIL_FROM, to: process.env.CLAIMS_EMAIL, subject: `Nueva hoja #${claim.number}`, text: `Ingresa al panel privado para atender la hoja #${claim.number}.` });
    }
    await db.outboxEvent.update({ where: { id: record.id }, data: { processedAt: new Date(), lastError: null, attempts: { increment: 1 } } });
  } catch (error) {
    await db.outboxEvent.update({ where: { id: record.id }, data: { attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 200) : "Entrega fallida" } });
    throw error;
  }
}, { connection, concurrency: 3 });
worker.on("error", error => console.error("worker_error", error.name));
worker.on("failed", job => console.error("outbox_delivery_failed", job?.id));
queue.on("error", error => console.error("queue_error", error.name));

async function dispatch() {
  const pending = await db.outboxEvent.findMany({ where: { processedAt: null }, orderBy: { createdAt: "asc" }, take: 100 });
  for (const event of pending) {
    await queue.add("deliver", { id: event.id }, { jobId: event.id, attempts: 8, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: { age: 86400 }, removeOnFail: { age: 86400 } });
  }
  // Alerta durable de recogida; ID determinista evita repetición por tick/reinicio.
  const ready = await db.order.findMany({ where: { status: "READY", acknowledgedAt: null }, include: { attention: { include: { table: true } }, history: { where: { status: "READY" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  for (const order of ready) {
    const since = order.history[0]?.createdAt;
    if (!since) continue;
    const age = Date.now() - since.getTime();
    for (const seconds of [60, 120]) {
      if (age < seconds * 1000) continue;
      const admins = seconds === 120 ? await db.user.findMany({ where: { active: true, role: "ADMIN" }, select: { id: true } }) : [];
      const recipients = [...new Set([order.attention?.waiterId, ...admins.map(a => a.id)].filter((v): v is string => !!v))];
      await db.$transaction(async tx => {
        const current = await tx.order.findUnique({ where: { id: order.id } });
        if (current?.status !== "READY" || current.acknowledgedAt) return;
        const eventId = `reminder_${order.id}_${seconds}`;
        await tx.notification.createMany({ data: recipients.map(userId => ({ eventId, userId, orderId: order.id, title: `Pedido #${order.number} sigue listo para recoger`, body: `Mesa ${order.attention?.table.name || "—"}` })), skipDuplicates: true });
      });
    }
  }
}
let busy = false;
const timer = setInterval(async () => {
  if (busy) return;
  busy = true;
  try { await dispatch(); } catch (error) { console.error("dispatcher_error", error instanceof Error ? error.name : "unknown"); }
  finally { busy = false; }
}, 3000);
console.log("Worker activo: outbox y recordatorios de recogida");
async function stop() { clearInterval(timer); await worker.close(); await queue.close(); await db.$disconnect(); process.exit(0); }
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
