// Seo.tsx — Componente central para las señales 5, 6, 7, 8, 10 y 15.
// Usa react-helmet-async (un único head dinámico por página, clave en SPAs).
//
// 1) Instala:        npm i react-helmet-async
// 2) En main.tsx:    <HelmetProvider><App /></HelmetProvider>
// 3) En cada página: <Seo title="Inicio | Mi Marca" description="..." path="/" ... />

import { Helmet } from 'react-helmet-async'

type SeoProps = {
  title: string // único por página: "Nombre de página | Marca" (50-60 caracteres)
  description: string // única por página, 150-160 caracteres, con propuesta de valor
  path: string // ruta canónica, ej. '/' o '/servicios'
  ogImage?: string // URL absoluta 1200x630 (por defecto una genérica)
  type?: 'website' | 'article' | 'product'
  jsonLd?: Record<string, unknown>[] // esquemas JSON-LD de esta página (señal 8)
}

const SITE_URL = 'https://dominio.com' // ← tu dominio definitivo (sin slash final, sin www a menos que lo uses en TODO)
const SITE_NAME = 'Nombre de la Marca'

export default function Seo({ title, description, path, ogImage, type = 'website', jsonLd = [] }: SeoProps) {
  const url = `${SITE_URL}${path === '/' ? '/' : path}`
  const image = ogImage ?? `${SITE_URL}/og-default.png`

  return (
    <Helmet>
      <html lang="es" /> {/* señal 15 */}
      <title>{title}</title> {/* señal 5 */}
      <meta name="description" content={description} /> {/* señal 6 */}
      <link rel="canonical" href={url} /> {/* señal 10 */}

      {/* Open Graph — señal 7 */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter — señal 7 */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Datos estructurados — señal 8 */}
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
    </Helmet>
  )
}

// ------------------ Ejemplo de uso por página ------------------
//
// const schema = {
//   '@context': 'https://schema.org',
//   '@type': 'WebSite',
//   name: SITE_NAME,
//   url: SITE_URL,
// }
//
// <Seo
//   title="Servicios | Mi Marca"
//   description="Diseño y desarrollo web con resultados medibles. Presupuesto en 24 h."
//   path="/servicios"
//   type="website"
//   jsonLd={[schema, breadcrumbSchema]}
// />