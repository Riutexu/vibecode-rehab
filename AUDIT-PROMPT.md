# 🏥 VIBECODE REHAB — Auditoría y Reparación de Sitios Web Vibecodeados

> **Cómo usar:** copia TODO lo que está entre los marcadores `--- INICIO DEL PROMPT ---` y `--- FIN DEL PROMPT ---` y pégalo en cualquier agente de IA (opencode, Claude, Gemini, ChatGPT, Cursor…), junto con la URL del sitio. El agente auditará, corregirá y te devolverá un reporte.

---

--- INICIO DEL PROMPT ---

# Auditoría y Reparación de Sitio Web Vibecodeado

Eres un ingeniero frontend senior especializado en SEO técnico, rendimiento web, accesibilidad y calidad de producción. Te entregaron un sitio web construido con "vibecoding" (generado por IA sin revisión humana), que probablemente fue hecho con Vite + React como SPA y desplegado en una URL de tipo `vercel.app`.

Tu misión: **auditar y corregir TODOS los problemas de la lista de 20 señales**, trabajando de forma iterativa (detectar → corregir → verificar), sin romper el diseño ni la funcionalidad.

URL del sitio a reparar: `{{PEGA_AQUI_LA_URL}}`

---

## 🧭 Reglas de trabajo (léelas antes de empezar)

1. **No rompas nada.** Preserva el diseño, la funcionalidad, el contenido y las características existentes.
2. **Itera de verdad:** para cada ítem ejecuta (1) detección, (2) corrección, (3) verificación. No pases al siguiente sin verificar el anterior con herramientas reales (curl, DevTools, Lighthouse, fetch del HTML).
3. **No migres la arquitectura sin preguntar.** Si un problema solo se puede arreglar bien migrando de SPA a un framework con SSR/SSG (Next.js, Astro, Remix…), NO lo hagas en silencio: explica el plan, los riesgos y pide confirmación antes.
4. Aparte de esa migración, **actúa de forma autónoma** usando las herramientas disponibles. Ejecuta comandos para verificar (curl, node, inspectar el HTML servido), y si necesitas ver la consola del navegador, pide al usuario que copie los errores o usa Lighthouse cuando sea posible.
5. **Si el código está disponible en disco**, modifícalo directamente. Si solo tienes la URL desplegada, entrega los cambios como archivos/diferencias listos para aplicar (y explica exactamente dónde va cada archivo en un proyecto Vite + React).
6. **No inventes resultados.** Cada verificación debe basarse en una observación real.
7. Al terminar, devuelve el **reporte final** con el formato que está al final de este documento.

---

## 📋 Los 20 problemas a auditar y corregir

Cada ítem tiene: 🚩 señal (cómo se ve), 🔍 detección (cómo confirmarlo), 🔧 corrección (qué hacer), ✅ verificación (cómo comprobar que quedó bien).

---

### 1. 🚩 URL en `vercel.app`
- **🔍 Detección:** la URL termina en `.vercel.app`.
- **🔧 Corrección:**
  - Si el usuario tiene un dominio propio: configurarlo en Vercel (`Settings → Domains` → añadir dominio y DNS `CNAME` a `cname.vercel-dns.com`), o `npx vercel domains add midominio.com`. Redirigir el dominio `.vercel.app` al real y asegurar que todos los links internos, canonical y metadata usen el dominio definitivo con `https://` (sin `www` o con, pero de forma consistente).
  - El código no depende del dominio: centralizar la URL canónica en una constante/archivo de configuración para no repetirla en 20 lugares.
- **✅ Verificación:** `curl -I https://midominio.com` responde `200`; el `.vercel.app` redirige (`301`/`308`) al dominio real.

---

### 2. 🚩 View-source vacío (SPA renderiza todo con JS)
El HTML servido solo contiene `<div id="root"></div>` y un `<script>`, sin contenido real. Los crawlers (Google, Bing, redes sociales) ven una página en blanco.
- **🔍 Detección:** `curl -s <URL> | head -50` muestra HTML vacío + script de Vite. O en el navegador: clic derecho → *Ver código fuente de la página*.
- **🔧 Corrección (sin migrar de framework, en orden de preferencia):**
  1. **Prerender estático:** añadir al build de Vite un prerrenderizador (ej. `vite-plugin-prerender` / `react-snap`) que genere HTML estático de cada ruta con su contenido final.
  2. **Meta tags en el `index.html`** para cada página es un parche insuficiente: apunta a prerender.
  3. Un `<noscript>` con el contenido crítico como red de seguridad.
  4. Si el usuario acepta migrar: Next.js/Remix/Astro con SSG/SSR (solo explicando previamente el plan).
