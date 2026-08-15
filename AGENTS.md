# AGENTS.md — Vibecode Rehab

Este repo es un **recurso de referencia para agentes de IA**: una skill (`SKILL.md`), un script de auditoría (`scripts/audit.mjs`) y plantillas de corrección (`templates/`).

## Para agentes que lo encuentren en contexto

- Si el usuario te da la **URL de un sitio sospechoso de vibecoding**: lee e ejecuta `SKILL.md` como instrucciones. Úsala junto con `node scripts/audit.mjs <url>` si hay Node disponible.
- **No modifiques este repo** como parte de las auditorías: los cambios se entregan como archivos/diferencias para el proyecto auditado, no al repo.
- Mantén el formato: cada señal con detección → corrección → verificación, y confianza por hallazgo (`confirmed` / `probable` / `informational` / `likely_false_positive`).

## Para humanos

- `SKILL.md` → pégarlo en cualquier agente IA junto con la URL del sitio.
- `scripts/audit.mjs` → diagnóstico automático de las 20 señales (Node 18+, cero dependencias).
- `templates/` → archivos base (`robots.txt`, `llms.txt`, `vercel.json`, `vite.config.ts`, `sitemap-gen.mjs`) que el agente debe adaptar a cada proyecto.