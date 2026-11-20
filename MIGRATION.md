# Migraciones de PostgreSQL

Prisma mantiene el esquema en `packages/database/prisma/schema.prisma` y el historial SQL en `packages/database/prisma/migrations/`.

1. En desarrollo, ejecuta `npm run db:migrate -- --name descripcion`. Revisa el SQL generado y versiona el cambio con el esquema.
2. Ejecuta `npm run test:integration`. La suite aplica las migraciones en una base PostgreSQL efímera y verifica los servicios.
3. Aplica el cambio en staging y comprueba los flujos afectados. Para cambios de producción, prepara un respaldo restaurable y un plan de reversión antes de ejecutar `npm run db:deploy` una vez por versión.
4. Comprueba la conexión con `/api/v1/ready` y realiza una prueba del flujo afectado tras el despliegue.

Consulta el modelo y las reglas de integridad en [DATOS.md](docs/DATOS.md). El estado de la aplicación y los pendientes de lanzamiento están en [DESARROLLO.md](docs/DESARROLLO.md).