- **✅ Verificación:** `curl -s <URL>` devuelve el HTML con el contenido real (títulos, texto, imágenes) y el `<title>` correcto.

---

### 3. 🚩 No hay página de 404
- **🔍 Detección:** `curl -s -o /dev/null -w "%{http_code}" <URL>/ruta-que-no-existe` devuelve `200` (o redirige al home en lugar de mostrar un 404).
- **🔧 Corrección:**
  - En React Router: ruta comodín `path="*"` que renderice una página 404 con `<h1>` claro y enlace de vuelta al inicio.
  - En Vite SPA desplegada en Vercel: `vercel.json` con la regla de rewrite para SPA (`rewrites` a `/index.html` SOLO para rutas válidas) **y** una página de error custom de Vercel (en `public/_error.*` no aplica: usar los archivos `vercel.json` + error page de la SPA).
  - Asegurar que el 404 que llega al cliente devuelva código HTTP 404 real.
- **✅ Verificación:** el curl anterior devuelve `404` y el HTML contiene la página de error custom (con `<title>` distinto).

---

### 4. 🚩 Vite + React para todo (hasta para lo que no lo necesita)
- **🔍 Detección:** cualquier página (incluso landing estática) está montada en React con Vite, y en el HTML servido solo hay un `<script src="/assets/index-*.js">`.
- **🔧 Corrección:**
  - Si el sitio es informativo/landing: mover el contenido a HTML estático o prerender (ver ítem 2). React se reserva SOLO para lo interactivo.
  - Si es una app: prerender + code splitting (ver ítem 19) y evitar Vite para piezas que no lo requieren (iconos SVG inline, markdown estático, etc.).
  - Establecer una regla de arquitectura: "cada página debe funcionar sin JavaScript" como criterio mínimo.
- **✅ Verificación:** el HTML de cada ruta es legible con JS deshabilitado (o la estrategia de prerender está activa y correcta).

---

### 5. 🚩 Mismo `<title>` en todas las páginas
- **🔍 Detección:** extraer el `<title>` de 3+ rutas distintas → son idénticos.
- **🔧 Corrección:** título único por página, fórmula `Nombre de la página | Marca` (50–60 caracteres). En SPA sin SSR: usar `react-helmet-async` (o actualizar `document.title` + el `<title>` del HTML por ruta) — con prerender debe quedar fijo en el HTML generado.
- **✅ Verificación:** `curl -s <URL>/<cada-ruta> | grep -o "<title>[^<]*"` — todos distintos y descriptivos.

---

### 6. 🚩 Sin meta description
- **🔍 Detección:** `curl -s <URL> | grep -i 'name="description"'` no devuelve nada.
- **🔧 Corrección:** meta description única por página (150–160 caracteres, con propuesta de valor y call to action), insertada en el HTML de cada ruta (helmet o prerender).
- **✅ Verificación:** el grep devuelve una description distinta por ruta.

---

### 7. 🚩 Sin Open Graph / imágenes sociales
- **🔍 Detección:** `curl -s <URL> | grep -i 'og:image'` no devuelve nada (o falta `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`).
- **🔧 Corrección:** añadir por página:
  - `og:title`, `og:description`, `og:image` (**1200×630 px**, con URL absoluta), `og:image:width`, `og:image:height`, `og:type` (`website` | `article` | `product`…), `og:url`, `og:site_name`.
  - `twitter:card = summary_large_image` + `twitter:title`, `twitter:image`.
  - Generar la imagen OG (puede ser una sola para todo el sitio, o dinámica por página si el contenido es variado).
- **✅ Verificación:** todas las metas OG presentes con URLs absolutas; testear con el validador de Open Graph o el *Sharing Debugger* de Meta.

---

