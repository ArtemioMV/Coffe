import { randomBytes } from "node:crypto";
import { z } from "zod";
import QRCode from "qrcode";
import { db, Prisma } from "@restaurant/database";
import { claimInput, feedbackInput, productInput, tableInput, transitionInput } from "@restaurant/contracts";
import { assert, body, checkOrigin, failure, HttpError, json } from "@/lib/http";
import { business, origin } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { currentUser, digest, login, logout, register, requireUser, requestReset, resetPassword } from "@/modules/identidad/service";
import { menu, invalidateMenu } from "@/modules/catalogo/service";
import { accessibleOrder, changeOrder, createOrder, listPanelOrders, orderView, serial } from "@/modules/pedidos/service";
import { closeTable, openTable, tableList } from "@/modules/mesas/service";
import { notifications, staffIds, event } from "@/modules/notificaciones/service";
import { payOrder, ticketData } from "@/modules/caja/service";
import { googleReviewsEnabled, loadGoogleReviews } from "@/modules/inicio/google-reviews";
import { socialInput, socialSettings, updateSocial } from "@/modules/social/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const token = (r: Request) => r.headers.get("authorization")?.replace(/^Bearer /, "") || null;

async function route(request: Request, context: Context) {
  try {
    const parts = (await context.params).path;
    const path = parts.join("/");
    const method = request.method;
    if (!["GET", "HEAD"].includes(method)) checkOrigin(request);

    if (path === "health" && method === "GET") return json({ status: "ok", service: "restaurant-api", version: "v1" });
    if (path === "ready" && method === "GET") { await db.$queryRaw`SELECT 1`; return json({ database: "ok" }); }
    if (path === "menu" && method === "GET") return json({ categories: await menu() });
    if (path === "business" && method === "GET") return json({ ...business(), appName: process.env.NEXT_PUBLIC_APP_NAME || "Restaurante campestre" });
    if (path === "public/reviews" && method === "GET") {
      if (!googleReviewsEnabled()) return json({ reviews: null });
      await rateLimit(request, "public-reviews", 20);
      return json({ reviews: await loadGoogleReviews() });
    }
    if (path === "admin/social" && method === "GET") {
      await requireUser(["ADMIN"]);
      return json({ settings: await socialSettings() });
    }
    if (path === "admin/social" && method === "PUT") {
      const actor = await requireUser(["ADMIN"]);
      const parsed = socialInput.safeParse(await body(request));
      if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 422);
      return json({ settings: await updateSocial(parsed.data, actor.id) });
    }

    if (path === "auth/me" && method === "GET") return json({ user: await currentUser() });
    if (["auth/login", "auth/register"].includes(path) && method === "POST") {
      await rateLimit(request, "auth", 10);
      return json({ user: await (path.endsWith("login") ? login : register)(await body(request)) });
    }
    if (path === "auth/logout" && method === "POST") { await logout(); return json({ ok: true }); }
    if (["auth/forgot", "auth/reset"].includes(path) && method === "POST") {
      await rateLimit(request, "recovery", 5);
      return json(await (path === "auth/forgot" ? requestReset : resetPassword)(await body(request)));
    }

    if (parts[0] === "tables" && parts[1] === "resolve" && parts[2] && method === "GET") {
      await rateLimit(request, "tables", 120);
      const [table, actor] = await Promise.all([
        db.diningTable.findUnique({ where: { qrToken: parts[2] }, include: { attentions: { where: { closedAt: null }, select: { id: true, waiterId: true } } } }),
        currentUser()
      ]);
      assert(table?.active, 404, "Mesa no disponible");
      const attention = table.attentions[0];
      // «mine»: quien mira la carta es el mozo de esta atención (o administración) y su pedido va directo a cocina.
      const mine = Boolean(attention && actor && (actor.role === "ADMIN" || (actor.role === "WAITER" && attention.waiterId === actor.id)));
      return json({ name: table.name, zone: table.zone, open: Boolean(attention), mine, id: mine ? table.id : undefined });
    }
    if (path === "tables" && method === "GET") { const actor = await requireUser(["ADMIN", "WAITER", "CASHIER"]); return json({ tables: await tableList(actor) }); }
    if (path === "tables" && method === "POST") {
      const actor = await requireUser(["ADMIN"]);
      const data = tableInput.parse(await body(request));
      const table = await db.diningTable.create({ data: { ...data, qrToken: randomBytes(24).toString("base64url") } });
      await db.auditLog.create({ data: { actorId: actor.id, action: "table.create", resource: table.id } });
      return json(table, 201);
    }
    if (parts[0] === "tables" && parts.length >= 2) {
      const id = z.cuid().parse(parts[1]);
      if (parts.length === 2 && method === "PATCH") {
        const actor = await requireUser(["ADMIN"]);
        const data = tableInput.partial().parse(await body(request));
        const table = await serial(async tx => {
          if (data.active === false) assert(!await tx.attention.findFirst({ where: { tableId: id, closedAt: null } }), 409, "Cierra la atención antes de desactivar la mesa");
          const result = await tx.diningTable.update({ where: { id }, data });
          await tx.auditLog.create({ data: { actorId: actor.id, action: "table.update", resource: id } }); return result;
        });
        return json(table);
      }
      if (parts[2] === "open" && method === "POST") return json(await openTable(id, await requireUser(["ADMIN", "WAITER"])), 201);
      if (parts[2] === "close" && method === "POST") return json(await closeTable(id, await requireUser(["ADMIN", "CASHIER"]), z.object({ attentionId: z.cuid().optional() }).parse(await body(request)).attentionId));
      if (parts[2] === "qr" && method === "GET") {
        await requireUser(["ADMIN", "WAITER"]);
        const table = await db.diningTable.findUniqueOrThrow({ where: { id } });
        const url = `${origin()}/carta?mesa=${table.qrToken}`;
        return new Response(await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 }), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } });
      }
      if (parts[2] === "rotate-qr" && method === "POST") {
        const actor = await requireUser(["ADMIN"]);
        const result = await db.diningTable.update({ where: { id }, data: { qrToken: randomBytes(24).toString("base64url") } });
        await db.auditLog.create({ data: { actorId: actor.id, action: "table.rotate-qr", resource: id } }); return json(result);
      }
    }

    if (path === "catalog" && method === "GET") {
      await requireUser(["ADMIN"]);
      return json({ categories: await db.category.findMany({ orderBy: { position: "asc" } }), products: await db.product.findMany({ orderBy: { name: "asc" }, include: { recipe: true } }) });
    }
    if (path === "categories" && method === "POST") {
      await requireUser(["ADMIN"]);
      const data = z.object({ name: z.string().trim().min(2).max(80), position: z.number().int().min(0).default(0) }).parse(await body(request));
      const result = await db.category.create({ data }); await invalidateMenu(); return json(result, 201);
    }
    if (parts[0] === "products" && ["POST", "PATCH"].includes(method)) {
      const actor = await requireUser(["ADMIN"]);
      const data = method === "POST" ? productInput.parse(await body(request)) : productInput.partial().parse(await body(request));
      const result = method === "PATCH" ? await db.product.update({ where: { id: z.cuid().parse(parts[1]) }, data }) : await db.product.create({ data: productInput.parse(data) });
      await db.auditLog.create({ data: { actorId: actor.id, action: "product.save", resource: result.id } });
      await invalidateMenu(); return json(result, method === "POST" ? 201 : 200);
    }

    if (path === "orders" && method === "POST") {
      await rateLimit(request, "orders", 30);
      const actor = await currentUser();
      return json(await createOrder(await body(request), request.headers.get("idempotency-key"), actor?.role === "CUSTOMER" ? actor.id : undefined, actor), 201);
    }
    if (path === "orders" && method === "GET") {
      const actor = await requireUser();
      const orders = await listPanelOrders(actor);
      return json({ orders: orders.map(o => orderView(o, actor.role !== "CUSTOMER")) });
    }
    if (parts[0] === "orders" && parts[1]) {
      const id = z.cuid().parse(parts[1]);
      if (parts.length === 2 && method === "GET") return json({ order: orderView(await accessibleOrder(id, await currentUser(), token(request))) });
      if (parts[2] === "transition" && method === "POST") {
        const actor = await requireUser(["ADMIN", "WAITER", "KITCHEN"]);
        const data = transitionInput.parse(await body(request));
        return json({ order: await changeOrder(id, data.action, data.version, data.reason, actor) });
      }
      if (parts[2] === "payments" && method === "POST") return json(await payOrder(id, await body(request), request.headers.get("idempotency-key"), await requireUser(["ADMIN", "CASHIER"])), 201);
      if (parts[2] === "ticket" && method === "GET") {
        return json(await ticketData(id, await requireUser(["ADMIN", "WAITER", "CASHIER", "KITCHEN"])));
      }
      if (parts[2] === "rating" && method === "POST") {
        await rateLimit(request, "rating", 20);
        const order = await accessibleOrder(id, await currentUser(), token(request));
        assert(order.status === "DELIVERED", 409, "Solo puedes valorar pedidos entregados");
        const data = z.object({ score: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).default("") }).parse(await body(request));
        return json(await db.rating.create({ data: { ...data, orderId: id } }), 201);
      }
    }

    if (path === "notifications" && method === "GET") return json({ notifications: await notifications((await requireUser()).id) });
    if (parts[0] === "notifications" && parts[1] && method === "PATCH") {
      const actor = await requireUser();
      await db.notification.updateMany({ where: { id: z.cuid().parse(parts[1]), userId: actor.id }, data: { readAt: new Date() } }); return json({ ok: true });
    }

    if (path === "inventory" && method === "GET") {
      await requireUser(["ADMIN", "KITCHEN"]);
      return json({ ingredients: await db.ingredient.findMany({ orderBy: { name: "asc" } }), movements: await db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { ingredient: { select: { name: true, unit: true } } } }) });
    }
    if (path === "inventory" && method === "POST") {
      await requireUser(["ADMIN"]);
      const data = z.object({ name: z.string().trim().min(2).max(100), unit: z.enum(["kg", "g", "L", "ml", "unidad"]), minimum: z.string().regex(/^\d{1,7}(\.\d{1,3})?$/) }).parse(await body(request));
      return json(await db.ingredient.create({ data }), 201);
    }
    if (parts[0] === "inventory" && parts[2] === "movements" && method === "POST") {
      const actor = await requireUser(["ADMIN"]);
      const data = z.object({ quantity: z.string().regex(/^-?\d{1,7}(\.\d{1,3})?$/), reason: z.string().trim().min(5).max(300), kind: z.enum(["ENTRADA", "MERMA", "AJUSTE"]) }).parse(await body(request));
      const quantity = new Prisma.Decimal(data.quantity);
      assert(!quantity.isZero() && (data.kind !== "ENTRADA" || quantity.gt(0)) && (data.kind !== "MERMA" || quantity.lt(0)), 422, "Cantidad incompatible con el movimiento");
      return json(await serial(async tx => {
        const ingredientId = z.cuid().parse(parts[1]);
        const updated = await tx.ingredient.updateMany({ where: { id: ingredientId, ...(quantity.lt(0) ? { stock: { gte: quantity.abs() } } : {}) }, data: { stock: { increment: quantity } } });
        assert(updated.count, 409, "El movimiento dejaría stock negativo");
        return tx.stockMovement.create({ data: { ingredientId, quantity, reason: data.reason, kind: data.kind, actorId: actor.id } });
      }), 201);
    }
    if (parts[0] === "products" && parts[2] === "recipe" && method === "PUT") {
      await requireUser(["ADMIN"]);
      const items = z.array(z.object({ ingredientId: z.cuid(), quantity: z.string().regex(/^\d{1,7}(\.\d{1,3})?$/).refine(v => Number(v) > 0) })).max(100).parse(await body(request));
      assert(new Set(items.map(i => i.ingredientId)).size === items.length, 422, "Hay insumos repetidos");
      const productId = z.cuid().parse(parts[1]);
      await db.$transaction(async tx => { await tx.recipeItem.deleteMany({ where: { productId } }); await tx.recipeItem.createMany({ data: items.map(i => ({ ...i, productId })) }); });
      return json({ ok: true });
    }

    if (path === "suggestions" && method === "POST") { await rateLimit(request, "feedback", 8); return json(await db.suggestion.create({ data: feedbackInput.parse(await body(request)) }), 201); }
    if (path === "claims" && method === "POST") {
      await rateLimit(request, "claims", 8);
      const provider = business();
      assert(provider.name && /^\d{11}$/.test(provider.ruc) && provider.address, 503, "Falta configurar los datos del proveedor. Solicita el Libro de Reclamaciones al personal.");
      const data = claimInput.parse(await body(request));
      const access = randomBytes(32).toString("base64url");
      const claim = await db.$transaction(async tx => {
        const record = await tx.claim.create({ data: { ...data, amount: data.amount || null, accessHash: digest(access), provider } });
        await event(tx, "claim.created", record.id, `Nueva hoja #${record.number}`, await staffIds(tx, ["ADMIN"]));
        return record;
      });
      return json({ id: claim.id, number: claim.number, access }, 201);
    }
    if (parts[0] === "claims" && parts[1] && method === "GET") {
      const claim = await db.claim.findUnique({ where: { id: z.cuid().parse(parts[1]) } });
      assert(claim && token(request) && digest(token(request)!) === claim.accessHash, 404, "Hoja no encontrada");
      const { accessHash: _, ...result } = claim; return json(result);
    }
    if (path === "feedback" && method === "GET") {
      await requireUser(["ADMIN"]);
      const claims = await db.claim.findMany({ orderBy: { createdAt: "desc" }, take: 100, omit: { accessHash: true } });
      return json({ claims, suggestions: await db.suggestion.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), ratings: await db.rating.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) });
    }
    if (parts[0] === "claims" && parts[1] && method === "PATCH") {
      const actor = await requireUser(["ADMIN"]);
      const data = z.object({ response: z.string().trim().min(10).max(4000) }).parse(await body(request));
      await db.$transaction(async tx => {
        await tx.claim.update({ where: { id: z.cuid().parse(parts[1]) }, data: { response: data.response, respondedAt: new Date(), status: "RESPONDIDO" } });
        await event(tx, "claim.response", parts[1], "Respuesta a hoja", []);
        await tx.auditLog.create({ data: { actorId: actor.id, action: "claim.response", resource: parts[1] } });
      }); return json({ ok: true });
    }

    if (path === "users" && method === "GET") { await requireUser(["ADMIN"]); return json({ users: await db.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { name: "asc" } }) }); }
    if (parts[0] === "users" && parts[1] && method === "PATCH") {
      const actor = await requireUser(["ADMIN"]);
      assert(parts[1] !== actor.id, 409, "No cambies tus propios permisos desde esta pantalla");
      const data = z.object({ role: z.enum(["ADMIN", "WAITER", "KITCHEN", "CASHIER", "CUSTOMER"]).optional(), active: z.boolean().optional() }).parse(await body(request));
      await db.$transaction(async tx => { await tx.user.update({ where: { id: z.cuid().parse(parts[1]) }, data }); await tx.session.deleteMany({ where: { userId: parts[1] } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "user.permissions", resource: parts[1] } }); });
      return json({ ok: true });
    }
    if (path === "reports" && method === "GET") {
      await requireUser(["ADMIN", "CASHIER"]);
      const [orders, payments, lowStock] = await Promise.all([db.order.groupBy({ by: ["status"], _count: true, _sum: { total: true } }), db.payment.aggregate({ _sum: { amount: true }, _count: true }), db.ingredient.findMany()]);
      return json({ orders, collected: payments._sum.amount || "0.00", paymentCount: payments._count, lowStock: lowStock.filter(i => i.active && i.stock.lte(i.minimum)) });
    }
    throw new HttpError(404, "Ruta no encontrada");
  } catch (error) { return failure(error); }
}
export { route as GET, route as POST, route as PATCH, route as PUT };
