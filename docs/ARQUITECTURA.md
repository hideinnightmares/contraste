# Arquitectura

Next.js 16 (App Router, React 19.2) con TypeScript estricto. Sin framework de CSS: CSS Modules sobre un sistema de tokens en `src/app/globals.css`.

## Capas

```
src/
├── app/          Frontend: rutas, metadatos, API routes (búsqueda, newsletter), sitemaps, RSS
├── components/   Frontend: componentes de interfaz
├── config/       Configuración: sitio, secciones, publicidad, privacidad, reglas editoriales, fuentes
├── content/      Contenido: dataset DEMO (notas, fuentes ficticias, fotos con créditos)
├── data/         Datos: interfaz ArticleRepository y su implementación DEMO
├── domain/       Lógica de noticias: tipos, esquema de validación, portada, buscador, relacionadas, fechas
├── lib/          Integraciones del sitio: SEO, feeds, newsletter, límite de pedidos
└── pipeline/     Automatización: fuentes, deduplicación, verificación, redacción, revisión, publicación
```

Reglas de dependencia:
- `domain/` no importa nada de Next ni de React. Es lógica pura y testeable.
- `pipeline/` no importa componentes ni rutas. Su único contacto con el sitio es el tipo `Article` y el `Publisher`.
- Las páginas nunca leen `content/` directamente: pasan por `getRepository()` en `data/index.ts`.

## Flujo de datos

```
pipeline (fuentes reales)  ──Publisher──▶  base de datos / CMS
                                                │
content/demo (DEMO)  ─────────────────────▶  ArticleRepository  ──▶  next build  ──▶  out/  ──▶  Cloudflare
                                                │
                                         articleSchema (zod)
```

Toda nota pasa por `domain/schema.ts` al cargarse. El esquema impone reglas editoriales, no solo de forma: una nota publicada tiene que citar fuentes, una nota `unverified` no se puede publicar, una nota `disputed` necesita aprobación humana y contradicciones registradas, y cada afirmación tiene que citar fuentes que existan en la nota.

## Conectar una base de datos o un CMS

1. Implementar `ArticleRepository` (`src/data/repository.ts`). Cinco métodos: listar publicadas (con paginación y filtros), buscar por slug, anterior/siguiente, etiquetas y corpus completo.
2. Validar cada fila con `articleSchema` antes de devolverla (como hace `DemoArticleRepository`).
3. Registrarla en `src/data/index.ts` bajo un valor nuevo de `CONTENT_SOURCE`.
4. Implementar un `PopularityProvider` real a partir de analytics (`src/data/popularity.ts`) para "Más leídas". Se lee al armar el sitio.
5. Hacer que el `Publisher` del pipeline escriba en esa misma base y que la aprobación de una nota dispare un armado nuevo (`repository_dispatch` "publicar", ver `docs/DESPLIEGUE.md`).
6. Si el índice de búsqueda crece demasiado para descargarlo entero (miles de notas), partirlo en trozos (por ejemplo, Pagefind) o pasar a un servicio de búsqueda, manteniendo la firma de `search()`.

Las páginas no cambian.

## Sitio estático

`next build` (con `output: 'export'`) genera cada página como archivo en `out/` y Cloudflare los sirve sin ejecutar código. No hay servidor: nada de ISR, Server Actions, rutas que lean el pedido ni encabezados desde `next.config.ts`. El sitio se rearma completo en cada publicación y una vez por día (ver `docs/DESPLIEGUE.md`).

| Ruta | Cómo se genera |
| --- | --- |
| `/`, `/ultimas`, sitemaps, RSS | Al armar el sitio |
| `/nota/[[...slug]]` | Una página por nota publicada (`dynamicParams = false`). `/nota` sola lleva a Últimas noticias |
| `/seccion/[slug]/[[...pagina]]` | Una página por sección y por página del listado: `/seccion/economia`, `/seccion/economia/pagina/2` |
| `/tema/[[...ruta]]` | `/tema` es el índice de temas; `/tema/clima` y `/tema/clima/pagina/2`, cada tema con al menos `MIN_NOTES_FOR_TAG_PAGE` notas (3). Los demás temas enlazan a `/buscar?tema=…` |
| `/buscar` | Página fija; los criterios van en la dirección y la búsqueda corre en el navegador |
| `/indice-busqueda.json` | Índice del buscador: resumen y texto plano de cada nota (`SearchDocument`) |
| `/redaccion` | Mesa de redacción: página fija que corre en el navegador y lee y escribe en la base con la sesión del editor (ver `docs/MESA-DE-REDACCION.md`) |