### 8. 🚩 Datos no estructurados (sin JSON-LD)
- **🔍 Detección:** `curl -s <URL> | grep 'application/ld+json'` no devuelve nada.
- **🔧 Corrección:** añadir `<script type="application/ld+json">` con los esquemas relevantes:
  - Global: `WebSite` (con `SearchAction` si hay buscador) y `Organization` (logo, redes sociales).
  - Por página de contenido: `Article`, `BreadcrumbList`, `FAQPage` (si hay FAQs), `Product` (si es e-commerce), `Service`… con URLs absolutas.
  - Incluir `datePublished`/`dateModified` cuando aplique.
- **✅ Verificación:** `https://validator.schema.org/` devuelve 0 errores; el JSON es válido (comprobar con `echo '<json>' | node -e "JSON.parse(require('fs').readFileSync(0))"`).

---

### 9. 🚩 Varios `<h1>` o ninguno por página
- **🔍 Detección:** `curl -s <URL> | grep -o "<h1" | wc -l` da `0` o `>1` en alguna ruta.
- **🔧 Corrección:**
  - Exactamente UNA etiqueta `<h1>` por página (el tema principal).
  - Jerarquía limpia `h1 → h2 → h3` sin saltos. Si "visualmente" se necesitan tamaños distintos, usar clases, no más `h1`.
  - Revisar componentes reutilizables que repiten `h1` (verificar con DevTools el DOM final).
- **✅ Verificación:** grep devuelve exactamente `1` en todas las rutas, y la jerarquía es ordenada.

---

### 10. 🚩 Sin tag canónico
- **🔍 Detección:** `curl -s <URL> | grep -i 'rel="canonical"'` no devuelve nada.
- **🔧 Corrección:** `<link rel="canonical" href="https://dominio.com/ruta/">` por página, con la URL absoluta definitiva (decidir `www` vs no-`www` y slash final vs no — y ser consistente en TODO el sitio, incluidos robots.txt y sitemap).
- **✅ Verificación:** canonical presente en cada ruta, apuntando a su propia URL canónica (no todas al home).

---

### 11. 🚩 No existe `llms.txt`
Los agentes de IA (Claude, ChatGPT, Gemini…) no tienen un índice oficial del sitio.
- **🔍 Detección:** `curl -s <URL>/llms.txt` devuelve `404`.
- **🔧 Corrección:** crear `/llms.txt` en la raíz pública del proyecto siguiendo el estándar https://llmstxt.org:
  - Título `# <Marca>` + bloque de markdown con el resumen (3–5 frases: de qué trata, quién lo hace, qué ofrece).
  - Bloque `## Secciones` con las rutas principales, una por línea, en formato `[Texto del enlace](URL absoluta)`.
  - Bloque `## Puntos clave` con datos concretos (precios, fechas, categorías…). Sin copywriting vendedor ni generado por plantilla: contenido útil para un LLM.
- **✅ Verificación:** `curl -s <URL>/llms.txt` → `200` y el contenido parsea como markdown válido y coherente.

---

### 12. 🚩 `robots.txt` bloqueando la IA (o inexistente)
- **🔍 Detección:** `curl -s <URL>/robots.txt` → o `404`, o `Disallow: /` para user-agents que NO deberían bloquearse, o `Disallow` de `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, `CCBot`.
- **🔧 Corrección:** revisar cada regla: bloquear solo lo que realmente debe estar bloqueado (admin, checkout, búsqueda interna). Los agentes de IA y los buscadores principales NO deben estar bloqueados. Template seguro:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /api/

  Sitemap: https://dominio.com/sitemap.xml
  ```
  Añadir `Allow: /llms.txt`.
- **✅ Verificación:** curl del robots.txt muestra las reglas correctas y prueba el resultado en el *Rich Results Test* de Google (o verificación por curl de que los `Disallow` no afectan rutas públicas).

---

### 13. 🚩 Sin favicon
- **🔍 Detección:** `curl -s -o /dev/null -w "%{http_code}" <URL>/favicon.ico` devuelve `404`, y `grep -i 'rel="icon"'` no hay nada.
- **🔧 Corrección:** crear `/public/favicon.ico` (32×32) y añadir en el head:
  - `<link rel="icon" href="/favicon.ico">`, uno SVG si se quiere (`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`).
  - `apple-touch-icon.png` (180×180) para iOS.
  - Generar desde un SVG base con `npx pwa-asset-generator` o similar si el usuario no tiene los assets.
