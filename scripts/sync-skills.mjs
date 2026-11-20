// Copia .agents/skills (fuente única, la lee Codex) a .claude/skills (la lee Claude Code).
// Uso: node scripts/sync-skills.mjs          → sincroniza
//      node scripts/sync-skills.mjs --check  → falla si el espejo está desactualizado (para CI)
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const source = ".agents/skills";
const target = ".claude/skills";
const marker = "_ESPEJO-NO-EDITAR.md";

function files(root, dir = root) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(root, path) : [relative(root, path)];
  });
}

if (process.argv.includes("--check")) {
  const a = files(source).sort();
  const b = files(target).filter(f => f !== marker).sort();
  const stale = a.length !== b.length || a.some((f, i) => f !== b[i] || !readFileSync(join(source, f)).equals(readFileSync(join(target, f))));
  if (stale) { console.error("`.claude/skills` no coincide con `.agents/skills`. Ejecuta: node scripts/sync-skills.mjs"); process.exit(1); }
  console.log("Skills sincronizadas.");
} else {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  writeFileSync(join(target, marker), "# Copia generada\n\nNo edites esta carpeta. La fuente es `.agents/skills/`; después de cambiarla ejecuta `node scripts/sync-skills.mjs`.\n");
  console.log(`Skills copiadas: ${readdirSync(source).filter(n => statSync(join(source, n)).isDirectory()).length} → ${target}`);
}
