---
name: prisma-esquema-migraciones
description: Cambios al esquema Prisma/PostgreSQL del restaurante y su flujo de migraciones (packages/database/prisma/schema.prisma, npm run db:*). Úsala al añadir modelos, campos, enums, índices o restricciones, generar o desplegar migraciones, escribir semillas, o decidir tipos de columna (dinero, fechas, estados).
---

# Esquema Prisma y migraciones

Fuente: `docs/DATOS.md`. Esquema: `packages/database/prisma/schema.prisma`. Cliente compartido: `packages/database/src/index.ts` (exporta `db`, `Prisma`, `Role`, `OrderStatus`, `Station`).
Migraciones versionadas en `packages/database/prisma/migrations/` (la primera es `202611190001_initial`); semilla en `packages/database/src/seed.ts`. Las migraciones ya creadas no se editan: cada cambio es una migración nueva.
Versión fijada: **Prisma 6.19.3** (`prisma` y `@prisma/client` exactos en `package.json`, generador `prisma-client-js`). No mezclar comandos ni archivos de Prisma 7 (`prisma.config.ts`, adapters, `migration plan`) sin una decisión explícita de actualizar.

## Comandos (siempre vía scripts del repo, nunca CLI global)

| Script | Uso |
|---|---|
| `npm run db:validate` | Validar el esquema |
| `npm run db:generate` | Regenerar cliente tras cambiar el esquema |
| `npm run db:migrate -- --name <cambio>` | Crear y aplicar migración **solo en desarrollo** |
| `npm run db:deploy` | Aplicar migraciones versionadas (CI/staging/producción, tarea única por release) |
| `npm run db:seed` | Semilla local (`SEED_DEMO=true` solo en local) |
| `npm run db:studio` | Inspección local; nunca para editar producción |

Prohibido en entornos compartidos: `prisma migrate reset`, `prisma db push`, borrar volúmenes, editar producción a mano desde Studio/SQL sin intervención registrada.

## Convenciones del esquema

- IDs: `String @id @default(cuid())`; validar en API con `z.cuid()`. Correlativos visibles (`number`) con `@default(autoincrement())` y `@unique`.
- Dinero: `Decimal @db.Decimal(12, 2)`; cantidades de insumo `Decimal @db.Decimal(14, 3)`. Nunca `Float`.
- Instantes: `DateTime @db.Timestamptz(3)`, guardados en UTC; se muestran en `America/Lima`.
- Estados con flujo: `enum` Prisma + columna `version Int @default(0)` para concurrencia optimista + tabla de historial.
- Snapshots históricos: los ítems copian `name`, `price`, `station` del producto; desactivar (`active=false`) en vez de borrar productos, usuarios o mesas.
- Unicidad que protege negocio: `idempotencyKey`, `[orderId, kind]` de puntos, `[eventId, userId]` de notificaciones, `orderId` de valoraciones.
- Índices para consultas operativas: estado + antigüedad, atención abierta (`[tableId, closedAt]`), destinatario + secuencia, vencimientos.
- Secretos/tokens: guardar solo hash (`tokenHash`, `accessHash`, `trackingHash`).
- Restricciones que Prisma no expresa (cantidades > 0, notas 1–5, precio ≥ 0, una atención abierta por mesa con índice parcial) → SQL añadido a mano dentro del archivo de migración generado, revisado y versionado.
- Nombres de modelos en inglés (estado actual del código); textos y mensajes en español.

## Flujo para un cambio

1. Editar `schema.prisma` → `npm run db:validate`.
2. `npm run db:migrate -- --name descripcion_corta` en una base local aislada; revisar el SQL generado (bloqueos, pérdida de datos, índices en tablas grandes, `NOT NULL` sin default).
3. `npm run db:generate` y `npm run typecheck`.
4. Actualizar contratos Zod, servicios y pruebas.
5. CI reconstruye base vacía y aplica todas las migraciones; staging mide duración/bloqueos.
6. Cambio incompatible = **expandir → desplegar código compatible → rellenar/verificar → retirar** en otra entrega. Sin rollback automático: corrección hacia delante o restauración ensayada.
7. Producción: respaldo restaurable antes de `db:deploy`, con credenciales de migración distintas a las de ejecución.

## Semillas

Solo configuración necesaria en producción. Sin cuentas demo ni la carta de cafetería heredada como menú final. Contraseñas de semilla desde `SEED_PASSWORD`, nunca fijas en el código.

Para reglas generales de PostgreSQL (tipos, índices, bloqueos) carga también `supabase-postgres-best-practices`; para la API de consultas, `prisma-client-api`.