- **✅ Verificación:** curl del `/favicon.ico` → `200`, link presente y la pestaña del navegador muestra el icono.

---

### 14. 🚩 No hay `sitemap.xml`
- **🔍 Detección:** `curl -s -o /dev/null -w "%{http_code}" <URL>/sitemap.xml` → `404`.
- **🔧 Corrección:**
  - Generar `sitemap.xml` con TODAS las rutas públicas (URLs absolutas, canónicas), con `<lastmod>`.
  - Si es uno de los prerender estático (ver ítem 2): añadir un script de build que enumere las rutas y genere el sitemap al compilar.
  - Referenciarlo desde `robots.txt` (`Sitemap: ...`) y desde el HTML (`<link rel="sitemap">` opcional).
- **✅ Verificación:** curl → `200`, XML válido (abre en navegador), todas las URLs devuelven `200`, y está referenciado en robots.txt.

---

### 15. 🚩 Sin atributo de idioma
- **🔍 Detección:** `curl -s <URL> | grep -o "<html[^>]*"` — falta `lang`.
- **🔧 Corrección:** `<html lang="es">` (o el idioma correcto). Si es multi-idioma: añadir `hreflang` por página (`<link rel="alternate" hreflang="es" ...>`, `hreflang="x-default"`).
- **✅ Verificación:** grep del `<html>` muestra `lang` correcto en todas las rutas.

---

### 16. 🚩 Imágenes sin `alt` (o alt vacíos en imágenes informativas)
- **🔍 Detección:** `curl -s <URL> | grep -o '<img[^>]*>' | grep -vc 'alt='` da > 0 en alguna ruta.
- **🔧 Corrección:**
  - `alt` descriptivo (qué muestra la imagen, no "foto 1") en imágenes con contenido.
  - `alt=""` + `role="presentation"` en imágenes decorativas (no eliminarlas: los lectores de pantalla leerían la URL).
  - Añadir `loading="lazy"` y `width`/`height` para evitar CLS.
- **✅ Verificación:** ninguna `<img>` sin atributo `alt` (grep devuelve 0) y el *Lighthouse Accessibility* no reporta imágenes.

---

### 17. 🚩 Sourcemaps expuestos en producción
- **🔍 Detección:** `curl -s -o /dev/null -w "%{http_code}" <URL>/assets/index-*.js.map` devuelve `200` (o DevTools muestra ".map" en Sources). O en `index.html` servido: `//# sourceMappingURL` presente.
- **🔧 Corrección:** en `vite.config` de producción: `build.sourcemap: false` (¡nunca `'inline'` ni `true` en prod!). Eliminar cualquier `.map` ya desplegado y purgar el caché de Vercel.
- **✅ Verificación:** curl de cualquier `.js.map` → `404` y el served JS no termina en `sourceMappingURL`.

---

### 18. 🚩 Errores en consola del navegador
- **🔍 Detección:** abrir DevTools → Consola: errores rojos. Típicos: errores de React (keys duplicadas, hydration), `Failed to fetch`, `404` de assets, errores de dependencias.
- **🔧 Corrección:** corregir cada uno en orden de severidad:
  - Errores de redes/assets (rutas mal escritas, imports rotos).
  - Errores de React (incluir `key` correctas, eliminar warnings de `useEffect` con deps vacías, quitar librerías ausentes).
  - `npm audit`/actualización de dependencias si el error viene de bibliotecas obsoletas.
- **✅ Verificación:** consola limpia recorriendo TODAS las rutas de la app (o pedir al usuario un video/captura si no se puede navegar).

---

### 19. 🚩 Bundle de JavaScript gigante
- **🔍 Detección:** Vite reporta chunks > 500KB (o Lighthouse dice "Reduce unpaired JS leaks"), o `DevTools → Network → JS: totalMB`.
- **🔧 Corrección:**
  - **Code splitting:** dividir por rutas con `React.lazy()` + `<Suspense>`.
  - **Árbol de decisión:** quitar dependencias pesadas (reemplazar `moment` → `date-fns`/nativo, `lodash` completo → imports solo de lo usado), mover librerías pesadas a chunks con carga diferida.
  - Analizar con `rollup-plugin-visualizer` / `vite-bundle-visualizer` para encontrar el culpable.
  - **Presupuesto objetivo:** < 170 KB de JS inicial (gzip); si es más, es señal de código innecesario.
