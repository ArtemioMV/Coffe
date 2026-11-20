# Skills del proyecto

**Fuente única: `.agents/skills/`**, en el formato abierto de Agent Skills (`<nombre>/SKILL.md` con `name` y `description`).

| Agente | Lee las skills de | Lee las instrucciones de |
|---|---|---|
| Codex | `.agents/skills/` | `AGENTS.md` |
| Claude Code | `.claude/skills/` (copia generada) | `CLAUDE.md` (importa `AGENTS.md`) |

Después de cambiar algo aquí ejecuta `node scripts/sync-skills.mjs`. Con `--check` falla si la copia está desactualizada, para usarlo en CI.
Cada agente solo lee el `description` hasta que la tarea necesita la skill.

## Propias del restaurante (español, basadas en `docs/` y el código)

| Skill | Cuándo se usa |
|---|---|
| `api-endpoint` | Añadir o cambiar rutas en `apps/web/src/app/api/v1/[...path]/route.ts` |
| `pedidos-flujo` | Estados, transiciones, mesas/atenciones, comandas, idempotencia |
| `caja-pagos-puntos` | Dinero en céntimos, pagos, conciliación, puntos |
| `notificaciones-tiempo-real` | Outbox, worker BullMQ, SSE, acuse y escalamiento |
| `prisma-esquema-migraciones` | `schema.prisma`, migraciones y semillas (Prisma 6.19.3) |
| `atencion-consumidor` | Libro de Reclamaciones (Indecopi), sugerencias y valoraciones |
| `diseno-campestre` | Identidad visual cajamarquina, tokens, accesibilidad |
| `seguridad-revision` | Lista de control de seguridad del proyecto |
| `docker-operacion` | Entorno local (Compose o PostgreSQL embebido), respaldos, `.env` |
| `pruebas-restaurante` | Unitarias, integración con PostgreSQL embebido, E2E y criterios de aceptación |

## Externas (copiadas de GitHub el 2026-11-19)

Solo se copiaron los Markdown (más los ayudantes de `shadcn`); se adaptaron referencias internas y se añadió una
«Nota para este proyecto» al inicio cuando la skill asumía otra versión o plataforma.

| Skill | Origen | Licencia | Uso |
|---|---|---|---|
| `systematic-debugging` | [obra/superpowers](https://github.com/obra/superpowers) | MIT | Depurar buscando la causa raíz antes de corregir |
| `test-driven-development` | obra/superpowers | MIT | Prueba que falla → código → refactor |
| `verification-before-completion` | obra/superpowers | MIT | Evidencia (comandos y salida) antes de decir «listo» |
| `writing-plans` | obra/superpowers | MIT | Planes de implementación por tareas (se guardan en `docs/planes/`) |
| `receiving-code-review` | obra/superpowers | MIT | Evaluar comentarios de revisión con rigor técnico |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | MIT | Rendimiento React/Next.js (70 reglas) |
| `vercel-composition-patterns` | vercel-labs/agent-skills | MIT | Patrones de composición de componentes |
| `web-design-guidelines` | vercel-labs/agent-skills + web-interface-guidelines | MIT | Auditoría de UI; reglas guardadas en local |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 | Dirección estética de interfaces |
| `shadcn` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | Componentes shadcn/ui |
| `prisma-client-api` | [prisma/skills](https://github.com/prisma/skills) | MIT | Referencia de consultas Prisma Client |
| `supabase-postgres-best-practices` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT | Buenas prácticas de PostgreSQL (aplica a Postgres autoalojado) |

Descartadas a propósito: `next-dev-loop` de Next.js (exige instalar `agent-browser` global), Trail of Bits
(licencia CC-BY-SA; se cubre con `seguridad-revision` + `/security-review`), skills de Prisma 7
(el proyecto usa Prisma 6), y skills de documentos/arte que no aplican al proyecto.

## Mantener

- Para actualizar una externa: volver a copiarla desde su repositorio, revisar el texto y reaplicar la nota del proyecto.
- Para crear una nueva: carpeta en minúsculas con guiones y `SKILL.md` con `name` (igual a la carpeta) y `description`
  que diga **qué** hace y **cuándo** usarla. Mantener `SKILL.md` breve y mover el detalle a archivos de referencia.
