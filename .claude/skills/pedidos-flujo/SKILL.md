---
name: pedidos-flujo
description: Reglas del flujo de pedidos, mesas/atenciones y comandas de cocina/barra del restaurante (estados, transiciones por rol, idempotencia, versión optimista, consumo de insumos). Úsala al tocar apps/web/src/modules/pedidos, mesas, nextStatus/rolesForAction en packages/contracts, o cualquier lógica de crear, confirmar, preparar, marcar listo, recoger, entregar, rechazar o cancelar pedidos.
---

# Flujo de pedidos, mesas y comandas

Fuente de requisitos: `docs/REQUISITOS.md` (Flujo de atención, Estados y reglas). Implementación: `apps/web/src/modules/pedidos/service.ts`, `apps/web/src/modules/mesas/service.ts`, máquina de estados en `packages/contracts/src/index.ts`.

## Flujo completo (primer objetivo del proyecto)

pedido → aviso a cocina → preparación → listo → aviso al mesero → «Voy a recoger» → entrega → cobro → cierre de mesa → puntos → invitación a valorar.

## Máquina de estados implementada (nivel pedido)

```
AWAITING_WAITER --confirm(WAITER/ADMIN)--> PENDING --prepare(KITCHEN/ADMIN)--> PREPARING
PREPARING --ready(KITCHEN/ADMIN)--> READY --acknowledge(WAITER/ADMIN)--> READY (+acknowledgedAt)
READY --deliver(WAITER/ADMIN)--> DELIVERED
AWAITING_WAITER --reject--> REJECTED        cualquier no final --cancel(ADMIN)--> CANCELLED
```

- `AWAITING_WAITER`: pedido hecho por QR de mesa; el mesero lo revisa antes de enviarlo a cocina.
- **Toda** transición pasa por `nextStatus(status, action, role)`; nunca asignar `status` directamente.
- Añadir un estado/acción = actualizar `transitions`, `rolesForAction`, `statusLabels`, el enum Prisma `OrderStatus`, `transitionInput` y pruebas unitarias de la tabla completa.

## Invariantes (no romper)

1. **Precio en servidor**: el cliente envía `productId`, `quantity`, `notes` y `expectedPrice` (el precio que vio). El servidor lee precio, nombre y estación y los copia al `OrderItem` (snapshot histórico); `expectedPrice` **solo** sirve para detectar un cambio y pedir confirmación del resumen revisado, nunca como precio cobrado. Productos repetidos en el carrito → 422 «Agrupa las cantidades».
2. **Disponibilidad**: producto `active && available` y categoría activa, comprobado al crear **y** al confirmar.
3. **Idempotencia**: `Idempotency-Key` + `requestHash`; repetir = mismo resultado; mismo key con otro contenido = 409.
4. **Versión optimista**: el cliente envía `version`; `updateMany({ where: { id, version } })`; conflicto → 409 y recargar. Sin sobrescritura silenciosa.
5. **Una transacción** (`serial`) para estado + `OrderHistory` + evento outbox + notificaciones.
6. **Motivo obligatorio** (≥ 5 caracteres) en `reject` y `cancel`. Cancelar con pagos registrados → 409: el reverso del pago se resuelve aparte.
7. **Insumos**: el consumo de receta se descuenta al **confirmar**, nunca al recibir la solicitud QR. `updateMany` con `stock: { gte }` evita stock negativo; registrar `StockMovement` tipo `CONSUMO`.
8. **Acuse ≠ entrega**: `acknowledge` («Voy a recoger») solo registra `acknowledgedAt` y apaga la alarma; `deliver` confirma la entrega física. Son acciones distintas.
9. **Permisos por propiedad**: un `WAITER` solo actúa sobre pedidos de su atención (`attention.waiterId`). Cocina ve `PENDING/PREPARING/READY`. Cliente solo los suyos; invitado con token de seguimiento (`trackingHash`).
10. **Cobro y entrega son independientes**: cobrar antes no cambia el estado del plato.

## Mesas y atenciones

- Una sola `Attention` abierta (`closedAt: null`) por mesa; abrirla registra al mesero responsable.
- Cerrar solo si todos los pedidos están `REJECTED/CANCELLED` o `DELIVERED` **y** pagados por completo; si no → 409 «Hay pedidos pendientes de entrega o pago».
- El QR (`qrToken`, 24 bytes aleatorios) identifica la mesa pero **no autoriza** nada por sí solo; se puede rotar (`rotate-qr`, auditado). Pedir por QR exige atención abierta.
- Desactivar mesa con atención abierta → 409.

## Diferencias con el destino documentado (pendientes)

El documento prevé estados por **ítem/comanda** y por estación (`pendiente → aceptado → en_preparacion → listo → entregado`), con el pedido derivado de sus ítems (listo cuando todos los no cancelados están listos; entrega parcial no cierra el resto), reasignación de mesero auditada y escalamiento al encargado. Hoy el estado es a nivel pedido. Si implementas comandas por estación, plantea primero el cambio de modelo (skill `prisma-esquema-migraciones`) y conserva compatibilidad con los paneles actuales.

## Pruebas mínimas al cambiar algo aquí

- Tabla completa de `nextStatus` (acción × estado × rol), incluidas las prohibidas.
- Doble clic / reintento con la misma clave → un solo pedido.
- Dos dispositivos cambian el mismo pedido → uno recibe 409.
- Producto agotado entre carrito y confirmación → 409 y resumen revisado.
- Mesero ajeno → 403/404; cocina no ve `AWAITING_WAITER`.
