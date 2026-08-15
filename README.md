<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,vite,vercel,astro,nextjs,nodejs,bash,powershell,githubactions,md,html,css&perline=6&theme=light" alt="Stack: React, Vite, Vercel, Astro, Next.js, Node.js, Bash, PowerShell, GitHub Actions, Markdown, HTML, CSS" />
  </a>
</p>

# 🏥 VIBECODE REHAB

> Las 20 señales de que un sitio fue vibecodeado — convertidas en una **skill para agentes de IA** + un **auditor ejecutable** + **plantillas de corrección**.

Pega la URL de cualquier sitio en esta skill (opencode, Claude Code, Gemini, ChatGPT, Cursor…) y el agente auditará y corregirá **las 20 señales típicas del vibecoding** de forma autónoma: detectar → corregir → verificar, con un reporte final que clasifica cada hallazgo por confianza.

## 🚩 Las 20 señales

| # | Señal | # | Señal |
|---|-------|---|-------|
| 1 | URL en `vercel.app` | 11 | No existe `llms.txt` |
| 2 | View-source vacío (SPA sin prerender) | 12 | `robots.txt` bloqueando la IA |
| 3 | Sin página de 404 | 13 | Sin favicon |
| 4 | Vite + React para todo | 14 | Sin `sitemap.xml` |
| 5 | Mismo `<title>` en todas las páginas | 15 | Sin atributo `lang` |
| 6 | Sin meta description | 16 | Imágenes sin `alt` |
| 7 | Sin Open Graph / OG image | 17 | Sourcemaps expuestos |
| 8 | Datos no estructurados (sin JSON-LD) | 18 | Errores en consola |
| 9 | Varios `<h1>` o ninguno | 19 | Bundle JS gigante |
| 10 | Sin tag canónico | 20 | Imágenes sin optimizar ni lazy loading |

## 📦 Qué contiene

| Archivo | Qué es |
|---------|--------|
| `SKILL.md` | ⭐ La skill completa: instrucciones para cualquier agente IA (las 20 señales + verificación + reporte) |
| `scripts/audit.mjs` | Auditor automático de las 20 señales. Node 18+, **cero dependencias**, reporte markdown o `--json` |
| `templates/` | Plantillas base: `robots.txt`, `llms.txt`, `vercel.json`, `vite.config.ts`, `sitemap-gen.mjs` |
| `AGENTS.md` | Instrucciones para agentes que escaneen el repo |
| `.github/workflows/ci.yml` | Smoke tests del auditor (CI) |

## 🚀 Cómo usarlo

### Opción A — Pégale la skill al agente (cualquier IA)

1. Abre [`SKILL.md`](SKILL.md) y copia su contenido.
2. Pégalo en tu agente junto con la URL del sitio.
3. Si tienes Node: ejecuta antes el auditor para un diagnóstico rápido:
   ```bash
   node scripts/audit.mjs https://tu-sitio.vercel.app
   ```

### Opción B — Instálala como skill

```bash
# opencode
mkdir -p ~/.config/opencode/skills/vibecode-rehab && cp SKILL.md ~/.config/opencode/skills/vibecode-rehab/

# Claude Code
mkdir -p ~/.claude/skills/vibecode-rehab && cp SKILL.md ~/.claude/skills/vibecode-rehab/

# Grok / agentes que usan .grok/skills
mkdir -p .grok/skills/vibecode-rehab && cp SKILL.md .grok/skills/vibecode-rehab/
```

### Opción C — Solo diagnóstico de un vistazo

```bash
node scripts/audit.mjs https://sitio.vercel.app            # reporte markdown
node scripts/audit.mjs https://sitio.vercel.app --json     # para consumo programático
node scripts/audit.mjs https://sitio.vercel.app https://sitio.vercel.app/precios  # varias páginas
```

Si el sitio tiene `sitemap.xml`, el auditor auto-analiza hasta 3 páginas extra (títulos, h1, metas…). En SPAs que curl no puede renderizar, la skill instruye al agente a usar **Firecrawl** (`npx -y firecrawl-cli@latest init`) para crawlear con JavaScript real.

## 🧹 Qué esperar del reporte

19 de 20 señales se verifican con HTTP real; la nº 18 (consola) queda como acción manual con instrucción exacta. Cada hallazgo lleva **confianza**: `confirmed` / `probable` / `informational` / `likely_false_positive` — el agente no inventa resultados. Cierre de la skill: Lighthouse (≥ 90 Performance/SEO/Accessibility/Best Practices), Rich Results, Sharing Debugger y accesos `robots.txt`/`sitemap.xml`/`llms.txt`.

## 🙏 Built with

- [**watermarks-remover**](https://github.com/guillaumemeyer/watermarks-remover) — formato de *agent skill* (SKILL.md con frontmatter), clasificación de hallazgos por confianza y estructura de tests/CI de la que este repo aprende.
- [**Firecrawl**](https://github.com/firecrawl) — crawling real con JavaScript para la fase de detección (skill/MCP `firecrawl-cli`, endpoints `map`/`scrape`), respetando robots.txt.
- [**skill-icons**](https://github.com/tandpfun/skill-icons) — los iconos de stack de este README (skillicons.dev).

## 🤝 Contribuciones

¿Otra señal clásica del vibecoding (todo en un `App.jsx` de 3000 líneas, footer de 400 líneas, CTA repetidos…)? Abre un issue o PR con el formato: señal → detección → corrección → verificación. Los cambios a `audit.mjs` deben pasar los smoke tests del CI.

## ⚖️ Uso responsable

Audita y corrige solo sitios propios o con autorización. La skill respeta robots.txt y las políticas de scraping.

---

*Creado porque la IA generó el problema… y la IA también puede arreglarlo.*