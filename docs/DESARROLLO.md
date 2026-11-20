# Desarrollo de la aplicación Next.js

Esta guía cubre la configuración, el flujo del restaurante y las pruebas. El arranque rápido está en [INSTALL.md](../INSTALL.md).

## Inicio

Node.js 24, npm y Docker Desktop con motor Linux operativo. Desde la raíz:

```powershell
npm ci
npm run env:setup
docker compose -f compose.next.yml up -d --wait
npm run db:generate
npm run db:deploy
```

`env:setup` agrega claves ausentes y genera secretos aleatorios sin imprimirlos ni reemplazar valores existentes. Revisar `.env`: `APP_ORIGIN` debe coincidir exactamente con el origen del navegador. No publicar `.env`.

Los marcadores `generar-con-npm-run-env-setup` y `CAMBIAR` de la plantilla se sustituyen por valores locales; los secretos reales existentes se conservan.

Si Docker no tiene motor disponible, alternativa exclusiva de desarrollo: `node scripts/postgres-local.mjs` inicia PostgreSQL 17 en loopback, conserva datos en `.cache/postgres` y usa el mismo puerto/credenciales del entorno. No ejecutarlo simultáneamente con el contenedor PostgreSQL. Redis y el worker requieren el Compose operativo para verificar colas/correo; la base, pedidos y bandeja funcionan con caché no disponible.

Para cargar datos de demostración de forma explícita:

```powershell
$env:SEED_DEMO = 'true'
npm run db:seed
Remove-Item Env:SEED_DEMO
npm run dev
```

Web: http://localhost:3000. En otra terminal: `npm run worker` para correo/recordatorios. Usuarios demo: `admin@restaurante.test`, `mozo@restaurante.test`, `cocina@restaurante.test` y `caja@restaurante.test`; contraseña aleatoria en `SEED_PASSWORD` de tu `.env`. La semilla no modifica contraseñas de cuentas existentes y se niega a correr en producción. Carta/precios demo no representan oferta comercial confirmada.

## Probar el flujo del local

1. Iniciar sesión como mozo, ir a Mesas y QR y abrir una atención.
2. Desde Ver QR, abrir/imprimir la hoja. El QR lleva a `/carta?mesa=<codigo>`; para usar otro dispositivo configurar `APP_ORIGIN` con un origen alcanzable y reiniciar web/worker. HTTPS es necesario para ciertas capacidades del navegador fuera de localhost.
3. Cliente escanea, agrega platos y envía al mozo. Obtiene seguimiento privado.
4. Mozo confirma; cocina recibe comanda. Si rechaza, exige motivo y no descuenta insumos.
5. Cocina inicia preparación y marca listo. Mozo confirma recogida y después entrega.
6. Caja registra pago verificado. Imprimir precuenta, comanda o ticket desde el pedido.
7. Mozo cierra mesa cuando no quedan pendientes/saldo. El cliente puede valorar el pedido entregado.

Administración publica carta, crea/desactiva mesas, renueva QR, define insumos/recetas y controla usuarios. Una mesa desactivada o sin atención abierta no admite pedidos por QR. La carta cambia desde el panel sin editar código.

## Variables

| Grupo | Variables principales | Criterio |
|---|---|---|
| Web | `APP_ORIGIN`, `NEXT_PUBLIC_APP_NAME`, `AUTH_SECRET`, `SESSION_HOURS` | Solo nombre es público; HTTPS configura cookie Secure |
| PostgreSQL | `POSTGRES_*`, `DATABASE_URL` | Conexión local de Node a 55432; Docker usa sus propias credenciales del mismo entorno |
| Redis | `REDIS_CACHE_URL`, `REDIS_QUEUE_URL`, puertos | 56379 caché y 56380 colas; no intercambiar políticas de memoria |
| Pruebas/semilla | `SEED_DEMO`, `SEED_PASSWORD` | Datos locales; nunca cuentas demo en producción |
| Proveedor | `BUSINESS_NAME`, `BUSINESS_RUC`, `BUSINESS_ADDRESS`, `CLAIMS_EMAIL` | Sin identidad completa el libro no acepta hojas y explica la alternativa presencial |
| Reseñas públicas | `GOOGLE_PLACES_PLACE_ID`, `GOOGLE_PLACES_API_KEY` | Variables opcionales de servidor para Google Places API (New) |
| Correo | `SMTP_*`, `MAIL_FROM` | Sin configuración las tareas quedan pendientes/fallidas, no se simula correo enviado |
| Impresión/emisión | `TICKET_WIDTH_MM`, `INVOICE_PROVIDER` | Diseño térmico inicial 80 mm; proveedor fiscal deshabilitado |
| Proxy | `TRUST_PROXY` | Solo `true` detrás de Nginx que sobrescribe X-Real-IP; mantener falso en acceso directo |

