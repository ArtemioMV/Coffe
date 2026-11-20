# Notificaciones y alertas operativas

La aplicación cuenta con bandeja persistente, SSE y consulta de respaldo. Las comandas parciales por estación y el calendario de vencimientos siguen pendientes. [DESARROLLO.md](DESARROLLO.md)

## Eventos

| Evento | Destinatarios | Aviso/acción |
|---|---|---|
| Solicitud creada/ampliada desde QR | Mozo asignado y administración | Mesa, ítems y observaciones; confirmar o rechazar con motivo. Al resolverse, el aviso queda «Resuelto» y no cuenta como pendiente |
| Pedido confirmado por el mozo (o tomado por él) | Cocina/barra afectada; confirmación a cliente; mozo de la mesa si lo tomó administración | Nueva comanda («Pedido #12 · comanda 2» si se sumó a un pedido abierto); cocina no recibe solicitudes sin confirmar. Quien actúa no recibe aviso de su propia acción |
| Preparación iniciada | Mesero y cliente correspondiente | Actualizar estado sin alarma repetitiva |
| Ítem/comanda lista | Mesero asignado; encargado si falta | Prioritario: «Mesa 7 · Pedido #123 · listo»; «Voy a recoger» |
| Pedido listo para recojo | Cliente y personal de entrega | Seguimiento y correo opcional |
| Plato entregado | Cliente y caja/mesero | Actualizar cuenta y pendientes |
| Cancelación/corrección | Estaciones, mesero, caja y cliente afectados | Motivo permitido por rol y cambio realizado |
| Agotado | Atención y cartas activas | Bloquear selección y revisar carritos afectados |
| Demora de preparación/recogida | Responsable y encargado | Edad y acción concreta |
| Pago confirmado/reversado | Caja y titular | Resultado y referencia |
| Puntos/canje/reverso | Cliente | Movimiento y saldo verificado |
| Reclamo/queja recibido | Consumidor y responsable autorizado | Constancia/nueva hoja; sin datos privados en banners |
| Reclamo por vencer/vencido | Responsable y administrador autorizado | Fecha límite y acceso privado |
| Respuesta al reclamo | Consumidor | Canal registrado y evidencia de envío |
| Sugerencia recibida/respondida | Administrador; remitente con contacto | Acuse y seguimiento |
| Invitación a valorar | Cliente con consumo elegible | Una por pedido entregado |
| Fallo de canal/cola | Administrador técnico | ID de incidencia sin datos sensibles |

Bandeja interna como canal principal del personal. Correo para constancias, respuestas y recuperación. Notificaciones del navegador requieren permiso/compatibilidad. WhatsApp/SMS/push quedan como integraciones opcionales con proveedor y consentimiento; tener un teléfono configurado no implementa esos canales.

## Fiabilidad

1. La transacción de negocio guarda cambio y evento en `outbox_events`. Sin commit no hay confirmación ni aviso de éxito.
2. Dispatcher toma eventos con bloqueo/lease y reintenta publicación en BullMQ; ID estable, versión de evento y correlación.
3. Worker crea notificaciones durables en PostgreSQL con unicidad evento/destinatario/tipo; intentos y resultados por canal.
4. SSE autenticado avisa al navegador, que invalida consultas y lee estado autorizado. Heartbeat y cursor persistente ordenable; recuperar tras `Last-Event-ID` cuando sea posible.
5. Reconexión/nueva sesión/cursor caducado consulta bandeja pendiente y estado actual. Mostrar desconexión, última sincronización y polling de respaldo limitado.
6. Mesero registra acuse de recogida en servidor; quita alarma de atención. «Entregado» confirma entrega física por separado.

Entrega **al menos una vez**, consumidores idempotentes; sin promesa de exactamente una vez. Marcar procesado después de persistir resultados. Repetición tras caída no duplica avisos, cobros ni puntos. Reintentos con espera exponencial y variación; límite con fallo visible y reintento autorizado. Reconciliador detecta outbox pendiente/entregas estancadas aunque se pierda una tarea Redis.

Pub/Sub puede distribuir señales entre instancias, pero no registra avisos: un suscriptor desconectado pierde mensajes. Recuperar desde PostgreSQL. [Semántica Redis](https://redis.io/docs/latest/develop/pubsub/); [colas BullMQ](https://docs.bullmq.io/).

## Estados y escalamiento

Por destinatario: creada, disponible, leída y atendida. Por canal: pendiente, intentando, enviada o fallida. SSE emitido o correo aceptado no demuestra lectura. Guardar `read_at`, `acknowledged_at` y actor; leído no equivale a plato entregado.

Propuesta configurable: recordar listo sin acuse a 60 segundos y escalar al encargado a 120. Demora de preparación según tiempo por plato/estación, con base por configurar. Un aviso por umbral, revalidando que sigue pendiente. Reasignación transfiere pendiente y queda auditada.

Libro: recordatorios cinco, dos y un día hábil antes de vencer, y alerta diaria vencido sin respuesta. Calendario/destinatarios obligatorios; no calcular obligaciones con temporizador del navegador.

«Activar sonido» al iniciar turno, indicador y prueba audible: navegador puede bloquear audio sin interacción. Sonidos breves distintos para pedido nuevo/listo, volumen y repetición limitada. Silencio conserva tarjetas/contador/escalamiento. Coordinar pestañas para no duplicar sonidos.

Avisos críticos no viven solo en un toast que desaparece. Tarjeta con mesa, pedido, estación, tiempo, responsable y acción. Notificaciones de sistema operativo con contenido mínimo, sin reclamantes, teléfonos o direcciones.

## Verificación al implementar

Pedido nuevo, parcial por estación, listo, reasignado, cancelado y entregado; usuario ausente, pestañas múltiples, audio bloqueado, SSE cortado, worker reiniciado, Redis caído, duplicados y correo fallido. Reconexión recupera pendientes anteriores; ningún usuario recibe eventos ajenos. Medir latencia desde commit y demora de cola, no solo renderizado del toast.
