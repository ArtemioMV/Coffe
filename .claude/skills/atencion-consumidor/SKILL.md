---
name: atencion-consumidor
description: Libro de Reclamaciones virtual (Indecopi, Perú), sugerencias y valoraciones del restaurante. Úsala al tocar la ruta /libro-de-reclamaciones, el modelo Claim, claimInput, plazos de 15 días hábiles, constancias, bandeja de reclamos, Suggestion, Rating o moderación de reseñas.
---

# Atención al consumidor: libro, sugerencias y valoraciones

Fuente: `docs/REQUISITOS.md` (Libro de Reclamaciones integrado; Sugerencias y valoraciones). Código: ramas `claims`, `suggestions`, `feedback`, `orders/:id/rating` en `apps/web/src/app/api/v1/[...path]/route.ts`; `claimInput`, `feedbackInput` en `packages/contracts`.

> Aviso: esto es diseño de producto, no asesoría legal. Antes de publicar, verificar el reglamento y el modelo de hoja vigentes de Indecopi; no inventar datos fiscales.

## Libro de Reclamaciones — reglas

- Ruta pública `/libro-de-reclamaciones`, enlace visible en el pie de página y QR en el local. **Sin** cuenta, compra validada ni valoración obligatoria.
- Separar **RECLAMO** (disconformidad con el producto/servicio) y **QUEJA** (malestar respecto a la atención). Sugerencias y reseñas no sustituyen este canal.
- Datos del proveedor (razón social, RUC de 11 dígitos, dirección) desde `BUSINESS_NAME`, `BUSINESS_RUC`, `BUSINESS_ADDRESS`. Si faltan, la API responde 503 y pide solicitar el libro físico al personal: **no** registrar hojas sin proveedor.
- Campos: identificación y contacto del consumidor, representante si corresponde, bien/servicio, monto si aplica, tipo, detalle y pedido del consumidor.
- Correlativo único y constancia imprimible/descargable. El correo fallido **no** invalida el registro: constancia accesible, reintento y aviso al responsable.
- Seguimiento solo con sesión autorizada o **enlace secreto no enumerable** (token aleatorio de 32 bytes; se guarda solo `accessHash`). Para hojas ajenas o token inválido responder 404. Nunca exponer hojas por correlativo predecible.
- Plazo: **15 días hábiles improrrogables** para responder. Calcular vencimiento con calendario peruano de feriados mantenido y reglas de cómputo validadas; cambiar de estado no reinicia el plazo. Recordatorios a 5, 2 y 1 día hábil y alerta diaria si venció, generados en servidor.
- Estados: RECIBIDO → ASIGNADO → EN_ATENCION → RESPONDIDO → CERRADO. Cerrar no borra la hoja ni sustituye la respuesta; rectificaciones trazables.
- Bandeja privada solo para responsable de reclamos/administrador; auditar accesos, respuestas y exportaciones. Nunca mostrar datos del reclamante en banners, toasts, logs ni notificaciones del sistema operativo.

## Brechas actuales del código frente al requisito

- `number` es autoincremental global; el requisito pide correlativo por establecimiento/serie y año.
- No hay cálculo de vencimiento, calendario de feriados, historial de estados, adjuntos ni responsable asignado.
- El worker ya envía la constancia y la respuesta por correo (`claim.*`) y avisa a `CLAIMS_EMAIL`; sin SMTP queda pendiente con reintentos. No hay todavía evidencia de envío visible en la bandeja.
- Solo existe `RESPONDIDO`; faltan los estados intermedios y `CERRADO`.

Al trabajar aquí, proponer cerrar estas brechas en orden: vencimiento + calendario → historial/asignación → evidencia de envío en la bandeja → correlativo por serie/año (migración con cuidado de no renumerar hojas existentes).

## Sugerencias

Formulario público (mensaje 10–4000, contacto opcional, anonimato permitido), rate limit. Bandeja: recibido, en revisión, aplicado, descartado, con responsable y motivo. Acuse/respuesta solo si dejó contacto. Sin publicación automática de datos personales.

## Valoraciones

- Una por pedido **entregado** (`orderId @unique`), por usuario dueño o token de seguimiento válido. Nota 1–5 (opcional comida/atención/ambiente en el destino), comentario ≤ 1000.
- Moderación por spam o datos personales con motivo; **no** ocultar críticas por ser negativas. Promedio y cantidad solo de publicadas; estado vacío si no hay ninguna.
- Invitación única por pedido entregado, respetando preferencias de contacto.

## Pruebas

Registro sin login; constancia aunque falle el correo; token inválido → 404; vencimientos con fines de semana y feriados; falta de RUC → 503; valoración duplicada → 409; valorar pedido no entregado → 409.
