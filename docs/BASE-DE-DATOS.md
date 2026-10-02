# Base de datos

Supabase (Postgres 17), proyecto `contraste` (`xeytiarseubrzrnmyomp`), región São Paulo, plan gratis. Panel: <https://supabase.com/dashboard/project/xeytiarseubrzrnmyomp>.

## Qué guarda

| Tabla | Qué es |
| --- | --- |
| `articles` | Notas en cualquier estado: borrador, en revisión, aprobada, descartada o publicada |
| `article_events` | Quién cambió el estado de cada nota y cuándo (lo escribe un trigger) |
| `pipeline_runs` | Informe de cada corrida del pipeline |
| `editors` | Quién puede usar la mesa de redacción |

Una nota se guarda entera en `articles.document`: es el `Article` de `src/domain/types.ts`, validado con `articleSchema` antes de escribirlo. Las columnas `slug`, `status`, `category`, `title`, `published_at` e `is_demo` las copia del documento un trigger (`private.articles_sync_columns`), así que nunca pueden contradecirlo. Para cambiar el estado de una nota se cambia `document.review.status`.

## Quién puede hacer qué

Todas las tablas tienen RLS. El proyecto se creó con "Automatically expose new tables" desactivado y "Enable automatic RLS" activado: ninguna tabla nueva es accesible desde la API hasta que una migración lo decide.

| Rol | Puede |
| --- | --- |
| Visitante (`anon`) o usuario logueado | Leer notas publicadas con fecha ya cumplida. Lo usa el armado del sitio |
| Editor (está en `editors`), con la verificación en dos pasos | Leer y editar todas las notas; ver historial e informes del pipeline. Con la contraseña sola (sin el código de la app), nada |
| Pipeline (`service_role`, clave secreta) | Crear y actualizar notas e informes |
| Nadie por la API | Borrar notas, escribir el historial, agregar editores |

Una nota descartada no se borra: pasa a `rejected`. Los editores se agregan a mano, desde el panel o con SQL (ver `docs/MESA-DE-REDACCION.md`).

Además de quién accede, la base controla qué se guarda: el formato de cada nota (un `CHECK` con el esquema JSON de `supabase/esquema-nota.json`) y las reglas de publicación (trigger `private.articles_reglas`: slug fijo, correcciones visibles, nada sin verificar publicado, fechas y aprobación humana). Al publicar, despublicar o corregir, el trigger `private.articles_pedir_armado` pide el armado del sitio a GitHub con `pg_net`. Detalle en `docs/MESA-DE-REDACCION.md`.

Las reglas están probadas contra la base real: un visitante y un usuario logueado sin permisos ven solo las publicadas y no pueden editar; un editor ve y publica, y el historial registra quién fue.

## El pipeline

`npm run pipeline -- --write --save` guarda cada borrador en `articles` (con el modelo que lo escribió en `writer`) y el informe en `pipeline_runs`, y vincula las notas con su corrida. Usa la clave secreta `pipeline` (Project Settings > API Keys > Secret keys), en `.env.pipeline` como `SUPABASE_SECRET_KEY`.

Esa clave salta las reglas de acceso: solo va en `.env.pipeline` y, cuando el pipeline corra en GitHub, como secreto del repositorio. Si se filtra, se anula desde el mismo panel y se crea otra; no afecta al resto.

Las notas de demostración solo entran a la base con `--permitir-demo` y quedan con `is_demo = true`: el sitio real no las muestra.

## El sitio

El sitio no consulta la base mientras se arma página por página. Antes de `next build`, `scripts/sync-content.ts` (incluido en `npm run build`) descarga las notas publicadas a una foto local (`.cache/contenido/notas.json`) y todas las páginas leen de ahí (`SnapshotArticleRepository`). Así:

- la base se consulta una vez por armado, no una vez por página;
- todas las páginas de un armado ven exactamente las mismas notas;
- es incremental: primero baja el índice (id y fecha de cada nota, pocos bytes) y después solo el documento de las notas nuevas o cambiadas. En GitHub Actions la foto se guarda en la caché entre armados. Con miles de notas y 15 armados por día, la transferencia queda muy por debajo de los 5 GB mensuales del plan gratis;
- una nota despublicada desaparece en el armado siguiente, porque ya no figura en el índice;
- si la base no responde, el armado falla: publicar con una foto vieja podría volver a mostrar una nota despublicada.

Usa la clave **publicable** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.production`): es pública por diseño y, por las reglas de acceso, solo lee notas publicadas con fecha cumplida. Probado desde internet: no ve borradores, no lee los informes del pipeline y no puede escribir.

Con contenido real (`CONTRASTE_DEMO_MODE=false`), las notas de demostración nunca aparecen aunque estén publicadas en la base.

### Pasar el sitio a contenido real

Cuando haya notas reales publicadas, en GitHub: *Settings > Secrets and variables > Actions > Variables*:

- `CONTENT_SOURCE` = `database`
- `CONTRASTE_DEMO_MODE` = `false` (además saca el aviso de demostración y permite que Google indexe el sitio)

No hace falta tocar código. Para volver a la demostración, se borran las dos variables.

Probado con la base real: con una nota publicada, el sitio la muestra en la portada, en su página y en la búsqueda; con cero notas visibles, se arma igual, con mensajes claros en la portada, Últimas noticias, las secciones y `/tema`.

## Migraciones

Cada cambio de la base es un archivo en `supabase/migrations/`, creado con:

```bash
npx supabase migration new nombre_del_cambio
```

Al llegar a `main`, `.github/workflows/migrar-base.yml` lo aplica con `supabase db push`. Usa el secreto de GitHub `SUPABASE_DB_URL`: la cadena de conexión del *Session pooler* (panel de Supabase, botón *Connect*) con la contraseña de la base. La conexión directa no sirve desde GitHub porque es solo IPv6.

Para probar una migración sin dejar rastro, se puede correr dentro de una transacción que no se confirma:

```bash
npx supabase db query --linked --project-ref xeytiarseubrzrnmyomp -f prueba.sql
```

con `begin;` al principio del archivo y sin `commit`. Requiere `npx supabase login`.

## Límites del plan gratis

- 500 MB de base de datos y 5 GB de transferencia por mes.
- **El proyecto se pausa después de 7 días sin uso.** Cuando el pipeline y el armado diario lean y escriban en la base, la van a usar todos los días. Mientras tanto puede pausarse; se reactiva desde el panel.
- Dos proyectos activos gratis en total, contando todas las organizaciones de la cuenta.
- **El plan gratis no tiene copias de seguridad automáticas.** Supabase recomienda exportar la base con `npx supabase db dump` y guardar la copia fuera de Supabase. Cuando haya notas reales, conviene automatizarlo.
