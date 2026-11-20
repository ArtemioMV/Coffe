---
name: seguridad-revision
description: Lista de control de seguridad específica del restaurante (sesiones, CSRF por origen, permisos por recurso, rate limit, secretos, datos personales de reclamos, red privada Nginx/PostgreSQL/Redis, Docker). Úsala al revisar o escribir código de autenticación, endpoints, despliegue, variables de entorno, o antes de dar por terminada una funcionalidad que maneje datos de clientes o dinero.
---

# Revisión de seguridad del restaurante

Fuente: `docs/ARQUITECTURA.md` (Seguridad y despliegue, Red prevista). Código clave: `apps/web/src/modules/identidad/service.ts`, `apps/web/src/lib/http.ts`, `apps/web/src/lib/rate-limit.ts`, `apps/web/next.config.ts`.

Recorre esta lista sobre el diff. Reporta cada hallazgo como `archivo:línea — problema — escenario concreto de abuso — corrección`. No inventes hallazgos sin escenario.

## 1. Identidad y sesiones

- [ ] Cookie `restaurant_session`: `httpOnly`, `secure` en HTTPS, `sameSite: "strict"`, expiración (1–72 h, `SESSION_HOURS`). En BD solo `tokenHash` (SHA-256).
- [ ] Login con comparación bcrypt también para cuentas inexistentes (hash de relleno) → sin enumeración por tiempo; mensaje genérico «Correo o contraseña inválidos».
- [ ] Cambiar rol o desactivar usuario **revoca sus sesiones** y se audita; un admin no cambia sus propios permisos.
- [ ] `AUTH_SECRET` ≥ 32 caracteres, nunca el valor de ejemplo (`secret()` lo exige).
- [ ] Recuperación de contraseña real: token aleatorio hasheado, un solo uso, vencimiento corto, sin revelar si el correo existe.

## 2. Autorización

- [ ] Cada rama de la API llama a `requireUser([...])` con el mínimo de roles o es pública a propósito.
- [ ] Además del rol, se comprueba **propiedad** (mesero de la atención, cliente dueño, token de seguimiento). Recursos ajenos → 404.
- [ ] Cocina no ve datos de caja ni reclamos; caja no cambia precios ni borra pagos.
- [ ] Nada de autorización basada en caché, en datos del cliente (rol en el body) ni en el QR por sí solo.

## 3. Entradas y salidas

- [ ] Toda entrada pasa por Zod con `max()`; cuerpo limitado por `body()` (32 KB).
- [ ] IDs con `z.cuid()`; importes como string con regex; nunca SQL crudo concatenado (`$queryRaw` solo con plantilla etiquetada).
- [ ] Respuestas proyectadas: sin `passwordHash`, `tokenHash`, `accessHash`, `trackingHash`, `requestHash`, `idempotencyKey`.
- [ ] Contenido de usuarios (observaciones, reclamos, comentarios) se renderiza como texto; prohibido `dangerouslySetInnerHTML` con datos de usuario.
- [ ] Cargas de archivos (futuro: adjuntos del libro): tipo y tamaño validados, nombre regenerado, fuera de rutas ejecutables (`apps/web/public/uploads/` está ignorado en git).

## 4. Abuso y CSRF

- [ ] Mutaciones protegidas por `checkOrigin` (`Origin === APP_ORIGIN`).
- [ ] `rateLimit` en login/registro (10/min), pedidos, reclamos, sugerencias, valoraciones y resolución de QR.
- [ ] IP del cliente solo desde `x-real-ip` con `TRUST_PROXY=true` detrás de Nginx; nunca `X-Forwarded-For` del cliente.
- [ ] Idempotencia en creaciones con efectos económicos.

## 5. Datos personales y logs

- [ ] Logs estructurados con IDs de solicitud/pedido/evento; **sin** secretos, contraseñas, tokens ni contenido de reclamos.
- [ ] Notificaciones y banners sin nombres de reclamantes, teléfonos ni direcciones.
- [ ] Desactivar usuario no borra pedidos, pagos, hojas ni respuestas.

## 6. Secretos y despliegue

- [ ] `.env` nunca en git ni en la imagen Docker (`.gitignore`, `.dockerignore`). Variables `NEXT_PUBLIC_*` sin secretos.
- [ ] En producción solo Nginx publica puertos (443 y 80 para redirección). Next.js, PostgreSQL y Redis en red privada sin `ports`. En local, puertos publicados solo en `127.0.0.1`.
- [ ] Usuario de BD de ejecución con menos permisos que el de migraciones.
- [ ] Cabeceras: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (ya en `next.config.ts`); añadir CSP y HSTS en Nginx al desplegar.
- [ ] Redis caché con expulsión y Redis colas con `noeviction` + persistencia, instancias separadas.
- [ ] Semilla demo (`SEED_DEMO=true`, cuentas `@restaurante.test`) **nunca** en producción.

Para una auditoría completa de la rama usar también `/security-review`.
