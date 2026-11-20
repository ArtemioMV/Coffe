# API REST v1

Base: `/api/v1`, JSON UTF-8. Errores `{ "error": "mensaje" }` con 400/401/403/404/409/413/422/429/503. Respuestas privadas sin caché HTTP. Mutaciones de navegador requieren `Origin` igual a `APP_ORIGIN`; no se habilita CORS abierto.

Sesión en cookie HttpOnly `restaurant_session`, token aleatorio hasheado en base, SameSite estricto, expiración y revocación. Seguimiento de invitado/hoja mediante `Authorization: Bearer <clave>`. Claves privadas van en fragmento del enlace inicial, no en consulta enviada al servidor.

## Rutas implementadas

| Método/ruta | Acceso y propósito |
|---|---|
| `GET /health`, `GET /ready` | Vida y conexión PostgreSQL por separado |
| `GET /business`, `GET /menu` | Identidad pública y carta activa; caché opcional Redis |
| `GET /public/reviews` | Valoraciones y reseñas públicas de Google Maps cuando se configura Places API |
| `GET /admin/social`, `PUT /admin/social` | Solo administración. El guardado usa la versión devuelta por GET y responde 409 si otra sesión ya guardó cambios |
| `POST /auth/register`, `/auth/login`, `/auth/logout` | Registro de cliente, sesión y revocación |
| `GET /auth/me` | Usuario de sesión o null |
| `POST /auth/forgot`, `/auth/reset` | Recuperación por correo; respuesta genérica y token con vencimiento |
| `GET /tables/resolve/:token` | Datos mínimos de mesa activa y si tiene atención abierta |
| `GET /tables` | Admin/mozo/caja; estado de mesas y asignaciones |
| `POST /tables`, `PATCH /tables/:id` | Admin crea/edita/activa/desactiva; no desactivar con atención abierta |
| `POST /tables/:id/open`, `/tables/:id/close` | Admin/mozo; cierre solo con pedidos resueltos y saldo cero |
| `GET /tables/:id/qr`, `POST /tables/:id/rotate-qr` | SVG imprimible; renovación de código por admin |
| `GET /catalog` | Admin: carta completa y recetas |
| `POST /categories` | Admin agrega categoría |
| `POST /products`, `PATCH /products/:id` | Admin crea/edita/activa/agota platos |
| `PUT /products/:id/recipe` | Admin reemplaza receta con cantidades por unidad base |
| `POST /orders` | Cliente/invitado con QR activo y atención abierta; siempre pendiente del mozo |
| `GET /orders` | Datos por rol: cliente propios, mozo asignados, cocina solo confirmados |
| `GET /orders/:id` | Propietario, personal autorizado o clave privada de seguimiento |
| `POST /orders/:id/transition` | Confirmar/rechazar, preparar, listo, recoger, entregar y cancelar según rol/estado |
| `POST /orders/:id/payments` | Admin/caja registra cobro previamente verificado, sin exceder saldo |
| `GET /orders/:id/ticket` | Datos autorizados de impresión; no emite boleta/factura electrónica |
| `POST /orders/:id/rating` | Consumo entregado y verificado, una valoración por pedido |
| `GET /notifications`, `PATCH /notifications/:id` | Bandeja propia y lectura |
| `GET /events` | SSE autenticado, cursor/heartbeat, conexión de 60 s renovable |
| `GET /inventory`, `POST /inventory` | Insumos/movimientos; creación solo admin |
| `POST /inventory/:id/movements` | Admin: entrada, merma o ajuste; sin saldo negativo |
| `POST /suggestions` | Público, mensaje y contacto opcional |
| `POST /claims`, `GET /claims/:id` | Registro con proveedor configurado; seguimiento privado por clave |
| `PATCH /claims/:id` | Admin registra respuesta y tarea de correo |
| `GET /feedback` | Admin consulta libro, sugerencias y valoraciones |
| `GET /users`, `PATCH /users/:id` | Admin: funciones/activación; revocar sesiones tras cambio |
| `GET /reports` | Admin/caja: cobrados, pedidos por estado y stock bajo |

Los endpoints de edición parcial validan solo campos permitidos. No existe borrado público de pedidos/pagos/hojas ni autoasignación de rol en registro.

## Pedidos e idempotencia

`POST /orders` requiere `Idempotency-Key` aleatoria de 20–100 caracteres. Cuerpo:

```json
{
  "tableToken": "codigo-del-qr-de-la-mesa",
  "guestName": "Ana",
  "notes": "",
  "items": [{ "productId": "id-cuid-del-plato", "quantity": 2, "expectedPrice": "12.00", "notes": "Sin ají" }]
}
```

Servidor calcula con precio de base y rechaza cambios respecto al precio revisado. Misma clave/contenido devuelve el mismo pedido; contenido distinto devuelve conflicto. Respuesta contiene `order` y `token` de seguimiento; conservar token como secreto. QR identifica mesa, no autoriza ver pedidos de otros clientes.

Transición: `{ "action": "confirm", "version": 0, "reason": "" }`. Acciones: `confirm`, `reject`, `prepare`, `ready`, `acknowledge`, `deliver`, `cancel`. Estados internos: `AWAITING_WAITER → PENDING → PREPARING → READY → DELIVERED`. `reject` desde espera; cancelación administrativa con motivo y sin pagos registrados. Conflicto de versión requiere recargar.

Pago requiere su propia `Idempotency-Key` y `{ "amount": "24.00", "method": "EFECTIVO", "reference": "" }`. Tarjeta/transferencia exigen referencia. Registrar método no procesa una transacción bancaria.

SSE entrega datos solo del usuario autenticado. La bandeja durable se genera en la transacción; Redis no es requisito para guardar un aviso. El worker usa outbox para correo y escalamiento.
