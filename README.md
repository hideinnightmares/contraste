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

`npm run pipeline` corre el pipeline con ítems de prueba y muestra cómo detecta una réplica de agencia (no suma independencia), una contradicción de cifras (va a revisión humana) y un hecho de fuente única (queda en espera). Con `-- --write` redacta borradores con Gemini (requiere `GEMINI_API_KEY` en `.env.pipeline`, gratis) y con `-- --save` los guarda en `.data/pipeline/`.

## Qué falta configurar

Nada de esto se puede completar sin datos o decisiones del responsable del medio:

- **Datos institucionales**: razón social, CUIT, domicilio y emails en `src/config/site.ts`. Hoy se muestran como `[pendiente]`.
- **Revisión legal** de privacidad, términos y cookies por un profesional matriculado (ver `docs/PRIVACIDAD-Y-LEGAL.md`).
- **Fuentes reales**: URLs de feeds con permiso de uso en `src/config/sources.ts`.
- **Base de datos o CMS**: implementar `ArticleRepository` (ver `docs/ARQUITECTURA.md`).
- **Newsletter**: proveedor de email y la función que guarde suscripciones (ver `docs/NEWSLETTER.md`).
- **Repositorio en GitHub** con el token de Cloudflare, para publicar solo (ver `docs/DESPLIEGUE.md`).
- **AdSense**: ID de editor, IDs de bloques y una plataforma de consentimiento certificada por Google si hay tráfico europeo (ver `docs/ADSENSE.md`).
- **Clave de Gemini en GitHub** (`GEMINI_API_KEY`, como secreto) cuando el pipeline corra allá.
- **Dominio y nombre**: "Contraste" es un nombre de trabajo; verificar disponibilidad de marca y dominio antes de lanzar.

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md): capas, flujo de datos, cómo conectar una base o un CMS.
- [Automatización](docs/AUTOMATIZACION.md): pipeline, fuentes, verificación, redactor con IA, política de revisión.
- [Despliegue](docs/DESPLIEGUE.md): Cloudflare Workers, publicación automática, límites del plan gratis.
- [Base de datos](docs/BASE-DE-DATOS.md): Supabase, tablas, quién puede hacer qué, migraciones.
- [Diseño](DESIGN.md): paleta, tipografía, forma y movimiento (formato DESIGN.md). Referencias en `design-md/`.
- [AdSense](docs/ADSENSE.md): cómo activar la publicidad sin romper la experiencia ni las políticas.
- [Newsletter](docs/NEWSLETTER.md): doble opt-in, datos guardados, proveedor.
- [Privacidad y legal](docs/PRIVACIDAD-Y-LEGAL.md): checklist y puntos a revisar.
