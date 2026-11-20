---
name: docker-operacion
description: Operar el entorno local del restaurante en Windows/PowerShell (PostgreSQL y Redis con Docker Compose o PostgreSQL embebido, Next.js, worker, .env, respaldos de PostgreSQL, Nginx). Úsala para arrancar, detener, ver logs, resolver puertos ocupados, configurar variables de entorno o respaldar/restaurar la base.
---

# Entorno local y operación

Fuentes: `compose.next.yml`, `scripts/setup-env.mjs`, `scripts/postgres-local.mjs`, `infra/nginx/default.conf`, `.env.example`, `docs/DESARROLLO.md`.
Shell principal: **PowerShell** en Windows. La aplicación PHP + MySQL fue retirada el 2026-11-19; su respaldo está en `backups/` (fuera de git).

## Arranque

```powershell
npm install
npm run env:setup                                   # añade claves faltantes a .env con secretos aleatorios; no muestra ni reemplaza los existentes
docker compose -f compose.next.yml up -d --wait     # PostgreSQL 17 + redis-cache + redis-queue
#   alternativa sin Docker: node scripts/postgres-local.mjs  (datos en .cache/postgres; sin Redis)
npm run db:deploy
npm run db:seed                                     # SEED_DEMO=true solo en local
npm run dev                                         # http://localhost:3000
npm run worker                                      # otra terminal
```

| Servicio | Acceso local | Variable |
|---|---|---|
| Web/API Next.js | http://localhost:3000 | `APP_ORIGIN`, `NEXT_PORT` |
| PostgreSQL | `127.0.0.1:55432` | `DATABASE_URL`, `POSTGRES_*` |
| Redis caché (`allkeys-lru`, 128 MB) | `127.0.0.1:56379` | `REDIS_CACHE_URL` |
| Redis colas (`noeviction`, AOF) | `127.0.0.1:56380` | `REDIS_QUEUE_URL` |

Sin Redis la app funciona: caché y rate limit degradan a memoria/base; el worker sí necesita Redis de colas.

## Operación diaria

```powershell
docker compose -f compose.next.yml ps
docker compose -f compose.next.yml logs --tail 100 postgres
docker compose -f compose.next.yml stop        # conserva datos
docker compose -f compose.next.yml up -d --wait
```

## Reglas peligrosas (confirmar siempre con el usuario antes)

- **Nunca** `docker compose -f compose.next.yml down -v` ni borrar los volúmenes `postgres_next`/`redis_queue_next` ni `.cache/postgres` si hay datos que conservar.
- Nunca `prisma migrate reset` ni `prisma db push` fuera de una base desechable.
- Nunca leer, imprimir ni copiar el contenido de `.env` en respuestas, commits o logs.
- Docker Desktop puede tener contenedores de **otros proyectos** del usuario: limitar cada comando a `-f compose.next.yml` o al proyecto `restaurante-next`.

## Respaldo y restauración de PostgreSQL

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
docker compose -f compose.next.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/restaurant.dump'
docker compose -f compose.next.yml cp postgres:/tmp/restaurant.dump ./backups/restaurant.dump
```

Restaurar siempre primero en una base aislada y verificar conteos y totales (`pg_restore --no-owner -d <base_nueva>`). `backups/` está en `.gitignore`. En producción: respaldos cifrados, copia externa, WAL para el RPO de 15 min (un dump diario no lo cumple).

## Producción

Solo Nginx publica puertos (443 y 80 para redirección); web, worker, PostgreSQL y Redis en red privada sin `ports`. `infra/nginx/default.conf` ya trae SSE sin buffering en `/api/v1/events`, `limit_req` en `/api/` y cuerpo máximo de 32 KB; falta TLS real, HSTS y CSP. La web (`output: "standalone"`) y el worker aún no tienen Dockerfile ni servicio en Compose.

## Problemas frecuentes

Docker no responde → abrir Docker Desktop y esperar el motor Linux. Puerto ocupado → cambiar `POSTGRES_PORT`/`REDIS_*_PORT` en `.env` (y `DATABASE_URL`) y volver a levantar. `AUTH_SECRET` inválido → `npm run env:setup`. Cliente Prisma desactualizado → `npm run db:generate`.
