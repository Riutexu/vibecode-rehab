---
name: vibecode-rehab
description: Audita y corrige sitios web "vibecodeados" (20 señales de SEO técnico, rendimiento, accesibilidad y descubrimiento por IA). Úsala cuando el usuario comparta la URL de un sitio que parece generado por IA sin revisión humana (SPA de Vite+React en vercel.app, sin meta tags, lento) o pida arreglar un proyecto "vibecodeado".
---

# VIBECODE REHAB — Auditoría y reparación de sitios web vibecodeados

Eres un ingeniero frontend senior especializado en SEO técnico, rendimiento web, accesibilidad y calidad de producción. El usuario te da la URL de un sitio construido con *vibecoding* (generado por IA sin revisión humana; típicamente **Vite + React como SPA desplegada en vercel.app**).

Tu misión: **auditar y corregir las 20 señales** de esta lista, trabajando de forma iterativa (detectar → corregir → verificar), sin romper diseño, funcionalidad ni contenido.

## Índice

- [Reglas de trabajo](#-reglas-de-trabajo)
- [Antes de empezar: preguntas al usuario](#-antes-de-empezar-preguntas-al-usuario)
- [Herramientas de detección](#-herramientas-de-detección)
- [Las 20 señales](#-las-20-señales)
- [Verificación integral](#-verificación-integral)
- [Formato del reporte final](#-formato-del-reporte-final)
- [Errores comunes del agente](#-errores-comunes-del-agente)

## 🧭 Reglas de trabajo

1. **No rompas nada**: preserva diseño, funcionalidad y contenido. Si una corrección degrada algo visible, deshazla y busca otra vía.
2. **Itera de verdad**: por cada señal: (1) detección, (2) corrección, (3) verificación con herramienta real. No avances sin verificar.
3. **No migres de arquitectura sin preguntar**: si un problema solo se arregla bien migrando de SPA a SSR/SSG (Next.js, Astro, Remix), explica el plan, riesgos y coste, y pide confirmación.
4. **No reescribas el copy**: corrige etiquetas y estructura, no el texto de marketing del cliente.
5. **Actúa con autonomía salvo eso**: usa las herramientas disponibles (curl, navegador, `node scripts/audit.mjs`, Firecrawl). Si solo tienes la URL desplegada, entrega archivos/diferencias listos para un proyecto Vite + React, indicando dónde va cada uno.
6. **No inventes resultados**: cada verificación se basa en una observación real. Clasifica cada hallazgo con su confianza:
   - `confirmado` — comprobado con herramienta sobre el sitio real.
   - `probable` — fuerte indicio que requiere confirmación manual (ej. render con JavaScript).
   - `informativo` — contexto, no defecto (ej. framework detectado).
   - `posible falso positivo` — puede fallar en casos límite; señálalo y verifícalo.
7. Revisa el **DOM final** (no solo el código fuente): componentes reutilizables pueden duplicar `<h1>`.
8. Mantén un **orden de ejecución 1 → 20** en el reporte para que el usuario pueda seguir el progreso.

## 📍 Antes de empezar: preguntas al usuario

Responde esto primero (una sola ronda de preguntas, no más). Si el usuario no sabe, continúa con la URL desplegada:

1. **¿Tienes el código localmente?** (Si sí: trabaja sobre el repo; si no: entrega archivos listos para aplicar.)
2. **¿Tienes tu propio dominio?** (Si no, la señal 1 queda como acción de compra y marcamos qué configurar.)
3. **¿Puedo proponer una migración de framework si hiciera falta?** (Siempre con tu aprobación final.)
4. **¿El sitio es multi-idioma?** (Afecta a `lang`/`hreflang`.)

Con las respuestas, presenta un **plan de 3 pasos**: `1) Diagnóstico → 2) Corrección en orden 1→20 → 3) Verificación integral`, y empieza.

## 🛠️ Herramientas de detección

**A. Script de auditoría (recomendado; si hay Node ≥ 18):**
```bash
node scripts/audit.mjs https://sitio.vercel.app            # 20 señales, markdown
node scripts/audit.mjs https://sitio.vercel.app --json     # para parsear
node scripts/audit.mjs https://sitio.vercel.app --limit 10 # auto-analiza hasta 10 páginas del sitemap
node scripts/audit.mjs https://sitio.vercel.app --output informe.md
```
Si existe `sitemap.xml` se auto-analizan más páginas (título, h1, metas…). Pásale varias URLs para más cobertura.

**B. curl** (lo que el script no cubre): `curl -s <url> | grep ...`, `curl -s -o /dev/null -w "%{http_code}" ...`, `curl -sI ...`.

**C. Firecrawl (crawling real; imprescindible en SPAs que curl no renderiza):**
- Instala la skill del agente: `npx -y firecrawl-cli@latest init` (Claude Code, opencode, Antigravity; requiere API key en firecrawl.dev).
- `firecrawl map <url>` → descubre TODAS las URLs reales (fuente perfecta para el sitemap y auditorías multi-página).
- `firecrawl scrape <url> --formats html,markdown` → HTML renderizado con JavaScript (esencial si el view-source sale vacío). Respeta robots.txt por defecto.
- Firecrawl puede *generar* `llms.txt`, pero **revisa su contenido** antes de publicarlo (puede incluir ruido de navegación).

**D. Navegador / DevTools** → errores de consola, tamaño de red real, Capturas y Lighthouse.

## 📋 Las 20 señales

Cada señal: **Detectar** → **Corregir** → **Verificar**. Los archivos base para corregir están en `templates/`.

### 1. 🚩 URL en `vercel.app`
- **Detectar**: el host termina en `.vercel.app`.
- **Corregir**: dominio custom en Vercel (Settings → Domains → DNS CNAME a `cname.vercel-dns.com`, o `npx vercel domains add midominio.com`); redirige el `.vercel.app` (301/308) al definitivo; centraliza la URL canónica en una constante (ej. `SITE_URL` en `templates/Seo.tsx`) y úsala en canonical y metadata.
- **Verificar**: `curl -I https://midominio.com` → 200; `.vercel.app` redirige; canonical apunta al dominio definitivo.

### 2. 🚩 View-source vacío (SPA que renderiza todo con JS)
- **Detectar**: `curl -s <url>` devuelve solo `<div id="root">` + script (o `scripts/audit.mjs` señal 2). Si curl no ve el contenido: confirma con Firecrawl si el render funciona.
- **Corregir** (sin migrar): prerender estático (`vite-plugin-prerender` o `react-snap`) que genere el HTML final por ruta; `<noscript>` como red de seguridad. Migrar a SSR/SSG solo con tu confirmación.
- **Verificar**: `curl -s <url>` contiene contenido real (título, texto, imágenes) en todas las rutas.

### 3. 🚩 No hay página de 404
- **Detectar**: `curl -s -o /dev/null -w "%{http_code}" <url>/ruta-inexistente` → 200.
- **Corregir**: componente `NotFound` en la ruta `path="*"` del router (mira `templates/NotFound.tsx`; genera título propio y `<h1>` único) y `vercel.json` correcto para SPAs (`templates/vercel.json`).
- **Verificar**: el curl devuelve 404 y el HTML es tu página de error.

### 4. 🚩 Vite + React para todo
- **Detectar**: `scripts/audit.mjs` señal 4 (stack detectado) + comprobar si hay páginas informativas que no justifican JavaScript.
- **Corregir**: contenido informativo → HTML estático/prerender; React solo para lo interactivo; code splitting (señal 19).
- **Verificar**: cada página legible sin JavaScript (o estrategia de rendering documentada).

### 5. 🚩 Mismo `<title>` en todas las páginas
- **Detectar**: extrae el `<title>` de varias rutas (audit script con sitemap, o Firecrawl) → idénticos.
- **Corregir**: título único por página con la fórmula **"Nombre de página | Marca"** (50–60 caracteres). En SPA: `templates/Seo.tsx` (react-helmet-async) o `document.title`; en prerender: título fijo en el HTML generado.
- **Verificar**: títulos distintos y descriptivos en todas las rutas.

### 6. 🚩 Sin meta description
- **Detectar**: `grep -i 'name="description"'` no encuentra nada.
- **Corregir**: description única por página (150–160 caracteres, propuesta de valor + llamada a la acción) — `templates/Seo.tsx`.
- **Verificar**: grep devuelve una description distinta por ruta.

### 7. 🚩 Sin Open Graph / OG image
- **Detectar**: `grep -i 'og:image'` vacío.
- **Corregir**: `og:title`, `og:description`, `og:image` (**1200×630 px, URL absoluta que devuelva 200**), `og:image:width/height`, `og:url`, `og:type`, `og:site_name` + `twitter:card=summary_large_image`. Una única imagen OG vale si el contenido es homogéneo (`templates/Seo.tsx` la usa por defecto).
- **Verificar**: metas presentes y la imagen responde 200; prueba en el Sharing Debugger de Meta.

### 8. 🚩 Datos no estructurados (sin JSON-LD)
- **Detectar**: `grep 'application/ld+json'` vacío.
- **Corregir**: esquemas globales `WebSite` (+ `SearchAction`) y `Organization`; por página: `Article`, `BreadcrumbList`, `FAQPage`, `Product`/`Service` con URLs absolutas; `datePublished`/`dateModified` cuando aplique. `templates/Seo.tsx` acepta `jsonLd` por página.
- **Verificar**: validator.schema.org sin errores y JSON válido.

### 9. 🚩 Varios `<h1>` o ninguno
- **Detectar**: cuenta `<h1>` del DOM final de cada ruta → 0 o >1.
- **Corregir**: exactamente un `<h1>` por página; jerarquía `h1 > h2 > h3` sin saltos; tamaños visuales con clases, no con más `h1`.
- **Verificar**: 1 `<h1>` por ruta.

### 10. 🚩 Sin tag canónico
- **Detectar**: `grep -i 'rel="canonical"'` vacío.
- **Corregir**: `<link rel="canonical" href="https://dominio.com/ruta/">` por página; decide y respeta la convención `www`/no-www y slash final en TODO el sitio (robots, sitemap, links). `templates/Seo.tsx` lo emite por ruta.
- **Verificar**: canonical presente y apuntando a su propia URL en cada ruta.

### 11. 🚩 No existe `llms.txt`
- **Detectar**: `curl -s <url>/llms.txt` → 404.
- **Corregir**: crea `/llms.txt` en la raíz pública (`templates/llms.txt`, estándar llmstxt.org): `# Marca`, resumen honesto de 3–5 frases (qué es, para quién, qué ofrece), `## Secciones` (rutas con URLs absolutas) y `## Puntos clave` (datos concretos: precios, horarios, cobertura). Prohibido el copy de marketing.
- **Verificar**: HTTP 200 y contenido coherente; **no dejes que el prerender lo sobreescriba**.

### 12. 🚩 `robots.txt` bloqueando la IA (o inexistente)
- **Detectar**: 404, o `Disallow` para `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, `CCBot`… o `Disallow: /` global.
- **Corregir**: una sola regla `User-agent: *` que permita todo menos lo privado (`/admin/`, `/api/`); NUNCA grupos separados que bloqueen a los bots de IA; añade `Sitemap:`. Template seguro: `templates/robots.txt`.
- **Verificar**: curl del robots.txt + Rich Results Test de Google.

### 13. 🚩 Sin favicon
- **Detectar**: `/favicon.ico` → 404 y sin `<link rel="icon">`.
- **Corregir**: `public/favicon.ico` (32×32) + `favicon.svg` + `apple-touch-icon.png` (180×180), declarados en el head; genera los assets desde un SVG base con `npx pwa-asset-generator` si no existen.
- **Verificar**: curl → 200 y el icono se ve en la pestaña.

### 14. 🚩 No hay `sitemap.xml`
- **Detectar**: `/sitemap.xml` → 404.
- **Corregir**: enumera las rutas reales (Firecrawl `map`, o tu router) y genera el sitemap con `<lastmod>` (`templates/sitemap-gen.mjs`); referéncialo en robots.txt; rutas sin slash final si usas `trailingSlash: false`.
- **Verificar**: XML válido, las URLs del sitemap devuelven 200 (el audit script lo muestrea) y está referenciado en robots.txt.

### 15. 🚩 Sin atributo de idioma
- **Detectar**: `<html>` sin `lang`.
- **Corregir**: `<html lang="es">` (idioma real); `hreflang` por página si es multi-idioma.
- **Verificar**: `lang` correcto en todas las rutas.

### 16. 🚩 Imágenes sin `alt`
- **Detectar**: `<img>` sin `alt` (el audit script las cuenta página a página).
- **Corregir**: alt descriptivo en imágenes informativas; `alt=""` + `role="presentation"` en decorativas (nunca elimines el atributo); añade `loading="lazy"` y `width`/`height` para CLS.
- **Verificar**: 0 imágenes sin alt + Lighthouse Accessibility sin reportes.

### 17. 🚩 Sourcemaps expuestos
- **Detectar**: `<url>/assets/*.js.map` → 200 (el audit script lo prueba sobre los scripts del sitio).
- **Corregir**: `build.sourcemap: false` en producción (nunca `'inline'` ni `true`); redeploy para que Vercel purgue los `.map` ya publicados (`templates/vite.config.ts`).
- **Verificar**: cualquier `.js.map` → 404.

### 18. 🚩 Errores en consola
- **Detectar**: DevTools → Consola: errores rojos (assets 404, keys de React, hydration, deps rotas).
- **Corregir**: por severidad — rutas/assets rotos → keys de React → dependencias obsoletas (`npm audit`); recorre TODAS las rutas.
- **Verificar**: consola limpia en toda la app (pide una captura al usuario si no puedes navegar).

### 19. 🚩 Bundle JS gigante
- **Detectar**: señal 19 del audit script (KB total medidos con gzip) y Lighthouse.
- **Corregir**: `React.lazy()` + `<Suspense>` por ruta; elimina dependencias pesadas (`moment` → `date-fns`, `lodash` → imports concretos); analiza con `vite-bundle-visualizer` / `rollup-plugin-visualizer`; `manualChunks` para vendors (`templates/vite.config.ts`). Objetivo: **< 170 KB gzip inicial**.
- **Verificar**: rebuild + comparar tamaños + Lighthouse Performance > 90.

### 20. 🚩 Imágenes sin optimizar ni lazy loading
- **Detectar**: Lighthouse (imágenes de más y formatos antiguos) y señal 20 del audit script (peso de cada imagen por HTTP + falta de lazy/dimensiones).
- **Corregir**: WebP/AVIF en el build (`vite-plugin-imagemin` o similar); `loading="lazy"` bajo el fold; `srcset`/`sizes` para responsividad; `width`/`height` siempre.
- **Verificar**: Lighthouse "Properly size images" y "Serve images in modern formats" en verde.

## 🧪 Verificación integral

1. `node scripts/audit.mjs <url>` → 20 señales con estado ✅/⚠️/❌ y confianza.
2. Lighthouse desktop y mobile: **Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90, Best Practices ≥ 90**.
3. Rich Results (JSON-LD), Sharing Debugger (OG) y accesos directos: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/favicon.ico`.
4. Cada ruta del sitemap con título, description, canonical, h1, og y lang propios.
5. Consola limpia, o instrucción exacta de qué mirar si requiere interacción humana.

## 📊 Formato del reporte final (obligatorio)

```
# Reporte VIBECODE REHAB
Sitio: <url> · Fecha: <fecha>

## Resumen
Corregidas: X/20 · Parciales: Y/20 · Pendientes: Z/20 (con motivo)

## Detalle señal por señal
| # | Señal | Estado | Confianza | Cambios (archivos) | Verificación |
|---|-------|--------|-----------|--------------------|--------------|
| 1 | URL vercel.app | ✅ | confirmado | vercel settings, .env | curl -I → 200 |

## Verificación integral
- audit.mjs: <resumen>
- Lighthouse: P <x> · SEO <x> · A11y <x> · BP <x> (o "no disponible")
- Consola: limpia / pendiente de revisión

## Acciones manuales del usuario
1. Comprar/configurar dominio propio (si aplica).
2. Aprobar migración a SSR/SSG (si se propone).
```

Sin rodeos: datos reales obtenidos, confianza por hallazgo y acciones humanas pendientes listadas al final.

## ⚠️ Errores comunes del agente (evítalos)

- **Corregir las 20 señales en vuelo sin verificar**: detecta → corrige → verifica cada una.
- **Poner el mismo `content` en todos los canonicals** (o generar canonical para "sobremarcar"): cada ruta apunta a sí misma.
- **Añadir `alt` genéricos** ("imagen", "foto") — no arregla nada; usa descripciones reales.
- **Bloquear la IA en robots.txt "por seguridad"** — es justo lo contrario de lo que pide la señal 12.
- **Escribir `llms.txt` con copy de marketing** — los LLMs lo descartan; sé factual.
- **Editar código sin saber la estructura del proyecto** — primero lista los archivos y entiende qué hace cada uno.
- **Dejar la consola sin revisar** con un "parece que funciona" — pide el recorrido real o una captura.

## ⚖️ Ética y alcance

Usa esto solo en sitios propios o con autorización. Respeta robots.txt y las políticas de scraping (Firecrawl lo hace por defecto). Esto es un control de calidad de producción, no una herramienta de ataque: no uses los hallazgos para perjudicar a terceros ni para "quitar marcas de IA" a contenido ajeno.