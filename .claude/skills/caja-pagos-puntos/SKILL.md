---
name: caja-pagos-puntos
description: Reglas de dinero, caja, pagos, conciliación, reembolsos y puntos de fidelización del restaurante (soles PEN, céntimos enteros, IGV, idempotencia de cobros, abono y reverso de puntos). Úsala al tocar apps/web/src/modules/caja, cálculos de totales, cents/decimal/money, Payment, PointEntry, reportes de ventas o tickets.
---

# Caja, pagos y puntos

Fuentes: `docs/REQUISITOS.md` (Estados y reglas), `docs/DATOS.md` (Integridad). Código: `apps/web/src/modules/caja/service.ts`, helpers en `packages/contracts/src/index.ts`.

## Dinero: reglas duras

- Moneda **PEN**, mostrada como `S/` con `money()` (`Intl.NumberFormat("es-PE", { currency: "PEN" })`).
- En BD: `Decimal @db.Decimal(12, 2)`. En código: **céntimos enteros** con `cents("12.50") → 1250` y `decimal(1250) → "12.50"`. Prohibido sumar `number` decimales o usar `parseFloat` para importes.
- Entradas de importe como string validado `^\d{1,6}(\.\d{1,2})?$`; nunca `z.number()` para dinero.
- Desde Prisma: `price.toFixed(2)` antes de `cents()`; para cantidades de insumo usar métodos de `Prisma.Decimal` (`mul`, `negated`, `gte`).
- Los precios de la carta **incluyen IGV** (referencia `IGV_RATE=0.18`). No fijar tasas productivas ni desglosar impuestos sin confirmar la política fiscal.
- El ticket interno **no es comprobante electrónico** (`fiscal.enabled: false`, `INVOICE_PROVIDER=disabled`). Nunca rotular un ticket como boleta/factura.

## Pagos

- Solo `ADMIN` y `CASHIER` registran cobros. Métodos: `EFECTIVO`, `TARJETA`, `TRANSFERENCIA`; los no efectivo exigen `reference` (≥ 3) porque elegir método no demuestra cobro: las transferencias requieren conciliación autorizada.
- `Idempotency-Key` obligatorio; repetir con los mismos datos devuelve el pago previo, con otros datos → 409.
- Pedido cobrable en `PENDING/PREPARING/READY/DELIVERED`. **Nunca** permitir exceso de cobro: `pagado + importe <= total`.
- Saldo = cargos válidos − pagos netos confirmados. Pagos parciales permitidos.
- Pagos no se borran ni editan: correcciones como reverso/reembolso trazable (entidades previstas `reembolsos`, `sesiones_caja`, `movimientos_caja`; aún no existen). Cada pago → `auditLog` `payment.create` y evento `payment.confirmed`.
- Webhooks de pasarela (futuro): firma verificada, importe validado y referencia única.

## Puntos

- Regla vigente (configurable): **1 punto por S/ 1 pagado**; canje **100 puntos = S/ 5** (`PUNTOS_POR_SOL`, `PUNTOS_CANJE_BLOQUE`, `SOLES_POR_BLOQUE_CANJE`).
- Se abonan **una sola vez** cuando el pedido queda saldado, dentro de la misma transacción del pago. Unicidad garantizada por `@@unique([orderId, kind])` en `PointEntry` (`kind: "EARNED"`).
- `User.points` es un saldo desnormalizado: todo cambio de saldo va acompañado de su `PointEntry` (libro de movimientos). Nunca actualizar `points` sin movimiento.
- Reembolso → registrar ajuste/reverso proporcional (pendiente de implementar). Canje ligado a una compra concreta con control de saldo en transacción; un clic en el perfil no consume puntos sin descuento registrado.
- Nunca abonar puntos al crear el pedido: solo al confirmar el cobro que lo salda.

## Reportes

Separar siempre: pedidos creados, ventas **cobradas**, cancelaciones/reembolsos, tiempos y puntos. No mezclar «total de pedidos» con «dinero cobrado».

## Pruebas obligatorias al cambiar algo aquí

Redondeo (0.1 + 0.2), pagos parciales que suman exactamente el total, exceso de cobro → 409, reintento idempotente, dos cajeros cobrando a la vez (serializable), puntos abonados una sola vez y nunca a pedidos sin cliente.
