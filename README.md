<p align="center">
  <img src="https://img.shields.io/badge/opencode-Claude%20Code-Gemini%20ChatGPT%20Cursor-blue?style=flat-square" alt="Funciona con cualquier agente IA" />
  <img src="https://github.com/Riutexu/vibecode-rehab/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://img.shields.io/github/license/Riutexu/vibecode-rehab?style=flat-square" alt="Licencia MIT" />
</p>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,vite,vercel,astro,nextjs,nodejs,bash,powershell,githubactions,md,html,css&perline=6&theme=light" alt="React, Vite, Vercel, Astro, Next.js, Node.js, Bash, PowerShell, GitHub Actions, Markdown, HTML, CSS" />
  </a>
</p>

# 🏥 VIBECODE REHAB

> Las 20 señales de que un sitio fue vibecodeado — convertidas en una **skill para agentes de IA**, un **auditor ejecutable** y **plantillas de corrección** listas para usar.

Pega la URL de cualquier sitio en esta skill (opencode, Claude Code, Gemini, ChatGPT, Cursor…) y el agente auditara y corregirá **las 20 señales típicas del vibecoding** de forma autónoma: detectar → corregir → verificar, con un reporte final que clasifica cada hallazgo por su confianza.

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
| `SKILL.md` | ⭐ La skill completa: instrucciones para cualquier agente IA (20 señales + verificación + reporte + errores a evitar) |
| `scripts/audit.mjs` | Auditor automático de las 20 señales. Node 18+, **cero dependencias**: paralelo, mide gzip, verifica og:image y URLs del sitemap. Reporte markdown, `--json`, `--output` |
| `templates/` | Archivos base: `Seo.tsx` (title/description/OG/canonical/JSON-LD por página), `NotFound.tsx` (404), `robots.txt`, `llms.txt`, `vercel.json`, `vite.config.ts`, `sitemap-gen.mjs` |
| `AGENTS.md` | Instrucciones para agentes que escaneen el repo |
| `.github/workflows/ci.yml` | Pruebas del auditor contra example.com y un sitio Vite real |

## 🚀 Cómo usarlo

### Opción A — Pégalo en cualquier agente IA

1. Abre [`SKILL.md`](SKILL.md) y copia su contenido.
2. Pégalo en el chat junto con la URL del sitio a reparar.
3. Si tienes Node, ejecuta antes el diágnostico automático:
   ```bash
   node scripts/audit.mjs https://tu-sitio.vercel.app
   ```

### Opción B — Instálalo como skill

```bash
# opencode
mkdir -p ~/.config/opencode/skills/vibecode-rehab && cp SKILL.md ~/.config/opencode/skills/vibecode-rehab/

# Claude Code
mkdir -p ~/.claude/skills/vibecode-rehab && cp SKILL.md ~/.claude/skills/vibecode-rehab/

# Grok (y agentes con .grok/skills)
mkdir -p .grok/skills/vibecode-rehab && cp SKILL.md .grok/skills/vibecode-rehab/
```

### Opción C — Solo diagnóstico de un vistazo

```bash
node scripts/audit.mjs https://sitio.vercel.app                            # markdown
node scripts/audit.mjs https://sitio.vercel.app --json                     # JSON
node scripts/audit.mjs https://sitio.vercel.app --limit 10                 # 10 páginas del sitemap
node scripts/audit.mjs https://sitio.vercel.app --output informe.md        # a archivo
node scripts/audit.mjs https://sitio.vercel.app https://sitio.vercel.app/precios   # varias páginas
```

## 📋 Ejemplo real de salida (resumen)

```
# Auditoría VIBECODE REHAB — https://tusitio.vercel.app
## Resumen: 7 ✅ · 6 ⚠️ · 7 ❌

| # | Señal | Estado | Confianza | Detalle |
|---|-------|--------|-----------|---------|
| 1 | URL en vercel.app | ❌ | confirmado | El dominio "tusitio.vercel.app" es de Vercel… |
| 2 | View-source vacío (SPA sin prerender) | ❌ | confirmado | 3 página(s) sin contenido real en el HTML… |
| 5 | Mismo <title> en todas las páginas | ❌ | confirmado | Repetido en todas: "Mi App" |
| 13 | Favicon | ✅ | confirmado | link rel=icon presente… |
| 19 | Bundle JS gigante | ⚠️ | probable | 642 KB (1.9 MB sin comprimir) en 3 script(s)… |
```

## 🧹 Qué esperar del reporte

El auditor verifica 19 de 20 señales con HTTP real (la de la consola queda como acción manual con instrucción exacta). Cada hallazgo lleva **confianza** (`confirmado` / `probable` / `informativo` / `posible falso positivo`): ni el script ni la skill inventan resultados. El cierre de la skill ejecuta Lighthouse (≥ 90 en Performance/SEO/Accessibility/Best Practices), Rich Results, Sharing Debugger y accesos a `robots.txt`/`sitemap.xml`/`llms.txt`.

Para SPAs que curl no puede renderizar, la skill indica al agente usar **Firecrawl** (`npx -y firecrawl-cli@latest init`) para crawlear con JavaScript real.

## ❓ Preguntas frecuentes

- **¿Y si no tengo Node?** La skill funciona sola: el agente usar curl y/o Firecrawl. El script solo acelera y objetiva el diagnóstico.
- **¿Y si solo tengo la URL desplegada, no el código?** La skill entrega los archivos listos (y dice dónde va cada uno en un proyecto Vite + React). Con Firecrawl además puede verificar los cambios por ti.
- **¿Sirve para Netlify o Cloudflare?** Sí: las señales son universales; solo adapta `vercel.json` (página de error / rewrites de la plataforma) y el despliegue.
- **¿El script puede romper algo?** No: es de solo lectura (peticiones HTTP). Toda corrección la hace el agente bajo tus reglas.
- **¿Qué pasa con la licencia?** MIT oficial (texto original en inglés, estándar jurídico).

## 🙏 Hecho con

- [**watermarks-remover**](https://github.com/guillaumemeyer/watermarks-remover) — formato de skill para agentes (SKILL.md con frontmatter), clasificación de hallazgos por confianza y disciplina de tests/CI que este repo copia.
- [**Firecrawl**](https://github.com/firecrawl) — crawling real con JavaScript para la fase de detección (skill/MCP `firecrawl-cli`, endpoints `map`/`scrape`), respetando robots.txt por defecto.
- [**skill-icons**](https://github.com/tandpfun/skill-icons) — los iconos de stack de este README (skillicons.dev).

## 🤝 Contribuciones

¿Otra señal clásica del vibecoding (todo en un `App.jsx` de 3000 líneas, footer de 400 líneas, CTA repetidos…)? Abre un issue o PR con el formato: señal → detección → corrección → verificación. Los cambios a `audit.mjs` deben pasar los smoke tests del CI.

## ⚖️ Uso responsable

Audita y corrige solo sitios propios o con autorización. La skill y el script respetan robots.txt y las políticas de scraping.

---

*Creado porque la IA generó el problema… y la IA también puede arreglarlo.*