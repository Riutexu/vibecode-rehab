// Genera public/sitemap.xml desde las rutas reales de la app (señal 14).
//
// Uso:
//   node sitemap-gen.mjs                                    → usa las rutas de abajo
//   node sitemap-gen.mjs --base https://midominio.com       → cambia el dominio
//   node sitemap-gen.mjs /servicios /precios /blog          → rutas extra
//
// Mantén `routes` sincronizado con tu router (o extráelas del router automáticamente).

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const BASE = (baseIdx !== -1 ? args[baseIdx + 1] : 'https://dominio.com').replace(/\/+$/, '')

const routes = ['/', '/servicios', '/precios', '/contacto', '/blog']
const extra = args.filter((a) => a.startsWith('/'))
if (extra.length) routes.push(...extra)

for (const r of routes) {
  if (!r.startsWith('/')) throw new Error(`La ruta "${r}" debe empezar por "/"`)
}
if (routes.some((r) => r !== '/' && r.endsWith('/'))) {
  throw new Error('Usa rutas sin slash final (y activa trailingSlash: false en Vercel)')
}

const lastmod = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

const urls = [...new Set(routes)]
  .map((r) => {
    const url = `${BASE}${r === '/' ? '/' : r}`
    return [
      '  <url>',
      `    <loc>${url}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      `    <priority>${r === '/' ? '1.0' : '0.8'}</priority>`,
      '  </url>',
    ].join('\n')
  })
  .join('\n')

mkdirSync(dirname('public/sitemap.xml'), { recursive: true })
writeFileSync(
  'public/sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    '</urlset>\n'
)
console.log(`sitemap.xml generado con ${routes.length} rutas → public/sitemap.xml`)