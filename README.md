# La Posada Cajamarquina

Sistema para un restaurante campestre de identidad cajamarquina. Incluye una web pública, carta, pedidos, atención de mesas, cocina y barra, caja, fidelización y atención al consumidor.

La implementación inicial usa Next.js, React y TypeScript con API REST `/api/v1`, PostgreSQL con Prisma y un worker BullMQ.

## Documentación

| Documento | Contenido |
|---|---|
| [Requisitos](docs/REQUISITOS.md) | Alcance, roles, pedidos, pagos, reclamos, sugerencias, valoraciones y criterios de aceptación |
| [Arquitectura](docs/ARQUITECTURA.md) | Stack, API REST, estructura de carpetas, red privada y operación |
| [Desarrollo Next.js](docs/DESARROLLO.md) | Instalación nueva, variables, migraciones y alcance implementado |
| [API REST](docs/API.md) | Endpoints, autenticación, estados e idempotencia |
| [Notificaciones](docs/NOTIFICACIONES.md) | Eventos, destinatarios, avisos de cocina y meseros, reintentos y desconexiones |
| [Datos](docs/DATOS.md) | Modelo conceptual PostgreSQL, Prisma, integridad y migraciones |
| [Diseño](docs/DISENO.md) | Identidad campestre cajamarquina, tejidos, componentes y accesibilidad |
| [Migraciones](MIGRATION.md) | Cambios de esquema, validación y despliegue |
| [Instalación](INSTALL.md) | Arranque local de la aplicación |

## Dirección técnica propuesta

- React + Next.js + TypeScript para la web pública, paneles y backend modular Node.js.
- PostgreSQL como base principal y Prisma para acceso tipado y migraciones versionadas.
- Tailwind CSS + shadcn/ui como base personalizable; selección completa y motivos en arquitectura.
- Redis para caché y BullMQ para tareas; notificaciones persistidas en PostgreSQL y tiempo real con SSE.
- Nginx como proxy inverso con HTTPS; aplicación, PostgreSQL y Redis en red privada.
- Docker Compose para desarrollo y primer despliegue; calidad y migraciones en CI/CD.

Se interpreta «postgrest» como **PostgreSQL**. [PostgREST](https://docs.postgrest.org/en/stable/) es un servidor que publica una API sobre PostgreSQL, una herramienta distinta. Queda fuera de la propuesta inicial porque ya habrá una API de negocio con Prisma. Si la intención era usar PostgREST expresamente, revisar esta decisión antes de implementar el acceso a datos.

**Decisión confirmada:** Next.js + React + TypeScript, con API REST y Prisma como propietario del esquema. Los clientes no acceden directamente a la base de datos.

## Ejecutar Next.js

Requiere Node.js 24, npm y Docker Desktop con motor Linux. Desde la raíz:

```powershell
npm ci
npm run env:setup
docker compose -f compose.next.yml up -d --wait
npm run db:generate
npm run db:deploy
```

Para datos demo, habilitar `SEED_DEMO=true` explícitamente según [DESARROLLO.md](docs/DESARROLLO.md). Después: `npm run dev`; worker en otra terminal con `npm run worker`.

| Servicio | Acceso local |
|---|---|
| Next.js / API REST | http://localhost:3000 |
| PostgreSQL | `127.0.0.1:55432` |
| Redis caché / colas | `127.0.0.1:56379` / `127.0.0.1:56380` |

Los puertos se configuran en `.env`. Consulta la guía de desarrollo para usar PostgreSQL embebido, preparar datos de demostración y ejecutar pruebas. [DESARROLLO.md](docs/DESARROLLO.md)

## Acuerdos y pendientes

El flujo confirmado es: QR de mesa → carta → solicitud del cliente → aviso al mozo → confirmación del mozo → comanda a cocina → preparación → listo → aviso al mozo → recogida → entrega → cobro. Cocina no recibe las solicitudes pendientes de aprobación.

Administración gestiona carta y mesas (crear, editar, activar/desactivar y renovar QR). Inventario distingue productos de venta e insumos con recetas/movimientos. Se incluyen impresión de comanda, precuenta y ticket interno; la emisión electrónica de boleta/factura requiere una integración fiscal independiente.

Las guías de desarrollo y coordinación registran el estado y los pendientes. [DESARROLLO.md](docs/DESARROLLO.md) · [COORDINACION.md](docs/COORDINACION.md)

Antes de publicar, completar nombre, RUC, dirección, horarios, carta/precios, zonas/mesas, responsables de reclamos, canales y políticas. Falta elegir alojamiento, correo y, si se requieren, proveedores de pagos, facturación y mensajería externa. Estos datos no impiden preparar la estructura del proyecto.
