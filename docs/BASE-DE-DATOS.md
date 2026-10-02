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
| Editor (está en `editors`) | Leer y editar todas las notas; ver historial e informes del pipeline |
| Pipeline (`service_role`, clave secreta) | Crear y actualizar notas e informes |
| Nadie por la API | Borrar notas, escribir el historial, agregar editores |

Una nota descartada no se borra: pasa a `rejected`. Los editores se agregan a mano, desde el panel o con SQL.

Las reglas están probadas contra la base real: un visitante y un usuario logueado sin permisos ven solo las publicadas y no pueden editar; un editor ve y publica, y el historial registra quién fue.

## El pipeline

`npm run pipeline -- --write --save` guarda cada borrador en `articles` (con el modelo que lo escribió en `writer`) y el informe en `pipeline_runs`, y vincula las notas con su corrida. Usa la clave secreta `pipeline` (Project Settings > API Keys > Secret keys), en `.env.pipeline` como `SUPABASE_SECRET_KEY`.

Esa clave salta las reglas de acceso: solo va en `.env.pipeline` y, cuando el pipeline corra en GitHub, como secreto del repositorio. Si se filtra, se anula desde el mismo panel y se crea otra; no afecta al resto.

Las notas de demostración solo entran a la base con `--permitir-demo` y quedan con `is_demo = true`: el sitio real no las muestra.

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
