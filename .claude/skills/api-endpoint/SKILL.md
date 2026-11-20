---
name: api-endpoint
description: Cómo añadir o modificar un endpoint de la API REST v1 del restaurante (Next.js route handler catch-all en apps/web/src/app/api/v1/[...path]/route.ts). Úsala al crear rutas, validar entradas con Zod, aplicar permisos por rol, rate limit, idempotencia, auditoría o manejar errores HTTP en el backend TypeScript.
---

# Endpoints de la API v1

Toda la API vive en un único route handler: `apps/web/src/app/api/v1/[...path]/route.ts`.
Despacha por `path` (segmentos unidos con `/`) y `method`. Exporta `GET`, `POST`, `PATCH`, `PUT`.
El handler **solo** autentica, valida y delega; la lógica de negocio va en `apps/web/src/modules/<modulo>/service.ts`.

## Piezas disponibles (no reinventar)

| Pieza | Dónde | Uso |
|---|---|---|
| `assert(cond, status, msg)` | `@/lib/http` | Corta con `HttpError`; mensaje en español para el usuario final |
| `HttpError` | `@/lib/http` | Errores con estado HTTP explícito |
| `body(request)` | `@/lib/http` | JSON con límite de 32 KB; nunca `request.json()` directo |
| `json(data, status)` | `@/lib/http` | Respuesta con `Cache-Control: no-store` |
| `failure(error)` | `@/lib/http` | Traduce `HttpError`, `ZodError` (422) y Prisma `P2002/P2025/P2034` |
| `checkOrigin` | `@/lib/http` | Ya se aplica a todo método distinto de GET/HEAD (CSRF por origen) |
| `requireUser(roles?)` | `@/modules/identidad/service` | 401 sin sesión, 403 sin rol |
| `currentUser()` | idem | Usuario opcional (visitante permitido) |
| `rateLimit(request, grupo, max)` | `@/lib/rate-limit` | Redis con respaldo en memoria; ventana de 60 s |
| `serial(fn)` | `@/modules/pedidos/service` | Transacción `Serializable` con 2 reintentos ante `P2034` |
| `event(tx, tipo, id, titulo, destinatarios)` | `@/modules/notificaciones/service` | Outbox + notificación en la **misma** transacción |
| Esquemas Zod | `@restaurant/contracts` | Contratos compartidos cliente/servidor |

## Receta

1. **Contrato**: si el cliente también lo usa, define el esquema Zod en `packages/contracts/src/index.ts`; si es interno, inline con `z.object(...)`. Usa `.trim()`, `.max()`, `z.cuid()` para IDs, importes como string `^\d{1,6}(\.\d{1,2})?$` (nunca `number` para dinero).
2. **Orden de comprobaciones** dentro de la rama:
   1. `rateLimit` si es público o sensible (login, pedidos, reclamos, valoraciones).
   2. `requireUser([...roles])` con el **mínimo** de roles (`ADMIN`, `WAITER`, `KITCHEN`, `CASHIER`, `CUSTOMER`).
   3. Parsear IDs de la URL con `z.cuid().parse(parts[n])`.
   4. Parsear cuerpo: `esquema.parse(await body(request))`.
   5. Llamar al servicio.
3. **Propiedad del recurso**, no solo rol: un mesero solo actúa sobre atenciones donde `waiterId === actor.id`; un cliente solo sobre sus pedidos. Para recursos ajenos responde **404** (no 403) para no revelar existencia (ver `accessibleOrder`).
4. **Escrituras con varias tablas** → `serial(async tx => ...)`. Estado + historial + evento outbox + auditoría van juntos; sin commit no hay confirmación.
5. **Idempotencia** en creaciones con efectos (pedidos, pagos): cabecera `Idempotency-Key` (20–100 chars `[a-zA-Z0-9_-]`), guardar `idempotencyKey` único y `requestHash`; misma clave + mismo contenido → devolver el resultado previo; contenido distinto → 409.
6. **Concurrencia**: transiciones con `version` y `updateMany({ where: { id, version } })`; si `count !== 1` → 409 «El pedido cambió».
7. **Auditoría**: cambios de roles, precios, pagos, estados, mesas y respuestas al libro → `tx.auditLog.create({ data: { actorId, action: "recurso.accion", resource: id } })`. Nunca guardar secretos ni datos personales del reclamo en la auditoría.
8. **Caché**: si cambias catálogo, llama a `invalidateMenu()`. Nunca uses caché para autorizar ni para precios en checkout.
9. **Respuesta**: `json(resultado, 201)` en creaciones. Proyecta campos (como `orderView`, `safeUser`, `omit: { accessHash: true }`); nunca devuelvas `passwordHash`, `tokenHash`, `accessHash`, `trackingHash`, `requestHash`.

## Plantilla

```ts
if (parts[0] === "recurso" && parts[1] && parts[2] === "accion" && method === "POST") {
  await rateLimit(request, "recurso", 30);
  const actor = await requireUser(["ADMIN"]);
  const id = z.cuid().parse(parts[1]);
  const data = recursoInput.parse(await body(request));
  const result = await serial(async tx => {
    const current = await tx.recurso.findUnique({ where: { id } });
    assert(current, 404, "Recurso no encontrado");
    const updated = await tx.recurso.update({ where: { id }, data });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "recurso.accion", resource: id } });
    return updated;
  });
  return json(result);
}
```

## Errores frecuentes a evitar

- Confiar en `X-Forwarded-For` del cliente (solo `x-real-ip` con `TRUST_PROXY=true` detrás de Nginx).
- Calcular totales con `number` en coma flotante → usa `cents()`/`decimal()` de `@restaurant/contracts`.
- Enviar avisos fuera de la transacción o antes del commit.
- Mensajes de error técnicos al usuario; `failure()` ya registra `api_error` sin detalles sensibles.
- Olvidar el caso 404 final: la cadena termina en `throw new HttpError(404, "Ruta no encontrada")`.

Si el archivo de rutas crece demasiado, proponer dividir por módulo (p. ej. `routes/pedidos.ts`) manteniendo el mismo patrón, pero no hacerlo sin pedirlo.
