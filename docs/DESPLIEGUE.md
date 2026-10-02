# Despliegue en Cloudflare

El sitio es estático: `npm run build` genera todas las páginas en `out/` y Cloudflare Workers las sirve como archivos, sin ejecutar código. Dirección actual: <https://contraste.mateopradal23.workers.dev>.

## Por qué estático

- **Permite anuncios en el plan gratis.** El plan gratis de Vercel prohíbe el uso comercial; Cloudflare no.
- **No tiene límite de visitas.** Los pedidos de archivos estáticos son gratis e ilimitados en Cloudflare y no cuentan para el tope de 100.000 pedidos dinámicos por día.
- **No hay límite de procesador que cuidar.** La primera versión fue dinámica (OpenNext). Medido el 1 de octubre de 2026, una página gastaba entre 18 y 440 ms de procesador por pedido, contra 10 ms del plan gratis; Cloudflare corta con el error 1102 a los sitios que se pasan seguido. Sirviendo archivos, ese límite no aplica.
- **La contra:** una nota aprobada tarda unos minutos en aparecer, el tiempo de rearmar y subir el sitio.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run build` | `next build` (exporta a `out/`) y `scripts/postbuild.ts`: versiones de fotos, `ads.txt` si hay AdSense y control del límite de archivos |
| `npm run preview` | Sirve `out/` con Wrangler en `http://localhost:8787`, con la misma configuración que en Cloudflare |
| `npm run deploy` | Arma y publica en Cloudflare |
| `npm run test:e2e` | Tests de punta a punta contra `out/` servido por Wrangler (requiere `npm run build` antes) |

`wrangler.jsonc` define el sitio: carpeta `out/`, `404.html` para lo que no existe y direcciones sin `.html`. Los encabezados de seguridad y caché están en `public/_headers`.

## Publicación automática

`.github/workflows/publicar.yml` arma y publica en GitHub Actions (Linux):

- con cada push a `main` que toque el sitio (los que cambian solo `supabase/`, `docs/` o archivos `.md` no lo rearman),
- cuando se publica, despublica o corrige una nota: la base de datos manda un `repository_dispatch` de tipo `publicar` (requiere el secreto `github_dispatch_token` en Supabase Vault, ver `docs/MESA-DE-REDACCION.md`),
- todos los días a las 00:07 de Buenos Aires, para rearmar la portada y las etiquetas "Hoy"/"Ayer",
- a mano, desde la pestaña Actions.

Corre un armado a la vez. Si llegan varias aprobaciones mientras uno corre, queda uno solo en espera, que publica todas juntas.

### Cuánto se puede publicar

Un repositorio privado tiene 2.000 minutos gratis de GitHub Actions por mes (uno público, ilimitados). GitHub cobra cada ejecución por minuto entero hacia arriba. En esta computadora el armado tarda 11 segundos y la subida 18; en GitHub, con la instalación de dependencias, se estima en unos 2 minutos facturados (confirmarlo con los primeros armados en la pestaña Actions).

| Uso | Minutos por mes |
| --- | --- |
| 15 publicaciones por día × 2 min | 900 |
| Armado diario de medianoche | 60 |
| Pipeline cada 2 horas (cuando corra en GitHub) × 2 min | 720 |
| Copia de seguridad diaria de la base × 3 min | 90 |
| **Total** | **1.770 de 2.000** |

Con el pipeline cada 2 horas y la copia diaria, el máximo seguro es de unas 18 publicaciones por día. El tope está en la variable del repositorio `CONTRASTE_MAX_PUBLICACIONES_DIARIAS` (15 si no se define). Al llegar al tope, las aprobaciones siguientes no arman el sitio y salen en el armado de medianoche: no se pierde nada y los minutos no se agotan antes de fin de mes.

### Configurarla (una vez)

1. Crear el repositorio en GitHub y subir el proyecto.
2. En Cloudflare: *My Profile > API Tokens > Create Token*, plantilla **Edit Cloudflare Workers**, con *Account Resources* limitado a esta cuenta. El token se muestra una sola vez.
3. En GitHub: *Settings > Secrets and variables > Actions*:
   - secreto `CLOUDFLARE_API_TOKEN`: el token del paso 2,
   - secreto `CLOUDFLARE_ACCOUNT_ID`: el ID de la cuenta (`npx wrangler whoami`),
   - variable `CONTRASTE_MAX_PUBLICACIONES_DIARIAS`, si se quiere otro tope.
4. Hacer un push y revisar el primer armado en la pestaña Actions.

El flujo no se pudo probar antes de que exista el repositorio.

## Límites del plan gratis

**20.000 archivos por versión del sitio** (100.000 en el plan pago de US$5). `scripts/postbuild.ts` cuenta los archivos en cada armado, avisa a partir de 16.000 y corta si se pasa.

Cada nota suma 6 archivos: la página y los datos que Next.js usa para navegar sin recargar. Cada foto propia suma 5 más, uno por ancho de `src/config/images.ts`. Con las secciones y temas, la capacidad estimada es:

| Notas | Archivos | Capacidad | A 15 notas por día |
| --- | --- | --- | --- |
| Sin foto | unos 6,6 por nota | unas 3.000 notas | unos 6 meses |
| Con una foto propia | unos 11,6 por nota | unas 1.700 notas | unos 4 meses |

Para estirarlo:

- Los temas tienen página propia recién desde 3 notas (`MIN_NOTES_FOR_TAG_PAGE`); los demás enlazan a la búsqueda filtrada. Con la demo, eso bajó el sitio de 1.021 a 613 archivos.
- Las fotos pueden ir a R2 (almacenamiento de Cloudflare, pide cargar tarjeta para activarse) en lugar de dentro del sitio.
- El plan pago multiplica por cinco la capacidad.

Otros límites: 25 MB por archivo, y en GitHub Actions los minutos de arriba.

## Variables y secretos

- `.env.production` lleva solo datos públicos (`NEXT_PUBLIC_SITE_URL`) y se sube al repositorio. Todo `NEXT_PUBLIC_*` queda escrito en las páginas: nunca un secreto ahí.
- Las claves del pipeline (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) van en `.env.pipeline`, que solo lee `npm run pipeline` y no entra al armado del sitio. En GitHub Actions, como secretos del repositorio.
- El token de Cloudflare vive solo en GitHub (secreto) y en tu sesión de Wrangler (`npx wrangler login`).

## Fechas en un sitio estático

El HTML puede tener horas de antigüedad. La fecha del encabezado y las etiquetas "Hoy"/"Ayer" se recalculan en el navegador con la hora real (`TodayDate`, `PublishedTime`), y el armado diario de medianoche rehace la portada.

## Error de Next.js al armar en Windows

Next.js 16.3 guarda mal los archivos de navegación de las páginas dinámicas cuando exporta en Windows: arma el nombre con `\` en lugar de `/` y los guarda en carpetas (`__next.nota/$d$slug/__PAGE__.txt` en lugar de `__next.nota.$d$slug.__PAGE__.txt`). El navegador recibe 404 y la navegación se demora. `scripts/postbuild.ts` los renombra; en Linux (GitHub Actions) no pasa. El test `navegar sin recargar no pide archivos de datos que no existen` lo controla.

## Restos de la versión dinámica

- La cola de regeneración (Durable Object `DOQueueHandler`) se eliminó con la migración `v2` de `wrangler.jsonc`.
- El espacio de Workers KV `contraste-cache` quedó en la cuenta sin uso. No cuesta nada; se puede borrar desde el panel (*Storage & Databases > KV*).
