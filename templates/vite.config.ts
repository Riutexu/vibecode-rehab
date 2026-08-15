import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Nunca exponer sourcemaps en producción (señal 17).
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    // Informa en el build del tamaño GZIP de cada chunk (señal 19):
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Vendors en su propio chunk: mejor caché y menos trabajo del navegador (señal 19).
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          // Añade aquí bibliotecas grandes que se usen en muchas páginas,
          // ej. charts: ['recharts'], o quita librerías pesadas de las rutas críticas.
        },
      },
    },
  },
})