// Genera public/sitemap.xml desde las rutas reales de la app (señal 14).
// Uso: node sitemap-gen.mjs
// Mantén `routes` sincronizado con tu router (o extráelas del router si quieres).

import { writeFileSync } from 'node:fs'

const BASE = 'https://dominio.com' // dominio definitivo, sin slash final
const routes = ['/', '/servicios', '/precios', '/contacto', '/blog', '/blog/post-1']
const lastmod = new Date().toISOString().slice(0, 10)

const urls = routes
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

writeFileSync(
  'public/sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    '</urlset>\n'
)
console.log(`sitemap.xml generado con ${routes.length} rutas → public/sitemap.xml`)