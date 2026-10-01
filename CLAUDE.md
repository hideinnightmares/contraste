@AGENTS.md

# Contraste

Diario digital con verificación de fuentes. Antes de cambiar algo, leé `README.md` y `docs/ARQUITECTURA.md`.

- Textos de interfaz en español rioplatense (voseo), en oración, sin mayúsculas sostenidas.
- Nunca inventar fuentes, citas, cifras, autores, métricas de audiencia ni reseñas. Todo contenido de prueba se marca `isDemo: true`.
- Los colores salen de los tokens de `src/app/globals.css`; si se agrega o cambia uno, correr `npm run check:contrast`.
- Las páginas leen contenido solo a través de `getRepository()` (`src/data/index.ts`).
- El sitio es estático (`output: 'export'`, publicado en Cloudflare): nada que necesite servidor (ISR, Server Actions, rutas que leen el pedido, `headers()` en `next.config.ts`). Ver `docs/ARQUITECTURA.md` y `docs/DESPLIEGUE.md`.
- Verificación antes de entregar: `npm run check`, `npm run build`, `npm run test:e2e`.
- La identidad visual está en `DESIGN.md`. Antes de tocar interfaz, leerlo y aplicar la skill `design-taste-frontend`; la colección de referencia está en `design-md/`.
