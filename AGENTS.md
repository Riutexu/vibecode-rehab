# AGENTS.md — Vibecode Rehab

Este repo es un **recurso de referencia para agentes de IA**: una skill (`SKILL.md`), un auditor ejecutable (`scripts/audit.mjs`) y plantillas de corrección (`templates/`).

## Para agentes que lo encuentren en contexto

- Si el usuario te da la **URL de un sitio sospechoso de vibecoding**: lee y ejecuta `SKILL.md` como instrucciones. Usa `node scripts/audit.mjs <url>` como diagnóstico si hay Node disponible.
- **No modifiques este repo** como parte de las auditorías: los cambios se entregan como archivos o diferencias para el proyecto auditado, no a este repo.
- Mantén el formato: cada señal con detección → corrección → verificación, y confianza por hallazgo (`confirmado` / `probable` / `informativo` / `posible falso positivo`).

## Para humanos

- `SKILL.md` → pégalo en cualquier agente IA junto con la URL del sitio.
- `scripts/audit.mjs` → diagnóstico automático de las 20 señales (Node 18+, cero dependencias):
  `node scripts/audit.mjs https://sitio.vercel.app [--json] [--limit N] [--output informe.md]`
- `templates/` → archivos base (`Seo.tsx`, `NotFound.tsx`, `robots.txt`, `llms.txt`, `vercel.json`, `vite.config.ts`, `sitemap-gen.mjs`) que el agente debe adaptar a cada proyecto.
- El CI ejecuta el auditor contra sites reales; los cambios a `scripts/` y `templates/` deben mantener esos smoke tests en verde.