# Instalación · Restaurante campestre

La aplicación usa Next.js, React y TypeScript con API REST, PostgreSQL y Redis.

## Arranque local

Requiere Node.js 24, npm y Docker Desktop con motor Linux operativo.

```powershell
npm ci
npm run env:setup
docker compose -f compose.next.yml up -d --wait
npm run db:generate
npm run db:deploy
```

Para cargar demostración explícitamente, solo en desarrollo:

```powershell
$env:SEED_DEMO = 'true'
npm run db:seed
Remove-Item Env:SEED_DEMO
npm run dev
```

Web: http://localhost:3000. En otra terminal: `npm run worker`. Correos demo y contraseña local: [docs/DESARROLLO.md](docs/DESARROLLO.md). Nunca usar cuentas demo en producción.

`env:setup` conserva valores reales y genera secretos para claves ausentes o marcadores de plantilla. No publiques `.env`. Si el puerto 55432 está ocupado por `scripts/postgres-local.mjs`, detener esa instancia antes del contenedor; sus datos permanecen en `.cache/postgres`.

Guía de variables, pruebas y límites: [DESARROLLO.md](docs/DESARROLLO.md).

## Operación

```powershell
docker compose -f compose.next.yml ps
docker compose -f compose.next.yml logs --tail 100 postgres redis-cache redis-queue
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
```

`docker compose -f compose.next.yml down` conserva volúmenes. No añadir `-v` al reiniciar o actualizar. Cambiar credenciales del entorno no actualiza una base ya inicializada.
