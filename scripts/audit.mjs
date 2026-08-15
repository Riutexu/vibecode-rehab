#!/usr/bin/env node
/**
 * VIBECODE REHAB — Auditor de las 20 señales de un sitio vibecodeado.
 * Cero dependencias, Node 18+ (usa fetch global).
 *
 * Uso:
 *   node audit.mjs https://sitio.vercel.app              # reporte markdown
 *   node audit.mjs https://sitio.vercel.app --json       # reporte JSON
 *   node audit.mjs https://sitio.vercel.app https://sitio.vercel.app/precios   # varias páginas
 *
 * Si solo pasas la raíz y existe sitemap.xml, se auto-analizan hasta 3 URLs más.
 */

const args = process.argv.slice(2);
const urls = args.filter((a) => /^https?:\/\//i.test(a));
const asJson = args.includes('--json');

if (urls.length === 0) {
  console.error('Uso: node audit.mjs <url> [url2 ...] [--json]');
  process.exit(1);
}

const BASE = urls[0].replace(/\/+$/, '');
const UA = 'VibecodeRehabAudit/1.0';
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

async function get(u) {
  try {
    const res = await fetch(u, {
      headers: { 'user-agent': UA, accept: '*/*', 'accept-encoding': 'gzip' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
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

async function head(u) {
  try {
    const res = await fetch(u, {
      method: 'HEAD',
      headers: { 'user-agent': UA, accept: '*/*', 'accept-encoding': 'gzip' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const len = res.headers.get('content-length');
    return { status: res.status, size: len ? parseInt(len, 10) : null };
  } catch (e) {
    return { status: 0, size: null };
  }
}

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function parsePage(html) {
  const imgs = (html.match(/<img[\s\S]*?>/gi) || []).map((tag) => {
    const src = extract(tag, /src=["']([^"']+)["']/i) || '';
    const noAlt = !/alt=(["'])/i.test(tag);
    const attr = (n) => new RegExp(`${n}=(["'])([^"']*)\\1`, 'i').test(tag);
    return { src, noAlt, lazy: attr('loading'), sized: attr('width') && attr('height') };
  });
  return {
    title: extract(html, /<title[^>]*>([^<]*)<\/title>/i),
    metaDesc: /<meta[^>]+name=["']description["']/i.test(html),
    ogImage: /<meta[^>]+property=["']og:image["']/i.test(html),
    ogTags: (html.match(/<meta[^>]+property=["']og:(title|description|url|type|site_name)["']/gi) || []).length,
    ldjson: /application\/ld\+json/i.test(html),
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    lang: /<html[^>]*\blang=["'][a-zA-Z]{2,3}(?:-[a-zA-Z]{2,3})?["']/i.test(html),
    imgs,
    hasContent: /<h[1-6][\s>]|<\/(?:p|article|section|main|li|nav|h[1-6])>/i.test(html),
  };
}

async function main() {
  // ---- Páginas a analizar (raíz + opcionales + auto-extension por sitemap) ----
  const rootPage = await get(BASE);
  pages.push({ url: BASE, text: rootPage.text, ...parsePage(rootPage.text), status: rootPage.status });

  if (urls.length === 1 && rootPage.text && /<urlset/i.test(rootPage.text)) {
    const locs = (rootPage.text.match(/<loc[^>]*>([^<]+)<\/loc>/gi) || [])
      .map((l) => l.replace(/<\/?loc[^>]*>/gi, '').trim())
      .filter((l) => l && l !== BASE + '/' && !/\.(png|jpg|jpeg|webp|gif|svg|pdf|ico)$/i.test(l))
      .slice(0, 3);
    for (const loc of locs) {
      const p = await get(loc);
      pages.push({ url: loc, text: p.text, ...parsePage(p.text), status: p.status });
    }
  } else {
    for (const u of urls.slice(1)) {
      const p = await get(u);
      pages.push({ url: u, text: p.text, ...parsePage(p.text), status: p.status });
    }
  }

  const errs = pages.filter((p) => p.status === 0);
  const okPages = pages.filter((p) => p.status > 0 && p.status < 400);
  const html0 = rootPage.text;

  // ---------- 1. URL en vercel.app ----------
  F(1, 'URL en vercel.app',
    /\.vercel\.app$/i.test(BASE) ? 'fail' : 'ok',
    'confirmed',
    /\.vercel\.app$/i.test(BASE) ? `El dominio "${new URL(BASE).hostname}" es de Vercel.` : `Dominio propio o de otra plataforma: ${new URL(BASE).hostname}.`,
    'Añade un dominio custom en Vercel (Settings > Domains) y usa URLs canonical con ese dominio.');

  // ---------- 2. View-source vacío ----------
  const emptyPages = okPages.filter((p) => !p.hasContent || p.text.length < 100);
  F(2, 'View-source vacío (SPA sin prerender)',
    emptyPages.length ? 'fail' : 'ok',
    emptyPages.length ? 'confirmed' : 'confirmed',
    emptyPages.length
      ? `${emptyPages.length} página(s) sin contenido real en el HTML servido: ${emptyPages.map((p) => p.url).join(', ')}`
      : `HTML servido con contenido real en ${okPages.length} página(s).`,
    'Prerender con vite-plugin-prerender / react-snap, o migra a un framework SSR/SSG (pregunta antes de migrar).');

  // ---------- 3. Página 404 ----------
  const missing = await get(`${BASE}/__vibecode_rehab_404_check_xyz`);
  F(3, 'Página de 404',
    missing.status === 404 ? 'ok' : missing.status === 200 ? 'fail' : 'warn',
    missing.status === 200 ? 'confirmed' : 'probable',
    missing.status === 0
      ? `No se pudo comprobar (${missing.error}): revisa manualmente una ruta inexistente.`
      : missing.status === 404
        ? `HTTP ${missing.status} en ruta inexistente.`
        : `HTTP ${missing.status} en ruta inexistente (se espera el contenido del 404 o una redirección).`,
    'Crea una página 404 (ruta "*" en React Router) y devuelve HTTP 404 real (ver vercel.json del template).');

  // ---------- 4. Framework (informativo) ----------
  const stack =
    /<script[^>]+src=["'][^"']*\/assets\//i.test(html0) || /vite[\s\S]*?(client|plugin)/i.test(html0) ? 'Vite' : '';
  const detected = [
    stack && stack,
    /react/i.test(html0) && 'React',
    /__next|next\/|_next\//i.test(html0) && 'Next.js',
    /nuxt/i.test(html0) && 'Nuxt',
    /svelte/i.test(html0) && 'Svelte',
    /astro/i.test(html0) && 'Astro',
    /remix/i.test(html0) && 'Remix',
  ].filter(Boolean);
  F(4, 'Vite + React para todo (evaluar arquitectura)',
    'warn', 'informational',
    detected.length ? `Stack detectado: ${detected.join(' + ')}.` : 'Stack no identificable desde el HTML (informativo).',
    'Reserva React solo para lo interactivo; prerender para lo informativo. Decide con el dueño si migra.');

  // ---------- 5. Mismo título / sin título ----------
  const noTitle = okPages.filter((p) => !p.title);
  const titles = [...new Set(okPages.map((p) => p.title).filter(Boolean))];
  F(5, 'Mismo <title> en todas las páginas',
    noTitle.length ? 'fail' : titles.length > 1 ? 'ok' : 'warn',
    noTitle.length ? 'confirmed' : titles.length <= 1 ? 'probable' : 'confirmed',
    noTitle.length
      ? `Página(s) sin <title>: ${noTitle.map((p) => p.url).join(', ')}`
      : titles.length === 1
        ? `Con ${okPages.length} página(s) analizada(s) solo hay un título: "${titles[0]}" ${okPages.length > 1 ? '(sospechoso de repetición)' : '(no se puede comparar con una sola página)'}.`
        : `Títulos únicos en las ${okPages.length} páginas analizadas.`,
    'Título único por página (50-60 chars) con react-helmet-async o prerender.',);

  // ---------- 6. Meta description ----------
  const noDesc = okPages.filter((p) => !p.metaDesc);
  F(6, 'Meta description',
    noDesc.length ? 'fail' : 'ok',
    noDesc.length ? 'confirmed' : 'confirmed',
    noDesc.length
      ? `Sin description en: ${noDesc.map((p) => p.url).join(', ')}`
      : 'Description presente en todas las páginas analizadas.',
    'Meta description única por página (150-160 chars).');

  // ---------- 7. Open Graph ----------
  const noOg = okPages.filter((p) => !p.ogImage);
  F(7, 'Open Graph / OG image',
    noOg.length ? 'fail' : 'ok',
    noOg.length ? 'confirmed' : 'confirmed',
    noOg.length
      ? `Sin og:image en: ${noOg.map((p) => p.url).join(', ')}`
      : 'og:image presente en todas las páginas analizadas.',
    'og:title/description/image (1200x630, URL absoluta) + twitter:card=summary_large_image.');

  // ---------- 8. Datos estructurados ----------
  const noLd = okPages.filter((p) => !p.ldjson);
  F(8, 'Datos estructurados (JSON-LD)',
    noLd.length ? 'fail' : 'ok',
    noLd.length ? 'confirmed' : 'confirmed',
    noLd.length
      ? `Sin application/ld+json en: ${noLd.map((p) => p.url).join(', ')}`
      : 'JSON-LD presente.',
    'Añade WebSite + Organization (globales) y Article/BreadcrumbList/FAQPage por página. Valida en schema.org/validator.');

  // ---------- 9. H1 ----------
  const badH1 = okPages.filter((p) => p.h1 !== 1);
  F(9, 'Varios <h1> o ninguno',
    badH1.length ? 'fail' : 'ok',
    badH1.length ? 'confirmed' : 'confirmed',
    badH1.length
      ? badH1.map((p) => `${p.url} → ${p.h1} h1`).join('; ')
      : 'Una sola <h1> por página.',
    'Exactamente un <h1> por página y jerarquía h1>h2>h3 sin saltos.');

  // ---------- 10. Canonical ----------
  const noCanon = okPages.filter((p) => !p.canonical);
  F(10, 'Tag canónico',
    noCanon.length ? 'fail' : 'ok',
    noCanon.length ? 'confirmed' : 'confirmed',
    noCanon.length
      ? `Sin canonical en: ${noCanon.map((p) => p.url).join(', ')}`
      : 'Canonical presente.',
    '<link rel="canonical"> con la URL absoluta canónica por página.');

  // ---------- 11. llms.txt ----------
  const llms = await get(`${BASE}/llms.txt`);
  F(11, 'llms.txt',
    llms.status === 200 && llms.text.trim().length > 50 ? 'ok' : 'fail',
    'confirmed',
    llms.status === 200 ? `Presente (${llms.text.trim().length} chars).` : `HTTP ${llms.status || llms.error} en /llms.txt.`,
    'Crea llms.txt en la raíz (ver templates/llms.txt; estándar llmstxt.org).');

  // ---------- 12. robots.txt ----------
  const robots = await get(`${BASE}/robots.txt`);
  let robotsInfo = '';
  let robotsOk = true;
  if (robots.status !== 200) {
    robotsOk = false;
    robotsInfo = `HTTP ${robots.status || robots.error} en /robots.txt.`;
  } else {
    const body = robots.text;
    const blockedBots = AI_BOTS.filter((b) => {
      const m = body.match(new RegExp(`user-agent:\\s*([^\\n]*?${b}[^\\n]*)`, 'ig'));
      if (!m) return false;
      const seg = body.slice(body.toLowerCase().indexOf(m[0].toLowerCase()), body.length).split(/\n\s*\n|user-agent:/i)[0] || '';
      return /disallow:\s*(\/)/i.test(seg);
    });
    if (!body.match(/user-agent:/i)) { robotsOk = false; robotsInfo = 'robots.txt existe pero no tiene reglas User-agent.'; }
    else if (blockedBots.length) { robotsOk = false; robotsInfo = `IA bloqueada: ${blockedBots.join(', ')}.`; }
    else {
      robotsInfo = 'robots.txt no bloquea buscadores ni IA.';
      if (!/sitemap:/i.test(body)) robotsInfo += ' No referencia sitemap (ver señal 14).';
    }
  }
  F(12, 'robots.txt bloqueando IA',
    robotsOk ? 'ok' : 'fail',
    robots.status === 200 ? 'confirmed' : 'confirmed',
    robotsInfo,
    'Permite GPTBot/ClaudeBot/Google-Extended/PerplexityBot y añade Sitemap (ver templates/robots.txt).');

  // ---------- 13. Favicon ----------
  const fav = await head(`${BASE}/favicon.ico`);
  const iconLink = /rel=["'](?:shortcut )?icon["']/i.test(html0);
  const favOk = fav.status !== 404 && fav.status !== 0 || iconLink;
  F(13, 'Favicon',
    favOk ? 'ok' : 'fail',
    favOk ? 'confirmed' : 'confirmed',
    `${iconLink ? 'link rel=icon presente' : 'sin link rel=icon'} · /favicon.ico → ${fav.status ? `HTTP ${fav.status}` : fav.error || 'n/a'}.`,
    'Crea favicon.ico/SVG + apple-touch-icon (180x180) en /public.');

  // ---------- 14. Sitemap ----------
  const sitemap = await get(`${BASE}/sitemap.xml`);
  const sitemapOk = sitemap.status === 200 && /<loc>/i.test(sitemap.text);
  F(14, 'sitemap.xml',
    sitemapOk ? 'ok' : 'fail',
    sitemapOk ? 'confirmed' : 'confirmed',
    sitemapOk ? `Presente con ${(sitemap.text.match(/<loc>/g) || []).length} URL(s).` : `HTTP ${sitemap.status || sitemap.error} en /sitemap.xml.`,
    'Genera sitemap.xml desde las rutas reales (ver templates/sitemap-gen.mjs) y referéncialo en robots.txt.');

  // ---------- 15. Atributo de idioma ----------
  const noLang = okPages.filter((p) => !p.lang);
  F(15, 'Atributo de idioma (lang)',
    noLang.length ? 'fail' : 'ok',
    noLang.length ? 'confirmed' : 'confirmed',
    noLang.length
      ? `Sin lang en: ${noLang.map((p) => p.url).join(', ')}`
      : 'lang presente.',
    '<html lang="es"> (o el idioma real); hreflang si es multi-idioma.');

  // ---------- 16. Alt en imágenes ----------
  const allImgs = okPages.flatMap((p) => p.imgs.map((i) => ({ ...i, page: p.url })));
  const noAltImgs = allImgs.filter((i) => i.src && i.noAlt);
  const unsized = allImgs.filter((i) => i.src && !i.lazy || i.src && !i.sized);
  F(16, 'Texto alternativo (alt)',
    noAltImgs.length ? 'fail' : allImgs.length ? 'ok' : 'warn',
    noAltImgs.length ? 'confirmed' : 'probable',
    noAltImgs.length
      ? `${noAltImgs.length} img sin alt (ej. ${noAltImgs[0].page})${unsized.length ? `; ${unsized.length} sin loading/dimensiones` : ''}.`
      : allImgs.length
        ? `${allImgs.length} img con alt en las páginas analizadas${unsized.length ? `; ${unsized.length} sin loading/lazy o width/height` : '.'}`
        : 'No se detectaron imágenes en el HTML (si las ves al navegar, revisa manualmente).',
    'alt descriptivo (o alt="" decorativas), loading="lazy", width/height.');

  // ---------- 17. Sourcemaps expuestos ----------
  const script = extract(html0, /<script[^>]+src=["']([^"']+\.js[^"']*)["']/i);
  let mapResult = 'Sin scripts detectados en el HTML';
  let mapOk = true;
  let mapInfo = 'informational';
  if (script) {
    const abs = /^https?:/.test(script) ? script : new URL(script, BASE).href;
    const map = await get(`${abs}.map`);
    if (map.status === 200) { mapOk = false; mapResult = `sourcemap expuesto: ${abs}.map (HTTP 200)`.slice(0, 160); mapInfo = 'confirmed'; }
    else { mapResult = `sourcemap no accesible (HTTP ${map.status || 'n/a'})`; mapInfo = 'confirmed'; }
  }
  F(17, 'Sourcemaps expuestos',
    mapOk ? 'ok' : 'fail', mapInfo,
    mapResult,
    'build.sourcemap: false en producción y purga los .map ya desplegados.');

  // ---------- 18. Errores de consola (manual) ----------
  F(18, 'Errores de consola',
    'warn', 'informational',
    'No comprobable por HTTP: abre DevTools, recorre todas las rutas y captura los errores (o pide al usuario que lo haga).',
    'Corrige errores JS, keys de React, assets 404 y dependencias obsoletas.');

  // ---------- 19. Bundle JS ----------
  let bundleInfo = 'No se pudo evaluar (sin scripts)';
  let bundleStatus = 'warn';
  let bundleConf = 'informational';
  if (script) {
    const abs = /^https?:/.test(script) ? script : new URL(script, BASE).href;
    const js = await get(abs);
    const size = js.sizeCompressed || js.sizeRaw;
    const kb = Math.round(size / 1024);
    bundleInfo = `${kb} KB (${script.slice(0, 60)}...)`;
    if (kb > 500) { bundleStatus = 'fail'; bundleConf = 'probable'; }
    else if (kb > 170) { bundleStatus = 'warn'; bundleConf = 'probable'; }
    else { bundleStatus = 'ok'; bundleConf = 'confirmed'; }
    if (js.sizeCompressed) bundleInfo += ` · ${kb} KB con gzip`;
  }
  F(19, 'Bundle JS gigante',
    bundleStatus, bundleConf, bundleInfo,
    'React.lazy() + Suspense por ruta, elimina dependencias pesadas. Objetivo: <170 KB gzip inicial.');

  // ---------- 20. Imágenes optimizadas ----------
  const bigImgs = [];
  const srcs = [...new Set(allImgs.map((i) => i.src).filter((s) => /^https?:/.test(s) || s.startsWith('/')))].slice(0, 6);
  for (const s of srcs) {
    const h = await head(/^https?:/.test(s) ? s : new URL(s, BASE).href);
    if (h.size && h.size > 300 * 1024) bigImgs.push(`${s.slice(0, 60)}… (${Math.round(h.size / 1024)} KB)`);
  }
  const imgsNOK = bigImgs.length || unsized.length;
  F(20, 'Imágenes optimizadas y lazy loading',
    imgsNOK ? 'warn' : allImgs.length ? 'ok' : 'warn',
    imgsNOK ? 'probable' : 'informational',
    (bigImgs.length ? `Imágenes pesadas: ${bigImgs.join('; ')}. ` : '') +
      (unsized.length ? `${unsized.length} img sin loading/lazy o dimensiones declaradas. ` : '') +
      (allImgs.length ? `${allImgs.length} img analizadas.` : 'Sin imágenes en HTML.'),
    'WebP/AVIF, lazy loading, srcset/sizes y width/height (target: Lighthouse sin warnings).');

  // ---------- Reporte ----------
  const summary = {
    ok: findings.filter((f) => f.status === 'ok').length,
    warn: findings.filter((f) => f.status === 'warn').length,
    fail: findings.filter((f) => f.status === 'fail').length,
  };
  const date = new Date().toISOString();
  const data = { url: BASE, date, pages: pages.map((p) => p.url), findings, summary };

  if (asJson) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    return;
  }

  const icon = { ok: '✅', warn: '⚠️', fail: '❌' };
  const conf = { confirmed: 'confirmed', probable: 'probable', informational: 'informational' };
  console.log(`# Auditoría VIBECODE REHAB — ${BASE}`);
  console.log(`Fecha: ${date.slice(0, 19)} · Páginas analizadas: ${pages.length}`);
  console.log(`## Resumen: ✅ ${summary.ok} · ⚠️ ${summary.warn} · ❌ ${summary.fail}`);
  if (errs.length) console.log(`\n> ⚠️ No se pudo alcanzar: ${errs.map((p) => p.url).join(', ')}`);
  console.log('\n| # | Señal | Estado | Confianza | Detalle |');
  console.log('|---|-------|--------|-----------|---------|');
  for (const f of findings) {
    console.log(`| ${f.id} | ${f.name} | ${icon[f.status]} | ${conf[f.confidence] || f.confidence} | ${String(f.detail).replace(/\|/g, '\\|').slice(0, 200)} |`);
  }
  console.log('\n## Siguiente paso');
  console.log('Pega SKILL.md de este repo (junto con esta URL) en tu agente IA para que aplique las correcciones indicadas en cada fila, en orden 1→20, verificando cada una.');
}

main().catch((e) => {
  console.error('Error en la auditoría:', e);
  process.exit(1);
});