La ficha oficial de la Posada en Víctor Larco Herrera ya viene configurada. Para habilitar las reseñas de portada, activa Places API (New) y la facturación del proyecto de Google Cloud. Restringe la clave de servidor a esa API y define una cuota acorde al uso esperado. Configura `GOOGLE_PLACES_API_KEY` en el entorno de la aplicación y reconstruye la portada en producción. `GOOGLE_PLACES_PLACE_ID` permite reemplazar la ficha si cambia.

Las reseñas se consultan al pulsar «Cargar reseñas de Google Maps». La respuesta no se guarda en la base, en Redis ni en la caché HTTP. Sin configurar Places API, la sección enlaza a la ficha oficial en Google Maps y al formulario de sugerencias.

La migración `202611190003_site_social` instala las redes oficiales de la Posada. Desde **Administración → Redes sociales** se pueden editar los tres perfiles, la publicación de Instagram y el video de TikTok. La portada carga automáticamente la publicación pública de Instagram, la cronología pública de Facebook y el perfil de TikTok al acercarse a la sección. Si se configura un enlace completo de video de TikTok (`/@usuario/video/…`), este ocupa el lugar del perfil. Dejar un campo vacío oculta ese enlace o publicación.

## Comandos

```powershell
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
npm start
npm run db:studio
```

`npm run test:integration` levanta un PostgreSQL embebido efímero y aplica las migraciones versionadas. Cubre concurrencia, idempotencia, inventario, cobros, puntos y cierre de mesa.

Antes del navegador: `$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'` y `npx playwright install chromium`. `test:e2e` crea una base efímera `restaurant_test_*` en PostgreSQL local, aplica migraciones, carga demo, levanta otra web en 3100 y elimina solo esa base al terminar. No reutiliza la base de desarrollo ni el servidor 3000. Las capturas quedan en `.cache/`.

Prisma 6.19.3 fijado con migraciones SQL en Git. Nuevos cambios: `npm run db:migrate -- --name descripcion`, revisar SQL y validar staging. Producción: `db:deploy` una vez por release, nunca reset/db push/borrado de volumen. La migración incluye restricciones de integridad adicionales y una única atención abierta por mesa.

## Estado de implementación y límites

Implementación inicial: Next.js/React, API REST, roles y sesiones, recuperación preparada para SMTP, carta administrable, QR por mesa/atención, solicitud y confirmación por mozo, cocina por pedido, bandeja persistente/SSE, recogida/entrega, pagos internos, abono de puntos al saldar, impresión por navegador, insumos/recetas/movimientos, sugerencias, valoración y registro/constancia/respuesta de hojas.

La interfaz usa componentes propios con patrones de shadcn/ui (Slot/CVA) y Tailwind. React Hook Form, TanStack Query/Table y gráficos son decisiones previstas para evoluciones donde aporten valor; no se afirma que estén integrados todavía.

Trabajo pendiente para operar en producción:

- Comandas parciales por ítem/estación, reasignación avanzada de mozos, pedidos de recojo/delivery y revisión operativa con personal.
- Canje de puntos aplicado a compra, reversos de pagos/puntos y sesiones/cierre de caja completo.
- Adjuntos, calendario peruano validado, vencimientos y permisos especializados del libro; revisión del formato legal y políticas de privacidad/retención antes de publicar.
- Gestión completa de respuestas a sugerencias, moderación/auditoría de valoraciones y edición avanzada de categorías/usuarios.
- Proveedor fiscal de boleta/factura, series, estados, contingencias y pruebas. Los tickets actuales son documentos internos.
- SMTP real, reintentos manuales de correo y panel de salud de outbox; impresión automática requiere agente local o integración de impresora.
- Docker productivo de web/worker, TLS, copias externas y restauración ensayada. `infra/nginx/default.conf` es plantilla HTTP, no despliegue HTTPS completado.

El primer entregable permite probar el circuito de atención; no debe presentarse como sistema listo para operación comercial sin resolver estos puntos.
