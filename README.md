# 🏥 VIBECODE REHAB

> "20 señales de que un sitio fue vibecodeado" — convertidas en un prompt de auditoría que cualquier agente de IA puede ejecutar.

Pégalo junto con la URL del sitio y un agente (opencode, Claude, Gemini, ChatGPT, Cursor…) auditará y corregirá **los 20 problemas típicos del vibecoding** de forma autónoma, con detección → corrección → verificación por cada ítem, y un reporte final.

## 🚩 Las 20 señales que detecta y corrige

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
| 10 | Sin tag canónico | 20 | Imágenes sin optimizar ni lazy |

## 📦 Archivos

| Archivo | Qué es |
|---------|--------|
| `AUDIT-PROMPT.md` | ⭐ El prompt completo listo para pegar en cualquier agente de IA |
| `README.md` | Este archivo |

## 🚀 Cómo usarlo

1. Abre [`AUDIT-PROMPT.md`](AUDIT-PROMPT.md).
2. Copia todo lo que está entre `--- INICIO DEL PROMPT ---` y `--- FIN DEL PROMPT ---`.
3. Pégalo en tu agente de IA, reemplaza `{{PEGA_AQUI_LA_URL}}` por la URL del sitio, y **dale acceso al código** si lo tienes local (en opencode/Cursor puedes poner el prompt en un archivo `AGENTS.md` del proyecto).
4. Revisa el reporte final y aplica las "acciones manuales" que indique (dominio propio, etc.).

### Consejos por herramienta

- **opencode / Cursor / Copilot:** copia `AUDIT-PROMPT.md` al repo del proyecto y ábrelo con la URL; el agente tendrá acceso directo al código y podrá editar los archivos.
- **Claude Projects:** crea un proyecto, sube el prompt como instrucción y suelta la URL en el chat.
- **Gemini / ChatGPT:** pega el prompt + URL en una conversación nueva; si solo tienes la URL desplegada, el agente te devolverá los archivos listos para aplicar.

## 🧹 Qué esperar del resultado

El agente te devolverá un reporte con el estado de cada señal (`✅ / ⚠️ / ❌`), los cambios aplicados y una verificación integral (Lighthouse ≥ 90 en Performance/SEO/Accessibility/Best Practices, HTTP codes, consola limpia). Los ítems que requieren acción humana (comprar dominio, confirmar una migración de framework) quedan listados al final del reporte.

## 🤝 Contribuciones

¿Se te ocurre otra señal clásica del vibecoding (CTA desubicados, footer de 400 líneas, todo en un `App.jsx` de 3000 líneas…)? Abre un issue o un PR en el repo con el formato: señal → detección → corrección → verificación.

---

*Creado porque la IA generó el problema… y la IA también puede arreglarlo. 😌*