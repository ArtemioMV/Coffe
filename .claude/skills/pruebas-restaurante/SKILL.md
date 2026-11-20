---
name: pruebas-restaurante
description: Estrategia y recetas de pruebas del restaurante: unitarias (Vitest, tests/unit), integración de servicios contra PostgreSQL embebido efímero (tests/integration) y extremo a extremo con Playwright (tests/e2e), más los criterios de aceptación. Úsala al escribir o ejecutar pruebas, probar concurrencia o idempotencia, o comprobar que una funcionalidad cumple los requisitos antes de darla por terminada.
---

# Pruebas del restaurante

Fuentes: `docs/REQUISITOS.md` (Administración y aceptación), `docs/NOTIFICACIONES.md` (Verificación), `docs/DESARROLLO.md`.

## Niveles y comandos

| Nivel | Comando | Carpeta / config | Necesita |
|---|---|---|---|
| Unitarias | `npm test` | `tests/unit/**/*.test.ts` · `vitest.config.ts` | Nada |
| Integración | `npm run test:integration` | `tests/integration/**/*.test.ts` · `vitest.integration.config.mts` | Nada: levanta su propio PostgreSQL embebido |
| E2E | `npm run test:e2e` | `tests/e2e/*.spec.ts` · `playwright.config.ts` · `scripts/e2e.mjs` | PostgreSQL local en `DATABASE_URL` (crea y borra una base `restaurant_test_*`) |

Antes de declarar algo terminado: `npm run typecheck`, `npm test` y `npm run test:integration` (y E2E si tocaste UI o rutas).

## Unitarias

Lógica pura de `packages/contracts`: `cents/decimal/money`, `nextStatus` (la matriz completa estado × acción × rol está en `tests/unit/contracts.test.ts`: si añades un estado o acción, actualiza su tabla `PERMITIDAS`/`ROLES_POR_ACCION`), esquemas Zod, cálculos de plazos.

## Integración (servicios + PostgreSQL real)

Cómo funciona: `tests/integration/global-setup.ts` crea un clúster `embedded-postgres` en una carpeta temporal y puerto libre, aplica las **migraciones versionadas** (`prisma migrate deploy`) y lo destruye al terminar. `setup-env.ts` fija `DATABASE_URL`, `AUTH_SECRET` y quita `REDIS_*` antes de importar los servicios. El alias `@/` apunta a `apps/web/src`.

- Llama a los servicios directamente (`createOrder`, `changeOrder`, `payOrder`, `closeTable`…) con actores creados por `helpers.ts` (`user`, `product`, `ingredient`, `openTable`, `orderBody`, `key`).
- `expectStatus(promesa, 409)` comprueba el estado HTTP que vería el cliente (misma traducción que `failure()`).
- **Concurrencia**: lanza dos operaciones con `Promise.allSettled` y verifica que exactamente una gana y el estado final es coherente (versión, stock, sumas, puntos).
- Cada prueba crea sus propios datos con nombres únicos; no dependas del orden ni limpies tablas.
- No mockear PostgreSQL: el objetivo son los errores reales (`P2002`, `P2034`, serialización).

Cubierto hoy: total en servidor y snapshot, outbox + avisos en la misma transacción, idempotencia (repetición, contenido distinto, doble clic simultáneo), precio cambiado, agotado, mesa sin atención, versión optimista concurrente, permisos del mozo, cocina sin solicitudes no confirmadas, acuse ≠ entrega, stock sin negativos y devolución al cancelar, cobros parciales/exceso/idempotentes/concurrentes, puntos una sola vez, cierre de mesa con saldo.

Falta: worker/outbox (despacho, reintentos, recordatorios 60/120 s), SSE (cursor y reconexión), libro (plazos con feriados), recuperación de contraseña, Redis caído con Redis configurado.

## E2E (Playwright)

Varios contextos (`playwright.request.newContext`) por rol con `Origin` correcto; cuentas de la semilla `@restaurante.test` con `SEED_PASSWORD`. Comprobar que el pedido aparece sin recarga, que el aviso de listo llega al mozo correcto, permisos, viewport móvil (390×844) sin desbordes y navegación con teclado. Solo se permite contra origen local.

## Convenciones

Nombres de prueba en español que describan la regla. Esperas por condición (`expect.poll`), nunca `sleep` fijos. Dinero como string `"12.50"` o céntimos enteros.

## Criterios de aceptación (checklist)

- [ ] Dos dispositivos ven el pedido sin recarga; objetivo p95 < 3 s desde commit (20 dispositivos, 10 pedidos/min, medir en staging).
- [ ] Pedido nuevo avisa a su estación; listo avisa al mozo asignado con mesa y acción; sin asignado → encargado.
- [ ] Reinicio, reconexión y Redis caído no pierden pedidos ni avisos pendientes; se distinguen visibilidad, lectura, acuse y entrega.
- [ ] Concurrencia no duplica pagos ni puntos ni permite transiciones incompatibles; permisos por recurso verificados.
- [ ] Libro sin login, constancia aunque falle el correo, vencimientos probados con fines de semana y feriados.
- [ ] Móvil, tablet y teclado; color y sonido nunca son la única señal.
