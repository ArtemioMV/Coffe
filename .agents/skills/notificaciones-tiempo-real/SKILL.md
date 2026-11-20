---
name: notificaciones-tiempo-real
description: Diseño e implementación de avisos operativos del restaurante (outbox en PostgreSQL, worker BullMQ, SSE al navegador, bandeja persistente, acuse del mesero, escalamiento, sonido en cocina). Úsala al trabajar con OutboxEvent, Notification, event()/staffIds(), apps/worker, Redis colas, Server-Sent Events, polling, toasts de "pedido listo" o reconexión.
---

# Notificaciones y tiempo real

Fuente: `docs/NOTIFICACIONES.md`. Código actual:

- `apps/web/src/modules/notificaciones/service.ts`: `event()` (outbox + notificaciones en la transacción) y `staffIds()`.
- `apps/web/src/app/api/v1/events/route.ts`: SSE autenticado. Lee `Notification` con `sequence > cursor` cada 1.5 s, envía `id: <sequence>` + heartbeat, acepta `Last-Event-ID` o `?after=`, y cierra a los 60 s para que la reconexión vuelva a validar la sesión.
- `apps/worker/src/index.ts`: cada 3 s encola en BullMQ (`restaurant-outbox`, `jobId` = id del evento, 8 intentos con backoff exponencial) los eventos sin `processedAt`. Envía correos de `auth.reset` y `claim.*`; sin SMTP la tarea falla y queda pendiente. Además crea recordatorios durables de «listo sin acuse» a 60 s (mesero) y 120 s (+ administradores), con `eventId` determinista para no repetir.
- Pendiente: lease/`SKIP LOCKED` si corre más de un worker, rol encargado (hoy escala a ADMIN), señal entre instancias vía Redis para no consultar la base cada 1.5 s por conexión.

## Principio: PostgreSQL es la verdad, Redis solo transporta

1. La transacción de negocio llama a `event(tx, tipo, aggregateId, titulo, destinatarios, cuerpo)`: crea `OutboxEvent` **y** las `Notification` por destinatario (únicas por `eventId+userId`) en el mismo commit. Sin commit no hay aviso ni confirmación.
2. Un dispatcher en el worker toma eventos `processedAt IS NULL` con bloqueo/lease (`FOR UPDATE SKIP LOCKED` vía `$queryRaw` o `updateMany` condicional), publica en BullMQ con `jobId` = id del evento, incrementa `attempts`, guarda `lastError`, y marca `processedAt` **después** de persistir resultados.
3. El worker envía canales externos (correo con nodemailer; WhatsApp/SMS/push solo con proveedor y consentimiento). Sin SMTP configurado, la tarea queda pendiente, no se descarta.
4. SSE autenticado (`text/event-stream`) avisa al navegador; el navegador **invalida y vuelve a leer** el estado autorizado vía API. El evento SSE no transporta datos sensibles.
5. Reconexión: cursor = `Notification.sequence`; usar `Last-Event-ID`; si caducó, leer bandeja pendiente. Mostrar «desconectado / última sincronización» y polling de respaldo limitado.

Entrega **al menos una vez**; consumidores idempotentes. Reintentos con backoff exponencial + jitter y límite; fallo visible y reintento autorizado. Un reconciliador detecta outbox pendiente aunque se pierda una tarea en Redis. Redis Pub/Sub no guarda mensajes: nunca es la única fuente.

## SSE en Next.js (reglas para cambiar la ruta existente)

- Route handler con `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `ReadableStream`, cabeceras `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.
- Heartbeat (comentario `: ping`) cada ~20 s; cerrar en `request.signal.abort`.
- Autenticar con la cookie de sesión (`requireUser`) y filtrar **solo** las notificaciones del usuario. Ningún usuario recibe eventos ajenos.
- Nginx: `proxy_buffering off`, `proxy_read_timeout` alto en la ruta de eventos.
- Con varias instancias, distribuir señales entre ellas vía Redis, nunca memoria local.

## Estados del aviso

Por destinatario: creada → disponible → leída (`readAt`) → atendida (`acknowledgedAt` + actor). Por canal: pendiente, intentando, enviada, fallida. «Leído» ≠ «plato entregado»; SSE emitido o correo aceptado no demuestra lectura. Las acciones `acknowledge`, `deliver`, `reject`, `cancel` cierran los avisos pendientes del pedido.

## Escalamiento (configurable)

Listo sin acuse: recordar a 60 s y escalar al encargado a 120 s. Un aviso por umbral, revalidando que sigue pendiente. Sin mesero asignado → encargado. Reasignación transfiere pendientes y se audita. Libro de reclamaciones: recordatorios a 5, 2 y 1 día hábil y alerta diaria si venció (calculado en servidor, nunca con temporizadores del navegador).

## UI de avisos

- Bandeja persistente con tarjeta: mesa, pedido, estación, tiempo transcurrido, responsable y acción («Voy a recoger»). El toast complementa, nunca sustituye.
- Botón «Activar sonido» al iniciar turno (los navegadores bloquean audio sin interacción) con prueba audible; sonidos distintos para nuevo/listo; repetición limitada; coordinar pestañas (BroadcastChannel) para no duplicar.
- `aria-live="polite"` para avisos; color/sonido siempre acompañados de texto. Notificaciones del SO con contenido mínimo, sin datos de reclamantes, teléfonos ni direcciones.

## Verificación

Pedido nuevo, listo, reasignado, cancelado; usuario ausente, varias pestañas, audio bloqueado, SSE cortado, worker reiniciado, Redis caído, duplicados, correo fallido. Medir latencia desde el commit (objetivo p95 < 3 s con 20 dispositivos y 10 pedidos/min, por medir en staging).
