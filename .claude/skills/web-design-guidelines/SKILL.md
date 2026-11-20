---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance (accessibility, focus, forms, animation, typography, images, performance, touch, i18n, hydration). Use when asked to "review my UI", "check accessibility", "audit design", "review UX", "revisar la interfaz", "revisar accesibilidad" or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
  source: https://github.com/vercel-labs/agent-skills (skill) + https://github.com/vercel-labs/web-interface-guidelines (rules)
---

# Web Interface Guidelines

Review files for compliance with the Web Interface Guidelines.

## How It Works

1. Read the rules in [guidelines.md](guidelines.md) (local copy, fetched 2026-11-19).
2. Read the specified files (or ask the user which files/pattern to review).
3. Check them against every rule.
4. Output findings in the terse `file:line` format described in `guidelines.md`.

If the user explicitly asks for the newest rules, they can be refreshed from
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`;
review the downloaded text before replacing `guidelines.md`.

## Adjustments for this project (Spanish UI)

The guidelines are written for English UIs. In this repo:

- Ignore "Title Case for headings/buttons": Spanish uses sentence case («Agregar al pedido», not «Agregar Al Pedido»).
- Quotes: prefer Spanish angular quotes «…» in prose; `…` still applies.
- Currency/dates: always `Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })` (see `money()` in `packages/contracts`) and `Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima" })`.
- Touch targets must be at least 44 × 44 px and colour/sound is never the only signal (`docs/DISENO.md`).
- Kitchen/waiter panels: no textures behind operational info; critical alerts must not live only in a toast.

Also apply the `diseno-campestre` skill when the review touches visual identity.