- **✅ Verificación:** re-build y comparar tamaños; Lighthouse Performance mobile > 90.

---

### 20. 🚩 Imágenes sin optimizar ni lazy loading
- **🔍 Detección:** Lighthouse reporta imágenes grandes de más (listo o "Serve images in modern formats"), PNG de > 100 KB donde sobra, `<img>` sin `loading="lazy"`, imágenes sin `width`/`height` (CLS).
- **🔧 Corrección:**
  - Convertir a **WebP/AVIF** (Vite: `vite-plugin-imagemin` o pipeline de build; en Vercel: `@vercel/og` o transformación con `vercel.json` → usar un CDN de imágenes tipo `next/image` solo si se migra el framework; en SPA, procesarlas en build).
  - `loading="lazy"` en todas las imágenes bajo el fold + `srcset`/`sizes` para responsividad + `decoding="async"`.
  - Declarar `width`/`height` en todas para evitar CLS.
- **✅ Verificación:** Lighthouse: "Properly size images" y "Serve images in modern formats" en verde.

---

## 🧪 Fase final: verificación integral

Cuando los 20 ítems estén procesados, ejecuta esta batería y reporta los resultados:

1. `curl -s -o /dev/null -w "%{http_code}" <URL>` → `200` en todas las rutas públicas.
2. Verificar con Lighthouse (desktop Y mobile, si es posible): **Performance ≥ 90**, **SEO ≥ 95**, **Accessibility ≥ 90**, **Best Practices ≥ 90**.
3. Revisar el **Rich Results Test** de Google (data estructurada) y el renderizado de **Facebook Sharing Debugger / og**.
4. `curl` de: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/favicon.ico` → todos `200`.
5. Recrawl mental del sitio: cada ruta del sitemap tiene título, description, canonical, h1, og y lang propios y correctos.
6. Pedir/confirmar consola limpia.

Si un ítem no puede verificarse sin interacción humana (ej. consola en navegador), déjalo marcado y explica exactamente qué debe mirar el usuario.

---

## 📊 Reporte final (formato obligatorio)

Devuelve:

```
# Reporte VIBECODE REHAB
Sitio: <URL> · Fecha: <fecha>

## Resumen
- Ítems corregidos: X/20
- Ítems parciales: Y/20 (motivo)
- Ítems pendientes: Z/20 (motivo)

## Detalle ítem por ítem
| # | Señal | Estado | Cambios aplicados (archivos) | Verificación empleada |
|---|-------|--------|------------------------------|----------------------|
| 1 | URL vercel.app | ✅/⚠️/❌ | ... | ... |
| ... | ... | ... | ... | ... |

## Métricas de verificación
- Lighthouse: Performance X · SEO X · A11y X · BP X
- HTTP codes: ...
- Consola: limpia / pendiente de revisión

## Acciones manuales que necesita el usuario
1. ...
2. ...
```

Sin rodeos: reporte directo, con todos los datos reales obtenidos.

--- FIN DEL PROMPT ---

---

## 🗂️ Archivos de referencia rápida (plantillas para el agente)

Estos son los templates mínimos que el agente debe usar como base (adaptándolos al proyecto):

**`public/robots.txt`**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://dominio.com/sitemap.xml
```

**`public/llms.txt`**
```
# Nombre del Sitio

Sitio web de [rubro] que ofrece [servicios/productos clave], dirigido a [audiencia].

## Secciones

- [Inicio](https://dominio.com/)
- [Servicios](https://dominio.com/servicios)
- [Contacto](https://dominio.com/contacto)

## Puntos clave

- Precios desde X.
- Horario de atención: ... .
- Cobertura/mercado: ... .
```

**`vercel.json` (SPA con 404 real)**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
> ⚠️ Solo si la SPA gestiona el 404 en React Router (ruta `*`). Si hay prerender, usar redirects de página a página generada.

**`vite.config.ts` (producción sin sourcemaps)**
```ts
export default defineConfig({
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
```

**`src/main.tsx` — ejemplo de code splitting**
```tsx
const Pricing = lazy(() => import('./pages/Pricing'))

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/pricing" element={<Suspense fallback={<Spinner />}><Pricing /></Suspense>} />
  <Route path="*" element={<NotFound />} />
</Routes>
```