**Marco del diario.** El encabezado, la publicidad superior, el pie y el aviso de cookies los pone `SiteFrame` (`src/components/layout/SiteFrame.tsx`) desde el layout raíz, salvo en las rutas de `WITHOUT_FRAME` (la mesa de redacción). No se usan grupos de rutas para esto: cada layout extra agrega un archivo de navegación por página al armado.

Notas, secciones y temas usan rutas opcionales (`[[...]]`) que siempre generan al menos una página (`/nota`, `/seccion/x`, `/tema`): con `output: 'export'`, Next.js corta el armado si una ruta dinámica no genera ninguna, y eso pasaría con la base vacía o con pocos temas.

**Contenido.** `CONTENT_SOURCE=demo` usa el dataset ficticio; `CONTENT_SOURCE=database`, la foto de la base que se descarga antes de cada armado (ver `docs/BASE-DE-DATOS.md`). Los dos comparten la lógica de listados (`InMemoryArticleRepository`). Sin datos de lecturas, "Más leídas" no se muestra.

**Fechas.** Se formatean con zona horaria `America/Argentina/Buenos_Aires` explícita. Como el HTML puede tener horas de antigüedad, las etiquetas relativas se corrigen en el navegador: la fecha del encabezado con un script en línea antes del primer pintado, y "Hoy"/"Ayer" de cada nota con `PublishedTime` (`useSyncExternalStore`: el HTML trae la etiqueta del armado y el navegador la recalcula al hidratar).

**Fotos.** `next/image` usa un cargador propio (`src/lib/image-loader.ts`) que apunta a versiones WebP pregeneradas en los anchos de `src/config/images.ts`. Las genera `scripts/postbuild.ts` con sharp y las guarda en `.cache/img/` para no rehacerlas en cada armado. Las fotos externas se sirven tal cual.

## Rutas que responden 404

Las direcciones que no se generaron no existen: Cloudflare responde `out/404.html` con estado 404 (`not_found_handling` en `wrangler.jsonc`). Los `layout.tsx` de nota, sección y tema conservan el control de existencia, que importa en `next dev`.

## Seguridad

- Encabezados en `public/_headers` (Cloudflare los aplica): `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS.
- Falta una Content Security Policy. Se recomienda agregarla al activar AdSense, con hashes de los scripts en línea (en un sitio estático no hay nonces por pedido), incluyendo los dominios que Google documenta para AdSense.
- La mesa de redacción usa la clave publicable de Supabase y la sesión del editor: lo que puede ver y cambiar lo deciden las reglas de acceso y los triggers de la base, no la página (ver `docs/MESA-DE-REDACCION.md`). La sesión se guarda en el navegador, en el dominio del sitio: antes de cargar scripts de terceros (AdSense), separar la mesa en otro dominio o dejar de guardar la sesión (ver `docs/ADSENSE.md`).
- El sitio publicado no tiene código de servidor ni APIs que atacar ni sobrecargar. Cuando se habilite el newsletter, su alta irá en una función aparte con validación y límite de pedidos (ver `docs/NEWSLETTER.md`).
- El índice de búsqueda publica solo lo que ya se ve en las notas (resumen y texto), nunca las fuentes ni los datos de revisión.
- El JSON-LD se serializa escapando `<`.

## Rendimiento

- Las páginas son archivos: Cloudflare las sirve desde su red sin ejecutar código, sin límite de visitas en el plan gratis.
- Fotos en WebP pregenerado con `sizes` por variante, carga diferida salvo la principal, y miniatura borrosa de 16 px como placeholder.
- Fuentes autoalojadas por `next/font` (sin pedidos a Google), con ajuste métrico de la fuente de reserva.
- Una sola animación orquestada al cargar (la foto principal se abre desde el centro); el resto es CSS. La barra de progreso de lectura usa `animation-timeline: scroll()` y no ejecuta JavaScript.
- Un único `IntersectionObserver` para todas las apariciones al hacer scroll.
- Sin scripts de terceros.
