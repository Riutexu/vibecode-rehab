// NotFound.tsx — Señal 3: página 404 real.
// En tu router de React:
//   <Route path="*" element={<NotFound />} />
// Y confirma en vercel.json (templates/vercel.json) que Vercel sirva la SPA
// y que el 404 que ve el cliente coincida con el estado HTTP 404 real.

import { Link } from 'react-router-dom'
import Seo from './Seo'

export default function NotFound() {
  return (
    <>
      <Seo
        title="Página no encontrada | Mi Marca"
        description="La página que buscas no existe o fue movida. Vuelve al inicio de Mi Marca."
        path="/404"
      />
      <main>
        <h1>404 — página no encontrada</h1>
        <p>La página que buscas no existe o fue movida. Puede que el enlace esté roto.</p>
        <Link to="/">Volver al inicio</Link>
      </main>
    </>
  )
}