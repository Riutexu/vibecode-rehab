#!/usr/bin/env node
/**
 * VIBECODE REHAB — Auditor de las 20 señales de un sitio vibecodeado.
 * Cero dependencias, Node 18+ (usa fetch global). Funciona igual en Windows, macOS y Linux.
 *
 * Uso:
 *   node audit.mjs https://sitio.vercel.app                      → reporte markdown
 *   node audit.mjs https://sitio.vercel.app --json               → reporte JSON
 *   node audit.mjs <url> <url2> <url3>                           → varias páginas explícitas
 *   node audit.mjs <url> --limit 10                              → auto-analiza hasta 10 URLs del sitemap
 *   node audit.mjs <url> --output informe.md                     → escribe el reporte a archivo
 *   node audit.mjs <url> --strict                                → sale con código 1 si hay errores
 *
 * Si solo pasas la raíz y existe sitemap.xml, se auto-analizan hasta 3 URLs más
 * (configurable con --limit).
 */

const args = process.argv.slice(2);
const urls = args.filter((a) => /^https?:\/\//i.test(a));
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const limIdx = args.indexOf('--limit');
const limit = limIdx !== -1 ? Math.min(10, Math.max(0, parseInt(args[limIdx + 1], 10) || 0)) : 3;
const outIdx = args.indexOf('--output');
const outFile = outIdx !== -1 ? args[outIdx + 1] : null;

if (urls.length === 0) {
  console.error('Uso: node audit.mjs <url> [url2 ...] [--json] [--limit N] [--output archivo] [--strict]');
  process.exit(1);
}

const BASE = urls[0].replace(/\/+$/, '');
const ORIGIN = new URL(BASE).origin;
const UA = 'VibecodeRehabAudit/1.0';
const CONF_LABEL = {
  confirmed: 'confirmado',
  probable: 'probable',
  informational: 'informativo',
  likely_false_positive: 'posible falso positivo',
};
const AI_BOTS = [
  'gptbot', 'claudebot', 'claude-web', 'anthropic-ai', 'google-extended',
  'perplexitybot', 'ccbot', 'bytespider', 'meta-externalagent', 'cohere-ai',
  'amazonbot', 'applebot-extended', 'facebookbot-ai',
];

const findings = []; // {id, name, status, confidence, detail, fix}
const pages = [];

function F(id, name, status, confidence, detail, fix) {
  findings.push({ id, name, status, confidence, detail, fix });
}

async function get(u, { head = false } = {}) {
  try {
    const res = await fetch(u, {
      method: head ? 'HEAD' : 'GET',
      headers: { 'user-agent': UA, accept: '*/*', 'accept-encoding': 'gzip' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    const text = head ? '' : await res.text();
    const len = res.headers.get('content-length');
    return {
      status: res.status,
      text,
      sizeCompressed: len ? parseInt(len, 10) : null,
      sizeRaw: Buffer.byteLength(text),
      type: res.headers.get('content-type') || '',
    };
  } catch (e) {
    return { status: 0, text: '', sizeCompressed: null, sizeRaw: 0, type: '', error: e.cause?.code || e.message };
  }
}

function absUrl(u) {
  try { return new URL(u, BASE).href; } catch { return u; }
}

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function parsePage(html) {
  const imgs = (html.match(/<img[\s\S]*?>/gi) || []).map((tag) => {
    const src = extract(tag, /src=["']([^"']+)["']/i) || '';
    const noAlt = !/alt=(["'])/i.test(tag);
    const deco = /alt=["'](?:["'])/i.test(tag) || tag.includes('alt=""');
    const attr = (n) => new RegExp(`${n}=(["'])([^"']*)\\1`, 'i').test(tag);
    return { src, noAlt: noAlt && !deco, lazy: attr('loading'), sized: attr('width') && attr('height') };
  });
  return {
    title: extract(html, /<title[^>]*>([^<]*)<\/title>/i),
    metaDesc: /<meta[^>]+name=["']description["']/i.test(html),
    ogImage: (extract(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
      extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:image["']/i)) || null,
    ogTags: (html.match(/<meta[^>]+property=["']og:(title|description|url|type|site_name)["']/gi) || []).length,
    twitterCard: /<meta[^>]+name=["']twitter:card["']/i.test(html),
    ldjson: /application\/ld\+json/i.test(html),
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    canonical: extract(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || null,
    lang: /<html[^>]*\blang=["'][a-zA-Z]{2,3}(?:-[a-zA-Z]{2,3})?["']/i.test(html),
    imgs,
    hasContent: /<h[1-6][\s>]|<\/(?:p|article|section|main|li|nav|h[1-6])>/i.test(html),
    scripts: [...new Set((html.match(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi) || [])
      .map((s) => (extract(s, /src=["']([^"']+\.js[^"']*)["']/i) || '').trim()))],
  };
}

async function main() {
  // ---- Fase 1: página raíz (paralela con los archivos base del sitio) ----
  const [rootPage, sitemapR, robotsR, llmsR, favR, notFoundR] = await Promise.all([
    get(BASE),
    get(`${BASE}/sitemap.xml`),
    get(`${BASE}/robots.txt`),
    get(`${BASE}/llms.txt`),
    get(`${BASE}/favicon.ico`, { head: true }),
    get(`${BASE}/__vibecode_rehab_404_check_xyz`),
  ]);

  const html0 = rootPage.text;
  pages.push({ url: BASE, text: html0, ...parsePage(html0), status: rootPage.status });

  // ---- Fase 2: páginas extra (URLs explícitas + auto-extension por sitemap) ----
  const extraUrls = [...urls.slice(1)];
  if (urls.length === 1 && sitemapR.status === 200) {
    const locs = (sitemapR.text.match(/<loc[^>]*>([^<]+)<\/loc>/gi) || [])
      .map((l) => l.replace(/<\/?loc[^>]*>/gi, '').trim())
      .filter((l) => l && l !== BASE + '/' && !/\.(png|jpg|jpeg|webp|gif|svg|pdf|ico|xml|txt)$/i.test(l))
      .slice(0, limit);
    extraUrls.push(...locs);
  }
  const extraPages = await Promise.all(
    [...new Set(extraUrls)].slice(0, 10).map(async (u) => {
      const p = await get(u);
      return { url: u, text: p.text, ...parsePage(p.text), status: p.status };
    })
  );
  pages.push(...extraPages);

  const errs = pages.filter((p) => p.status === 0);
  const okPages = pages.filter((p) => p.status > 0 && p.status < 400);

  // ---------- 1. URL en vercel.app ----------
  const onVercel = /\.vercel\.app$/i.test(BASE);
  F(1, 'URL en vercel.app',
    onVercel ? 'fail' : 'ok',
    'confirmed',
    onVercel
      ? `El dominio "${new URL(BASE).hostname}" es de Vercel: denota proyecto de pruebas y dificulta SEO y confianza.`
      : `Dominio propio o ajeno a Vercel: ${new URL(BASE).hostname}.`,
    'Añade dominio custom en Vercel (Settings → Domains, DNS CNAME a cname.vercel-dns.com), redirige el .vercel.app (301/308) y usa ese dominio en canonical y metadata.');

  // ---------- 2. View-source vacío ----------
  const emptyPages = okPages.filter((p) => !p.hasContent || p.text.length < 100);
  F(2, 'View-source vacío (SPA sin prerender)',
    emptyPages.length ? 'fail' : 'ok',
    emptyPages.length ? 'confirmed' : 'confirmed',
    emptyPages.length
      ? `${emptyPages.length} página(s) sin contenido real en el HTML servido: ${emptyPages.map((p) => p.url).join(', ')} (los buscadores y agentes IA ven una página en blanco).`
      : `HTML servido con contenido real en ${okPages.length} página(s).`,
    'Prerender con vite-plugin-prerender o react-snap, o migra a SSR/SSG (pregunta antes de migrar).',);

  // ---------- 3. Página 404 ----------
  F(3, 'Página de 404',
    notFoundR.status === 404 ? 'ok' : notFoundR.status === 200 ? 'fail' : 'warn',
    notFoundR.status === 200 ? 'confirmed' : 'probable',
    notFoundR.status === 0
      ? `No se pudo comprobar (${notFoundR.error}): revisa manualmente una ruta inexistente.`
      : notFoundR.status === 404
        ? `HTTP 404 correcto en ruta inexistente.`
        : `HTTP ${notFoundR.status} en ruta inexistente (se espera el contenido del 404 o una redirección).`,
    'Crea una página 404 (ruta "*" en React Router, ver templates/NotFound.tsx) y devuelve HTTP 404 real (templates/vercel.json).');

  // ---------- 4. Framework (informativo) ----------
  const detected = [
    /<script[^>]+src=["'][^"']*\/assets\//i.test(html0) || /vite[\s\S]*?(client|plugin)/i.test(html0) ? 'Vite' : '',
    /react/i.test(html0) ? (pages.length > 1 ? '' : '') || 'React' : '',
    /__next|next\/|_next\//i.test(html0) && 'Next.js',
    /nuxt/i.test(html0) && 'Nuxt',
    /svelte/i.test(html0) && 'Svelte',
    /astro/i.test(html0) && 'Astro',
    /remix/i.test(html0) && 'Remix',
  ].filter(Boolean);
  F(4, 'Vite + React para todo (evaluar arquitectura)',
    'warn', 'informational',
    detected.length
      ? `Stack detectado: ${detected.join(' + ')}. Informativo: evalúa si todo el contenido necesita JavaScript.`
      : 'Stack no identificable desde el HTML (informativo).',
    'Reserva React solo para lo interactivo; prerender para lo informativo. Si el sitio es puramente informativo, plantea la migración antes de tocar código.');

  // ---------- 5. Mismo título / sin título ----------
  const noTitle = okPages.filter((p) => !p.title);
  const titles = [...new Set(okPages.map((p) => p.title).filter(Boolean))];
  F(5, 'Mismo <title> en todas las páginas',
    noTitle.length ? 'fail' : titles.length > 1 ? 'ok' : 'warn',
    noTitle.length ? 'confirmed' : titles.length <= 1 ? 'probable' : 'confirmed',
    noTitle.length
      ? `Página(s) sin <title>: ${noTitle.map((p) => p.url).join(', ')}`
      : titles.length === 1
        ? `Con ${okPages.length} página(s) analizada(s) solo hay un título — "${titles[0]}" — ${okPages.length > 1 ? '(repetido en todas: sospechoso)' : '(no se puede comparar con una sola página)'}.`
        : `Títulos únicos en las ${okPages.length} página(s) analizada(s).`,
    'Título único por página (50-60 chars, fórmula "Nombre de página | Marca") con templates/Seo.tsx (react-helmet-async) o prerender.');

  // ---------- 6. Meta description ----------
  const noDesc = okPages.filter((p) => !p.metaDesc);
  F(6, 'Meta description',
    noDesc.length ? 'fail' : 'ok',
    noDesc.length ? 'confirmed' : 'confirmed',
    noDesc.length
      ? `Sin description en: ${noDesc.map((p) => p.url).join(', ')}`
      : 'Description presente en todas las páginas analizadas.',
    'Description única por página (150-160 chars, propuesta de valor + llamada a la acción). Ver templates/Seo.tsx.');

  // ---------- 7. Open Graph ----------
  const noOg = okPages.filter((p) => !p.ogImage);
  F(7, 'Open Graph / OG image',
    noOg.length ? 'fail' : 'ok',
    noOg.length ? 'confirmed' : 'confirmed',
    noOg.length
      ? `Sin og:image en: ${noOg.map((p) => p.url).join(', ')}`
      : 'og:image presente en todas las páginas analizadas.',
    'og:title/description/image (1200x630, URL absoluta y que devuelva 200) + og:image:width/height, og:url, og:type, og:site_name y twitter:card=summary_large_image. Ver templates/Seo.tsx.');

  // tareas asíncronas de verificación de assets (og:image, sitemap, bundle, sourcemaps)
  const ogImg = okPages.map((p) => p.ogImage).find(Boolean);
  const ogStatus = ogImg ? await get(absUrl(ogImg), { head: true }) : null;
  if (noOg.length === 0 && ogImg) {
    const ogAfter = findings.find((f) => f.id === 7);
    if (ogStatus && ogStatus.status !== 200 && ogStatus.status !== 0) {
      ogAfter.status = 'warn';
      ogAfter.confidence = 'confirmed';
      ogAfter.detail += ` La imagen referenciada devuelve HTTP ${ogStatus.status}.`;
    } else if (ogStatus && ogStatus.status === 0) {
      ogAfter.detail += ` No se pudo verificar la imagen (${ogStatus.error}).`;
    }
    const noTw = okPages.filter((p) => !p.twitterCard);
    if (noTw.length) ogAfter.detail += ` Sin twitter:card en ${noTw.length} página(s).`;
    if (ogAfter.status === 'ok' && noTw.length) { ogAfter.status = 'warn'; ogAfter.confidence = 'probable'; }
  }

  // ---------- 8. Datos estructurados ----------
  const noLd = okPages.filter((p) => !p.ldjson);
  F(8, 'Datos estructurados (JSON-LD)',
    noLd.length ? 'fail' : 'ok',
    noLd.length ? 'confirmed' : 'confirmed',
    noLd.length
      ? `Sin application/ld+json en: ${noLd.map((p) => p.url).join(', ')}`
      : 'JSON-LD presente.',
    'WebSite + Organization (globales); Article, BreadcrumbList, FAQPage, Product/Service por página. Valida en validator.schema.org. Ver templates/Seo.tsx.');

  // ---------- 9. H1 ----------
  const badH1 = okPages.filter((p) => p.h1 !== 1);
  F(9, 'Varios <h1> o ninguno',
    badH1.length ? 'fail' : 'ok',
    badH1.length ? 'confirmed' : 'confirmed',
    badH1.length
      ? badH1.map((p) => `${p.h1} <h1> en ${p.url}`).join(' · ')
      : 'Una sola <h1> por página.',
    'Exactamente un <h1> por página y jerarquía h1 > h2 > h3 sin saltos (el tamaño visual se controla con clases, no con más h1).');

  // ---------- 10. Canonical ----------
  const noCanon = okPages.filter((p) => !p.canonical);
  F(10, 'Tag canónico',
    noCanon.length ? 'fail' : 'ok',
    noCanon.length ? 'confirmed' : 'confirmed',
    noCanon.length
      ? `Sin canonical en: ${noCanon.map((p) => p.url).join(', ')}`
      : 'Canonical presente en todas las páginas analizadas.',
    '<link rel="canonical"> con la URL absoluta canónica por página, coherente con la convención de www y slash final de todo el sitio. Ver templates/Seo.tsx.');

  // ---------- 11. llms.txt ----------
  F(11, 'llms.txt',
    llmsR.status === 200 && llmsR.text.trim().length > 50 ? 'ok' : 'fail',
    llmsR.status === 200 ? 'confirmed' : 'confirmed',
    llmsR.status === 200
      ? `Presente (${llmsR.text.trim().length} caracteres).`
      : `HTTP ${llmsR.status || llmsR.error} en /llms.txt (los agentes IA no tienen índice oficial del sitio).`,
    'Crea llms.txt en la raíz (templates/llms.txt, estándar llmstxt.org): resumen honesto, secciones y puntos clave.');

  // ---------- 12. robots.txt ----------
  let robotsInfo = '', robotsStatus = 'ok';
  if (robotsR.status !== 200) {
    robotsStatus = 'fail';
    robotsInfo = `HTTP ${robotsR.status || robotsR.error} en /robots.txt.`;
  } else {
    const body = robotsR.text;
    const blockedBots = AI_BOTS.filter((b) => {
      const idx = body.toLowerCase().indexOf(new RegExp(`user-agent:\\s*([^\\n]*?${b})`, 'i').exec(body.toLowerCase()) ? body.toLowerCase().search(new RegExp(`user-agent:\\s*[^\\n]*${b}`, 'i')) : -1);
      if (idx === -1) return false;
      const seg = body.slice(idx).split(/\n\s*\n|(?=\n\s*user-agent:)/i)[0] || '';
      return /disallow:\s*(\/)/i.test(seg);
    });
    const globalBlock = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s/i.test(body);
    if (globalBlock) {
      robotsStatus = 'fail';
      robotsInfo = 'Disallow: / para el agente comodín: bloquea buscadores e IA.';
    } else if (blockedBots.length) {
      robotsStatus = 'fail';
      robotsInfo = `IA bloqueada: ${blockedBots.join(', ')}.`;
    } else if (!body.match(/user-agent:/i)) {
      robotsStatus = 'fail';
      robotsInfo = 'robots.txt existe pero no tiene reglas User-agent.';
    } else {
      robotsInfo = 'robots.txt no bloquea buscadores ni IA.';
      if (!/sitemap:/i.test(body)) robotsInfo += ' No referencia el sitemap (señal 14).';
    }
  }
  F(12, 'robots.txt bloqueando la IA',
    robotsStatus, robotsR.status === 200 ? 'confirmed' : 'confirmed',
    robotsInfo,
    'Bloquea solo lo privado (/admin/, /api/); permite buscadores e IA; añade Sitemap. Template seguro: templates/robots.txt.');

  // ---------- 13. Favicon ----------
  const iconLink = /rel=["'](?:shortcut )?icon["']/i.test(html0);
  const appleTouch = /rel=["']apple-touch-icon["']/i.test(html0);
  const favOk = (favR.status !== 404 && favR.status !== 0) || iconLink;
  F(13, 'Favicon',
    favOk ? 'ok' : 'fail',
    favOk ? 'confirmed' : 'confirmed',
    `${iconLink ? 'link rel=icon presente' : 'sin link rel="icon"'} · /favicon.ico → ${favR.status ? `HTTP ${favR.status}` : favR.error || 'n/a'}${appleTouch ? ' · apple-touch-icon presente' : ' · falta apple-touch-icon (iOS)'}.`,
    'Crea public/favicon.ico (32x32), favicon.svg y apple-touch-icon.png (180x180), y decláralos con <link rel="icon"> en el head.');

  // ---------- 14. Sitemap ----------
  const sitemapOk = sitemapR.status === 200 && /<loc>/i.test(sitemapR.text);
  let sitemapDetail = '';
  if (sitemapOk) {
    const locs = (sitemapR.text.match(/<loc[^>]*>([^<]+)<\/loc>/gi) || [])
      .map((l) => l.replace(/<\/?loc[^>]*>/gi, '').trim()).slice(0, 3);
    const statuses = await Promise.all(locs.map((l) => get(absUrl(l), { head: true })));
    const rotas = statuses.map((s, i) => `${s.status === 200 ? '200' : s.status || s.error}: ${locs[i].slice(0, 70)}`);
    sitemapDetail = `Presente con ${(sitemapR.text.match(/<loc>/g) || []).length} URL(s). Muestra: ${rotas.join(' | ')}`;
  } else {
    sitemapDetail = `HTTP ${sitemapR.status || sitemapR.error} en /sitemap.xml.`;
  }
  F(14, 'sitemap.xml',
    sitemapOk ? 'ok' : 'fail',
    sitemapOk ? 'confirmed' : 'confirmed',
    sitemapDetail,
    'Genera sitemap.xml desde las rutas reales (templates/sitemap-gen.mjs o el mapa de URLs de Firecrawl) y referéncialo en robots.txt.');

  // ---------- 15. Atributo de idioma ----------
  const noLang = okPages.filter((p) => !p.lang);
  F(15, 'Atributo de idioma (lang)',
    noLang.length ? 'fail' : 'ok',
    noLang.length ? 'confirmed' : 'confirmed',
    noLang.length
      ? `Sin lang en: ${noLang.map((p) => p.url).join(', ')}`
      : 'lang presente en todas las páginas analizadas.',
    '<html lang="es"> (o el idioma real); añade hreflang si el sitio es multi-idioma.');

  // ---------- 16. Alt en imágenes ----------
  const allImgs = okPages.flatMap((p) => p.imgs.map((i) => ({ ...i, page: p.url })));
  const noAltImgs = allImgs.filter((i) => i.src && i.noAlt);
  const unsized = allImgs.filter((i) => i.src && (!i.lazy || !i.sized));
  F(16, 'Texto alternativo (alt)',
    noAltImgs.length ? 'fail' : allImgs.length ? 'ok' : 'warn',
    noAltImgs.length ? 'confirmed' : 'probable',
    noAltImgs.length
      ? `${noAltImgs.length} de ${allImgs.length} img sin alt (ej. ${noAltImgs[0].page})${unsized.length ? `; ${unsized.length} sin loading="lazy" o width/height` : ''}.`
      : allImgs.length
        ? `${allImgs.length} img analizadas con alt ${unsized.length ? `; ${unsized.length} sin loading="lazy" o width/height (CLS)` : '(todas con lazy y dimensiones)'}.`
        : 'No se detectaron imágenes en el HTML (si ves imágenes al navegar, revisa manualmente).',
    'alt descriptivo en imágenes informativas; alt="" en decorativas; loading="lazy", width y height en todas.');

  // ---------- 17. Sourcemaps expuestos ----------
  const scripts = [...new Set(okPages.flatMap((p) => p.scripts))].slice(0, 3);
  let mapResult = 'Sin scripts .js en el HTML';
  let mapOk = true, mapConf = 'informational';
  if (scripts.length) {
    const maps = await Promise.all(scripts.map((s) => get(`${absUrl(s)}.map`, { head: true })));
    const exposed = maps.filter((m) => m.status === 200);
    if (exposed.length) {
      mapOk = false; mapConf = 'confirmed';
      mapResult = `Sourcemap(s) expuestos: ${maps.map((m, i) => (m.status === 200 ? `${scripts[i].slice(0, 50)}.map → HTTP 200` : '')).filter(Boolean).join(', ')}`;
    } else {
      mapConf = 'confirmed';
      mapResult = `Sourcemaps no accesibles (${scripts.length} script(s) probados, todos bajo control).`;
    }
  }
  F(17, 'Sourcemaps expuestos',
    mapOk ? 'ok' : 'fail', mapConf, mapResult,
    'build.sourcemap: false en producción (nunca "inline" ni true) y purga caché Vercel para eliminar los .map ya publicados. Ver templates/vite.config.ts.');

  // ---------- 18. Errores de consola (manual) ----------
  F(18, 'Errores de consola',
    'warn', 'informational',
    'No comprobable por HTTP: abre DevTools, recorre todas las rutas y captura los errores rojos (o pide al usuario que lo haga).',
    'Corrige por severidad: assets 404 y rutas rotas, keys de React, errores de dependencias (npm audit). Verifica recorriendo TODAS las rutas.');

  // ---------- 19. Bundle JS ----------
  let bundleInfo = 'No se pudieron evaluar scripts';
  let bundleStatus = 'warn', bundleConf = 'informational';
  if (scripts.length) {
    const sizes = await Promise.all(scripts.map((s) => get(absUrl(s))));
    const raw = sizes.reduce((a, s) => a + s.sizeRaw, 0);
    const comp = sizes.reduce((a, s) => a + (s.sizeCompressed || s.sizeRaw), 0);
    const kb = Math.round(comp / 1024);
    const kbRaw = Math.round(raw / 1024);
    bundleInfo = `${kb} KB (${kbRaw} KB sin comprimir) en ${scripts.length} script(s)${comp < raw ? ' · medido con gzip' : ''}`;
    if (kb > 500) { bundleStatus = 'fail'; bundleConf = 'probable'; }
    else if (kb > 170) { bundleStatus = 'warn'; bundleConf = 'probable'; }
    else { bundleStatus = 'ok'; bundleConf = 'confirmed'; }
  }
  F(19, 'Bundle JS gigante',
    bundleStatus, bundleConf, bundleInfo,
    'React.lazy() + Suspense por ruta, elimina dependencias pesadas (moment→date-fns, lodash→imports concretos), manualChunks para vendors. Objetivo: < 170 KB gzip inicial. Ver templates/vite.config.ts.');

  // ---------- 20. Imágenes optimizadas ----------
  const bigImgs = [];
  const srcs = [...new Set(allImgs.map((i) => i.src).filter((s) => /^https?:/.test(s) || s.startsWith('/')))].slice(0, 6);
  const heads = await Promise.all(srcs.map((s) => get(absUrl(s), { head: true })));
  heads.forEach((h, i) => {
    if (h.sizeCompressed && h.sizeCompressed > 300 * 1024) bigImgs.push(`${srcs[i].slice(0, 55)}… (${Math.round(h.sizeCompressed / 1024)} KB, HTTP ${h.status})`);
  });
  const imgsNOK = bigImgs.length || unsized.length;
  F(20, 'Imágenes optimizadas y lazy loading',
    imgsNOK ? 'warn' : allImgs.length ? 'ok' : 'warn',
    imgsNOK ? 'probable' : 'informational',
    (bigImgs.length ? `Imágenes pesadas (>300 KB): ${bigImgs.join('; ')}. ` : '') +
      (unsized.length ? `${unsized.length} img sin loading="lazy" o dimensiones declaradas. ` : '') +
      (allImgs.length ? `${allImgs.length} img analizadas en total.` : 'Sin imágenes en HTML.'),
    'WebP/AVIF en el build (ej. vite-plugin-imagemin), loading="lazy" bajo el fold, srcset/sizes y width/height siempre (target: Lighthouse sin warnings).');

  // ---------- Reporte ----------
  const summary = {
    ok: findings.filter((f) => f.status === 'ok').length,
    warn: findings.filter((f) => f.status === 'warn').length,
    fail: findings.filter((f) => f.status === 'fail').length,
  };
  const date = new Date().toISOString();
  const data = { url: BASE, date, pages: pages.map((p) => p.url), findings, summary };

  const icon = { ok: '✅', warn: '⚠️', fail: '❌' };
  const md = [];
  md.push(`# Auditoría VIBECODE REHAB — ${BASE}`);
  md.push(`Fecha: ${date.slice(0, 19)} · Páginas analizadas: ${pages.length}`);
  md.push(`## Resumen: ${summary.ok} ✅ · ${summary.warn} ⚠️ · ${summary.fail} ❌`);
  if (errs.length) md.push(`\n> ⚠️ No se pudo alcanzar: ${errs.map((p) => p.url).join(', ')}`);
  md.push('');
  md.push('| # | Señal | Estado | Confianza | Detalle | Corrección (resumen) |');
  md.push('|---|-------|--------|-----------|---------|----------------------|');
  for (const f of findings) {
    const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md.push(`| ${f.id} | ${f.name} | ${icon[f.status]} | ${CONF_LABEL[f.confidence] || f.confidence} | ${esc(f.detail).slice(0, 220)} | ${esc(f.fix).slice(0, 140)} |`);
  }
  md.push('');
  md.push('## Siguiente paso');
  md.push('Pega SKILL.md de este repo (junto con esta URL) en tu agente IA para que aplique las correcciones en orden 1→20, verificando cada una antes de pasar a la siguiente.');
  const reportMd = md.join('\n') + '\n';

  if (outFile) {
    const { writeFileSync } = await import('node:fs');
    if (outFile.toLowerCase().endsWith('.json') || asJson || !outFile.toLowerCase().endsWith('.md')) {
      writeFileSync(outFile, JSON.stringify(data, null, 2) + '\n');
    } else {
      writeFileSync(outFile, reportMd);
    }
    console.log(`Reporte guardado en ${outFile}`);
  } else if (asJson) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  } else {
    process.stdout.write(reportMd);
  }

  if (strict && summary.fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Error en la auditoría:', e);
  process.exit(1);
});