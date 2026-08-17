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

## Workflow de desarrollo (Superpowers)

Este repo sigue la metodología [superpowers](https://github.com/obra/superpowers) con el ciclo obligatorio para TODO cambio:

**Brainstorm → Plan → Build → Test → Review**

1. **Brainstorm** — carga la skill `brainstorming` antes de proponer cambios; pregunta qué señal o plantilla se quiere mejorar y valida el diseño con el humano.
2. **Plan** — carga `writing-plans`; descompón en tareas de 2–5 min con ruta exacta y verificación.
3. **Build** — carga `test-driven-development` (RED-GREEN-REFACTOR); commits atómicos.
4. **Test** — carga `verification-before-completion`; ejecuta los smoke tests del CI (`node --check scripts/audit.mjs`, auditoría de prueba contra `https://example.com`, plantillas presentes).
5. **Review** — carga `requesting-code-review`; revisa contra el plan y clasifica hallazgos por severidad. Nada de "ya está" sin verificación.