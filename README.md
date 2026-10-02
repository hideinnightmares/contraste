# Contraste

Prototipo funcional de un diario digital que publica noticias contrastadas con más de una fuente. Cada nota muestra qué fuentes se consultaron, qué está confirmado, qué no, y si las fuentes se contradicen.

Es un sitio estático publicado en Cloudflare: <https://contraste.mateopradal23.workers.dev> (ver [Despliegue](docs/DESPLIEGUE.md)).

> **Edición de demostración.** Las 37 notas del sitio son ficticias y están marcadas como DEMO en cada tarjeta y en cada página. Las fuentes citadas también son ficticias (enlazan a `example.com`). Las fotos son reales, de Wikimedia Commons con licencias libres, y se publican como "imagen ilustrativa" con autor y licencia. Las notas DEMO llevan `noindex` y no figuran en los sitemaps.

## Puesta en marcha

Requiere Node.js 20.9 o superior (probado con Node 24).

```bash
npm install
```

```bash
npm run dev
```

El sitio queda en <http://localhost:3000>. Para probarlo como en producción, armarlo y servirlo con la misma configuración que Cloudflare (<http://localhost:8787>):

```bash
npm run build
```

```bash
npm run preview
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Arma el sitio estático en `out/` (páginas, versiones de fotos, control del límite de archivos) |
| `npm run preview` | Sirve `out/` como en Cloudflare |
| `npm run deploy` | Arma y publica en Cloudflare (requiere `npx wrangler login`) |
| `npm run check` | Tipos, lint, tests unitarios y contraste de colores |
| `npm test` | Tests unitarios (Vitest): buscador, portada, dataset, pipeline, newsletter, SEO |
| `npm run test:e2e` | Tests de punta a punta y de accesibilidad (Playwright + axe) sobre `out/`. Requiere `npm run build` antes |
| `npm run check:contrast` | Mide el contraste WCAG de cada par de colores en modo claro, oscuro y banda invertida |
| `npm run pipeline` | Corre el pipeline de automatización con las fuentes configuradas (ver abajo) |
| `npm run fuentes:probar` | Prueba cada fuente: feed, lectura de una nota y robots.txt |

## Qué hay

**Sitio**
- Portada editorial con jerarquías distintas: principal, secundarias, "Último momento" en línea de tiempo, "En breve", análisis en banda invertida, más leídas, secciones con diseños propios, "Para leer con tiempo" y una franja de newsletter (deshabilitado hasta tener proveedor: hoy ofrece el RSS).
- Página de nota con verificación visible: medidor de fuentes, bloque "Lo que se sabe / Lo que todavía no", contradicciones detectadas, fuentes consultadas con tipo y fecha de consulta, historial de cambios, temas, compartir, anterior/siguiente, relacionadas y recomendadas.
- Secciones, temas, últimas noticias por día, buscador instantáneo (tecla `/`) y búsqueda avanzada por palabra, sección, formato, tema y rango de fechas. La búsqueda corre en el navegador sobre un índice publicado con el sitio.
- Modo claro/oscuro con selector visible, transiciones entre páginas, aparición progresiva, skeletons de carga, menú móvil a pantalla completa.
- Páginas de privacidad, términos, cookies y "Cómo trabajamos" (textos base para revisión legal).
- SEO: metadatos por página, canonical, Open Graph, Twitter/X, `NewsArticle` / `AnalysisNewsArticle` / `BackgroundNewsArticle`, breadcrumbs, sitemap, sitemap de Google News, robots.txt, RSS.
- Publicidad: siete posiciones preparadas para AdSense con marcadores de desarrollo y `ads.txt` generado desde la configuración.

**Automatización** (`src/pipeline/`)

```
FUENTES → RECOPILACIÓN → DEDUPLICACIÓN → INVESTIGACIÓN → VERIFICACIÓN →
REDACCIÓN (IA) → CONTROL DE CIFRAS Y NOMBRES → REVISIÓN → PUBLICACIÓN
```

`npm run pipeline` lee las fuentes reales (medios nacionales, Noticias Argentinas, organismos oficiales e internacionales en castellano) y muestra qué hechos encuentra y cuántas fuentes independientes tiene cada uno. `npm run pipeline -- --prueba` hace lo mismo con ítems ficticios y sin red: muestra cómo detecta una réplica de agencia (no suma independencia), una contradicción de cifras (va a revisión humana) y un hecho de fuente única (queda en espera). Con `-- --write` redacta borradores con Gemini (requiere `GEMINI_API_KEY` en `.env.pipeline`, gratis) y con `-- --save` los guarda en la base (o en `.data/pipeline/` si no está configurada). `npm run fuentes:probar` prueba cada fuente. En GitHub, el flujo Pipeline de noticias lo corre cada 2 horas cuando se lo activa (ver `docs/AUTOMATIZACION.md`).

## Qué falta configurar

Nada de esto se puede completar sin datos o decisiones del responsable del medio:

- **Datos institucionales**: razón social, CUIT, domicilio y emails en `src/config/site.ts`. Hoy se muestran como `[pendiente]`.
- **Revisión legal** de privacidad, términos y cookies por un profesional matriculado (ver `docs/PRIVACIDAD-Y-LEGAL.md`).
- **Fuentes oficiales sin feed**: el Boletín Oficial, el INDEC y el BCRA no publican feeds; hace falta un conector que lea su página de novedades (ver `docs/AUTOMATIZACION.md`, "Fuentes").
- **Mesa de redacción**: crear el usuario de cada editor y guardar el token de GitHub en Supabase Vault (ver `docs/MESA-DE-REDACCION.md`).
- **Newsletter**: proveedor de email y la función que guarde suscripciones (ver `docs/NEWSLETTER.md`).
- **AdSense**: ID de editor, IDs de bloques y una plataforma de consentimiento certificada por Google si hay tráfico europeo (ver `docs/ADSENSE.md`).
- **Pipeline en GitHub**: los secretos `GEMINI_API_KEY` y `SUPABASE_SECRET_KEY` y la variable `CONTRASTE_PIPELINE_ACTIVO` (ver `docs/AUTOMATIZACION.md`, "Corrida programada").
- **Dominio y nombre**: "Contraste" es un nombre de trabajo; verificar disponibilidad de marca y dominio antes de lanzar.

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md): capas, flujo de datos, cómo conectar una base o un CMS.
- [Automatización](docs/AUTOMATIZACION.md): pipeline, fuentes, verificación, redactor con IA, política de revisión.
- [Despliegue](docs/DESPLIEGUE.md): Cloudflare Workers, publicación automática, límites del plan gratis.
- [Base de datos](docs/BASE-DE-DATOS.md): Supabase, tablas, quién puede hacer qué, migraciones.
- [Mesa de redacción](docs/MESA-DE-REDACCION.md): revisar, corregir y publicar; qué controla la base; configuración inicial.
- [Diseño](DESIGN.md): paleta, tipografía, forma y movimiento (formato DESIGN.md). Referencias en `design-md/`.
- [AdSense](docs/ADSENSE.md): cómo activar la publicidad sin romper la experiencia ni las políticas.
- [Newsletter](docs/NEWSLETTER.md): doble opt-in, datos guardados, proveedor.
- [Privacidad y legal](docs/PRIVACIDAD-Y-LEGAL.md): checklist y puntos a revisar.
