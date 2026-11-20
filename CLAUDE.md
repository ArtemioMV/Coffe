@AGENTS.md

## Notas para Claude Code

- Las skills se cargan desde `.claude/skills/`, que es una copia de `.agents/skills/`. Edita siempre `.agents/skills/` y luego ejecuta `node scripts/sync-skills.mjs`.
- Codex puede estar trabajando en el mismo repositorio en paralelo: antes de editar un archivo, vuelve a leerlo y no reviertas cambios ajenos.
