# Automatización

El pipeline vive en `src/pipeline/` y está separado del sitio. Cada etapa es una función pura o una interfaz reemplazable, y cada decisión queda registrada con sus razones en el informe de la corrida.

```
FUENTES → RECOPILACIÓN → DEDUPLICACIÓN → INVESTIGACIÓN → VERIFICACIÓN →
REDACCIÓN → CONTROL DE CIFRAS Y NOMBRES → REVISIÓN → PUBLICACIÓN → SEO → DISTRIBUCIÓN
```

## Cómo correrlo

```bash
npm run pipeline
```

Lee las fuentes reales de `src/config/sources.ts` y llega hasta la verificación: muestra qué hechos encontró, cuántas fuentes independientes tiene cada uno y qué decidiría. No redacta ni guarda nada. El informe queda en `.data/pipeline/informes/`. Necesita salida a internet.

```bash
npm run pipeline -- --prueba
```

Lo mismo con las fuentes de prueba: ítems ficticios, sin red. Muestra cómo detecta una réplica de agencia (no suma independencia), una contradicción de cifras (va a revisión humana) y un hecho de fuente única (queda en espera).

```bash
npm run pipeline -- --write --save
```

Además redacta con IA y guarda. Con `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.pipeline`, guarda las notas y el informe de la corrida en la base de datos (ver [BASE-DE-DATOS.md](BASE-DE-DATOS.md)); sin ellas, en `.data/pipeline/publicadas/` o `.data/pipeline/revision/`. Requiere `GEMINI_API_KEY` en `.env.pipeline` (gratis, ver [Redactor con IA](#redactor-con-ia)). Sin `--save`, los borradores quedan solo en el informe. Con `--detalle` se listan también los hechos de una sola fuente.

```bash
npm run pipeline -- --verificar
```

Solo comprueba las claves, sin leer fuentes, redactar ni guardar (`src/pipeline/check.ts`):

- que `GEMINI_API_KEY` esté cargada, que Google la acepte y qué modelos de la cadena puede usar;
- que `SUPABASE_SECRET_KEY` esté cargada y la base responda: solo cuenta las notas, sin leerlas ni cambiarlas.

Nunca muestra las claves.

Las notas armadas con fuentes de prueba quedan marcadas como demostración (`isDemo`) y **no se guardan en la base** salvo que se agregue `--permitir-demo`. El esquema de las notas rechaza una nota real que cite una fuente de prueba.

**Tope por corrida.** Se redactan como mucho `CONTRASTE_MAX_BORRADORES_POR_CORRIDA` hechos por corrida (4 si no se define). El orden de prioridad es este:

1. los que cubren más fuentes independientes;
2. a igual cobertura, los confirmados antes que los que todas las fuentes dan en condicional;
3. después, los que tienen una fuente primaria (organismo, documento o agencia);
4. al final, los más recientes.

Como mucho van 2 de una misma sección por corrida (`config/editorial.ts`, `drafting.maxPerCategoryPerRun`), así una corrida no se llena de deportes. El resto queda como `deferred` para la próxima corrida, sin leer sus notas. Si Gemini se queda sin cupo, en esa corrida no se intenta más. Así se cuida el cupo gratuito y la duración de cada corrida.

**Sin duplicados entre corridas.** Antes de redactar, el pipeline lee de la base qué fuentes citan las notas de los últimos 7 días, en cualquier estado. Un hecho que comparte alguna fuente con una nota existente queda como `already_covered` y no se redacta de nuevo (tampoco gasta cupo de Gemini). Los slugs ya usados tampoco se repiten.

**Memoria entre corridas.** Cada feed muestra solo sus últimas notas (el de Clarín, 10). Sin memoria, un hecho que un medio publicó a la mañana y otro a la tarde no se cruzaría nunca. Con `CONTRASTE_MEMORIA` (la ruta de un archivo, por ejemplo `.cache/pipeline/memoria.json`), el pipeline recuerda el título, el resumen, la dirección y la fecha de las notas de las últimas 24 horas, nunca su texto. Si el archivo falta o está dañado, la corrida sigue sin memoria.

**Qué no se usa.** Las coberturas en vivo ("EN VIVO", "minuto a minuto") y las páginas de servicio (dólar hoy, clima, horóscopo, quiniela) se descartan al recopilar: se actualizan todo el día y no son un hecho para contrastar. La lista está en `config/editorial.ts` (`collection.skipTitles`).

## Etapas

| Etapa | Archivo | Qué hace |
| --- | --- | --- |
| Fuentes | `config/sources.ts`, `sources/` | Conectores RSS 2.0, RSS 1.0 y Atom (con límite de tiempo y tamaño) y de prueba. Cada fuente declara tipo y origen editorial |
| Recopilación | `run.ts`, `memory.ts` | Corre los conectores en paralelo. Una fuente que falla queda registrada y no frena al resto. Suma lo recordado de corridas anteriores y descarta coberturas en vivo y páginas de servicio |
| Deduplicación | `stages/dedupe.ts` | Agrupa ítems del mismo hecho por URL canónica o superposición de raíces del título dentro de 36 horas |
| Investigación | `stages/research.ts`, `sources/article.ts` | Lee el texto completo de cada nota (ver [Lectura del texto completo](#lectura-del-texto-completo)) y arma el dossier para el redactor |
| Verificación | `stages/verify.ts`, `stages/attribution.ts`, `stages/figures.ts` | Cuenta fuentes independientes: excluye agregadores, detecta réplicas por similitud de texto y cuenta como un solo medio a las notas que repiten a otro ("según informó…", la firma de una agencia). Extrae cifras en formato argentino, detecta contradicciones entre fuentes y marca el lenguaje condicional. Con el texto completo, vuelve a verificar |
| Clasificación | `stages/classify.ts` | Asigna sección por palabras clave de `config/categories.ts` |
| Prioridad | `run.ts` | Ordena los hechos verificables por fuentes independientes y redacta como mucho el tope de la corrida |
| Redacción | `writers/` | Gemini (o Claude) escribe un borrador original solo con la información del dossier, con salida estructurada validada. En el dossier las fuentes se llaman F1, F2…; al volver, las citas se traducen a los ids reales (`resolveSourceIds`) |
| Control | `stages/grounding.ts` | Rechaza borradores con cifras o nombres propios que no estén en las fuentes, o que den un mismo dato como confirmado y no confirmado |
| Revisión | `stages/review.ts` | Decide: publicación automática, revisión humana o espera |
| Publicación y SEO | `stages/publish.ts`, `storage/supabase.ts` | Convierte el borrador en una nota válida (slug único, metadatos, fuentes, verificación) y la guarda en la base. Si el guardado falla, el hecho queda como `save_failed` (no se confunde con una falla del redactor) |

## Lectura del texto completo

El feed de un medio trae el título y un resumen. Para que el redactor trabaje con los hechos, el pipeline lee la nota completa de cada fuente (`WebArticleFetcher`, `sources/article.ts`), solo de los hechos que ya tienen más de una fuente: lo que queda en espera no se lee.

- **Se presenta como `ContrasteBot`**, con un enlace a la explicación pública (`/metodologia#lector`). Un sitio que no quiera que lo leamos lo pone en su robots.txt (`User-agent: ContrasteBot` / `Disallow: /`).
- **Respeta el robots.txt** de cada sitio según el estándar (RFC 9309). Si el robots.txt da un error del sitio, no lee nada de ese sitio.
- **No lee notas pagas:** si la página se declara de acceso pago (`isAccessibleForFree: false` en sus datos estructurados), usa solo el resumen del feed. Tampoco usa las páginas marcadas `noai`.
- **Respeta lo que el sitio le prohíbe a la IA del redactor.** En el plan gratis, Google usa lo que recibe Gemini para entrenar sus modelos. Si un sitio se lo prohíbe en su robots.txt (`User-agent: Google-Extended`), el redactor no recibe el texto completo de sus notas, solo el resumen del feed. Hoy pasa con BBC Mundo y DW. Con el plan pago de Gemini (`CONTRASTE_GEMINI_PLAN=pago`), Google no usa los datos y esto no aplica.
- **Lee despacio:** un pedido cada 2 segundos por sitio, con límite de tiempo (15 s) y de tamaño (3 MB).
- **Toma solo el texto de la nota:** el cuerpo que la página declara en sus datos estructurados o, si no hay, los párrafos de `<article>`, sin epígrafes ni recomendados. Hasta 8.000 caracteres por fuente.
- **No guarda el texto ajeno:** se usa para verificar y redactar, y no entra en la base, ni en los informes, ni en la memoria entre corridas. Tampoco el texto completo que traen algunos feeds.
- Las fuentes de prueba no se leen.

Con el texto completo se vuelve a verificar: si una nota resulta ser un cable de agencia ("BUENOS AIRES (NA).-") o atribuye la información a otro medio ("según informó…"), cuenta como esa agencia o ese medio, y un hecho que parecía tener dos fuentes puede quedar con una sola y en espera.

**Base legal.** La ley de propiedad intelectual (11.723) protege la forma en que está escrita una nota, no los hechos (art. 1), y permite usar las noticias de interés general citando la fuente (art. 28). Por eso el redactor escribe una nota propia, no copia frases y atribuye cada dato a su fuente en el texto. Las condiciones de uso de cada sitio pueden poner límites adicionales: revisarlas al agregar una fuente.

## Estados de verificación

| Estado | Regla |
| --- | --- |
| `verified` | Dos o más orígenes independientes, sin contradicciones. Confianza alta con tres o más, o con una fuente primaria (organismo, documento, agencia) |
| `partial` | Varias fuentes, pero todas en condicional |
| `disputed` | Cifras que difieren más de un 2% entre fuentes sobre lo mismo. Siempre va a revisión humana |
| `unverified` | Un solo origen. No se redacta: queda en espera de confirmación |
| `developing` | Lo asigna la redacción para hechos en curso |

## Política de revisión

`CONTRASTE_REVIEW_MODE=human` (por defecto): todo borrador pasa por una persona.

`CONTRASTE_REVIEW_MODE=policy`: se publica solo lo que cumple **todas** estas condiciones (configurables en `config/editorial.ts`):
- al menos 2 fuentes independientes y confianza alta,
- sin contradicciones,
- sin cifras ni nombres fuera de las fuentes,
- con sección asignada,
- fuera de las secciones que siempre requieren revisión humana (hoy, Política).

## Redactor con IA

`writers/index.ts` elige el redactor: `CONTRASTE_WRITER=gemini` o `anthropic`. Sin esa variable, usa Gemini si hay `GEMINI_API_KEY` y, si no, Claude si hay `ANTHROPIC_API_KEY`.

Lo común a los dos:

- Instrucciones fijas en `writers/writer.ts`: usar solo el dossier, no copiar frases, no inventar citas, exponer contradicciones sin elegir una versión, separar hechos de interpretación, títulos sin clickbait.
- **Atribución en el texto:** cada dato va atribuido a su fuente por su nombre ("según el INDEC", "informó Infobae"); si hay fuentes oficiales, la nota se apoya en ellas. Una acusación contra una persona identificable va siempre atribuida y, si no está confirmada, en condicional (es lo que pide la jurisprudencia argentina, doctrina "Campillay", para no responder por información de terceros). El control posterior acepta los nombres de las fuentes.
- Salida estructurada (`writers/draft-schema.ts`, Zod): título, bajada, cuerpo en bloques, sección, etiquetas, descripción SEO y afirmaciones con las fuentes que las respaldan. Una respuesta que no cumple el esquema se descarta.
- El borrador registra qué modelo lo escribió (por ejemplo, `gemini:gemini-3.5-flash-lite`).
- Un borrador generado por IA es siempre un borrador: el control posterior y la política de revisión deciden qué pasa después.
- Si la redacción falla por algo temporal (proveedor saturado o sin cupo), el hecho queda en espera y se reintenta en la próxima corrida. Si falla por configuración (clave inválida, pedido bloqueado), va a revisión humana.

### Gemini (por defecto, gratis)

- Clave en [Google AI Studio](https://aistudio.google.com/apikey), guardada como `GEMINI_API_KEY` en `.env.pipeline`. Ese archivo lo lee solo el pipeline: en `.env.local` terminaría dentro del código que se publica en Cloudflare (ver [docs/DESPLIEGUE.md](DESPLIEGUE.md)). El plan gratuito no pide tarjeta y está disponible en Argentina.
- Cadena de modelos (`CONTRASTE_GEMINI_MODELS`): `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3-flash-preview` y, al final, `gemini-3.5-flash-lite` y `gemini-3.1-flash-lite`. Los Flash se saturan seguido (error 503): si uno no responde, pasa al siguiente. Si todos fallan por algo temporal, espera 20 segundos y da una segunda vuelta.
- **Cupo gratis** (AI Studio, *Límite de frecuencia*, octubre de 2026): cada modelo tiene el suyo. Cada Flash permite 5 pedidos por minuto y 20 por día; cada Flash Lite, 15 por minuto y 500 por día. Los cinco Flash suman 100 borradores por día, contra un máximo de 32 del pipeline (8 corridas de 4). Gemma 4 31B tiene más cupo, pero se descartó: con un dossier real no respondió en 2 minutos, y su tope de 16.000 tokens de entrada por minuto deja pasar un solo borrador por minuto.
- Un modelo saturado tarda 20 a 45 segundos en rechazar el pedido. Por eso, el que falla por algo temporal no se vuelve a probar en el resto de la corrida, ningún pedido espera más de 60 segundos y un mismo borrador no prueba modelos durante más de 2 minutos y medio (si se pasa, queda para la próxima corrida). Antes de estos cambios, cada borrador repetía esos intentos y la primera corrida real tardó 10 minutos.
- **Razonamiento** (`CONTRASTE_GEMINI_RAZONAMIENTO`): `bajo` por defecto; también `minimo`, `medio`, `alto` o `automatico` (cada modelo usa el suyo). Medido el 3 de octubre de 2026 con un dossier real de 9 fuentes: `gemini-3.5-flash` tardó 35 segundos con su razonamiento por defecto y 9 con razonamiento bajo, y los dos borradores pasaron igual el control de nombres y cifras. A un modelo que no acepta el nivel se le pide sin él.
- El registro de cada corrida muestra cada pedido, con el modelo, el resultado y lo que tardó (por ejemplo, `gemini-3.8-flash: saturado (28 s)`).
- Los Flash Lite escriben peor (más repeticiones, más errores de criterio) pero casi siempre responden. Sus borradores pasan por los mismos controles.
- Google retira modelos: `gemini-2.5-flash`, por ejemplo, ya no se ofrece a cuentas nuevas (error 404). Un modelo retirado se salta solo; conviene revisar la lista cada tanto.
- **Uso de datos:** en el plan gratuito, Google usa lo enviado para mejorar sus productos y puede revisarlo una persona. El dossier contiene solo texto de fuentes públicas; nunca hay que mandarle datos personales, del newsletter ni material sin publicar de terceros. Por eso tampoco lleva el texto completo de los sitios que se lo prohíben a Google (ver [Lectura del texto completo](#lectura-del-texto-completo)). El plan pago de Gemini no usa los datos para entrenar: al contratarlo, definir `CONTRASTE_GEMINI_PLAN=pago`.

### Claude (pago por uso)

- `CONTRASTE_WRITER=anthropic` y credenciales de Anthropic (`ANTHROPIC_API_KEY` o `ant auth login`).
- Modelo: `claude-opus-5-5` por defecto (`CONTRASTE_ANTHROPIC_MODEL`), con razonamiento adaptativo y esfuerzo `high` (`CONTRASTE_ANTHROPIC_EFFORT`).
- Fallbacks del lado del servidor activados (`fallbacks: "default"`): si el modelo declina una solicitud, la API la reintenta con otro modelo. Se puede quitar en `writers/anthropic.ts`.

## Fuentes

Están en `src/config/sources.ts`. De cada una se lee su feed (título, resumen, dirección y fecha de cada nota) y, solo de los hechos que se van a redactar, la nota completa.

| Fuente | Tipo | Estado |
| --- | --- | --- |
| Clarín, La Nación, Infobae, Página/12, Perfil, elDiarioAR, Ámbito, El Cronista | Medios nacionales | Activas. De Clarín, Página/12, Perfil y Ámbito se leen también feeds de secciones, porque el principal trae pocas notas |
| Noticias Argentinas | Agencia | Activa. Un medio que publica su cable cuenta como NA |
| Gobierno nacional (argentina.gob.ar) | Oficial | Activa |
| Noticias ONU | Oficial | Activa |
| BBC Mundo, DW | Internacionales en castellano | Activas. Con Gemini gratis, el redactor recibe solo su resumen (ver [Lectura del texto completo](#lectura-del-texto-completo)) |
| Boletín Oficial, INDEC, BCRA | Oficiales | Deshabilitadas: no publican feeds. Hace falta un conector que lea su página de novedades |

Todas se probaron el 2 de octubre de 2026 desde GitHub Actions. Perfil marca algunas notas como pagas: de esas se usa solo el resumen.

### Probar las fuentes

```bash
npm run fuentes:probar                  # todas
npm run fuentes:probar -- clarin bcra   # solo esas
npm run fuentes:probar -- --descubrir   # además, los otros feeds de cada sitio
```

Para cada fuente, descarga el feed y cuenta las notas, y lee la más nueva como lo hace el pipeline. También avisa qué permite el robots.txt del sitio. Si un feed no anda, busca en la portada los feeds que declara el sitio, prueba direcciones habituales y sugiere uno que funcione, siempre del mismo sitio. Termina con error si falla una fuente habilitada.

En GitHub corre en el flujo **Probar las fuentes** (`.github/workflows/probar-fuentes.yml`), que tiene salida a internet. Corre en estos casos:

- En cada pull request que toca las fuentes o el pipeline. Ahí lista los otros feeds de cada sitio y ensaya el pipeline sin redactar ni guardar.
- Los lunes, para enterarse si un medio cambió la dirección de su feed.
- A mano, desde la pestaña Actions.

El resultado queda en el resumen de la corrida.

### Agregar una fuente

1. Revisar las condiciones de uso del medio. Usar un feed para detectar y contrastar hechos no habilita a reproducir su texto; el redactor escribe una nota original y cita la fuente.
2. Agregarla en `config/sources.ts` con `connector: 'rss'`, la URL del feed, la portada (`site`) y `enabled: true`. Si el feed principal trae pocas notas, sumar los de sus secciones en `extraFeeds` (`npm run fuentes:probar -- --descubrir` los lista).
3. Asignar `origin`: dos medios que publican el mismo cable comparten origen. Si otros medios la citan con otro nombre ("NA", "LA NACION"), sumarlo en `aliases`, con sus mayúsculas: así una nota que dice "según informó Clarín" cuenta como Clarín. Las agencias más reproducidas (Noticias Argentinas, EFE, AFP, Reuters, AP y otras) ya están en `wireAgencies`.
4. Marcar los agregadores (por ejemplo, feeds de búsqueda de noticias) con `discoveryOnly: true`: sirven para detectar temas, nunca cuentan como fuente.
5. Probarla con `npm run fuentes:probar -- <id>` o abriendo un pull request.
6. Para fuentes sin feed o APIs de noticias, implementar `SourceConnector` (`sources/connector.ts`) y sumarlo en `connectorsFor()`.

## Corrida programada

El flujo **Pipeline de noticias** (`.github/workflows/pipeline.yml`) corre `npm run pipeline -- --write --save` cada 2 horas, de 8 a 22 (hora de Buenos Aires): 8 corridas por día. Los borradores quedan en la base, en revisión, y aparecen en la mesa de redacción. Con `CONTRASTE_REVIEW_MODE=policy`, lo que cumple la política se publica solo.

**Activarlo** (en GitHub, *Settings > Secrets and variables > Actions*):

1. Secreto `GEMINI_API_KEY`: la clave de Google AI Studio.
2. Secreto `SUPABASE_SECRET_KEY`: la clave secreta `pipeline` de Supabase (`sb_secret_…`, ver [BASE-DE-DATOS.md](BASE-DE-DATOS.md#el-pipeline)). La dirección de la base sale de `.env.production`.
3. Comprobar las claves: pestaña Actions > Pipeline de noticias > Run workflow, marcando "Solo comprobar las claves". Dice si cada secreto está cargado y funciona, sin redactar ni guardar nada. Si una clave quedó cargada como variable en vez de secreto, avisa.
4. Probarlo una vez a mano: lo mismo, sin marcar la opción. Revisar la salida y los borradores en la mesa.
5. Variable `CONTRASTE_PIPELINE_ACTIVO` con el valor `true`. Para pausarlo, cambiarla a `false`.

Variables opcionales:

| Variable | Qué hace | Si no se define |
| --- | --- | --- |
| `CONTRASTE_MAX_BORRADORES_POR_CORRIDA` | Máximo de borradores por corrida | 4 |
| `CONTRASTE_MINUTOS_POR_CORRIDA` | Pasados esos minutos desde el inicio, no se empieza otro borrador: lo que falta queda para la próxima | 4 |
| `CONTRASTE_REVIEW_MODE` | `policy` publica solo lo que cumple la política | `human`: todo pasa por la mesa |
| `CONTRASTE_GEMINI_PLAN` | `pago` al contratar el plan pago de Gemini | Plan gratis |
| `CONTRASTE_GEMINI_RAZONAMIENTO` | Cuánto razona Gemini antes de escribir: `minimo`, `bajo`, `medio`, `alto` o `automatico` | `bajo` |

**Una corrida a la vez:** si una se demora, la siguiente espera. Dos corridas simultáneas podrían redactar el mismo hecho.

**Memoria:** el flujo guarda la memoria entre corridas en la caché de GitHub Actions. Si la caché se pierde (GitHub borra lo que no se usa en 7 días), la corrida siguiente empieza sin memoria y sigue normalmente.

**Cuándo falla.** La corrida termina con error, y GitHub avisa por email, en estos casos:

- no respondió ninguna fuente;
- el redactor falló por algo que no se arregla solo (por ejemplo, una clave inválida) y no salió ningún borrador;
- un borrador no se pudo guardar.

Que Gemini se quede sin cupo no es un error: pasa en el plan gratis, y el hecho se redacta en la próxima corrida. Que bloquee el pedido de una nota tampoco, si salieron otros borradores: esa nota queda en la mesa para revisar.

**Cupo de minutos:** unos 3 minutos facturados por corrida (ver [DESPLIEGUE.md](DESPLIEGUE.md#cuánto-se-puede-publicar)). Para que una corrida lenta no se coma el cupo, pasados `CONTRASTE_MINUTOS_POR_CORRIDA` (4) no se empieza otro borrador, y el trabajo se corta a los 10 minutos aunque algo se cuelgue. Antes de activar las corridas automáticas, conviene mirar la duración de dos o tres corridas a mano en la pestaña Actions.

## Distribución

El sitio es estático: una nota aprobada aparece cuando el sitio se rearma (lo dispara la aprobación, con un tope diario; ver [DESPLIEGUE.md](DESPLIEGUE.md#publicación-automática)). El RSS (`/rss.xml`) y los sitemaps se regeneran en ese mismo armado. El envío del newsletter y la publicación en redes no están implementados: requieren elegir proveedor y tener credenciales.

## Límites conocidos

- Los hechos se agrupan por las palabras de sus títulos y resúmenes. Dos medios que titulan el mismo hecho con palabras muy distintas quedan como dos hechos de una sola fuente, y ninguno se redacta. En el ensayo del 2 de octubre de 2026, de 444 notas salieron 10 hechos con más de una fuente.
- Los documentos oficiales se titulan distinto que los medios ("Resolución 123/2026" frente a "El Gobierno subió las tarifas"), así que rara vez se agrupan con ellos. Hoy el redactor recibe fuentes oficiales sobre todo cuando el organismo publicó un comunicado sobre el mismo hecho.

- La extracción de cifras y nombres es por reglas: es determinista y auditable, pero puede no ver una cifra escrita en palabras ("dos años") o un nombre de una sola palabra. Por eso es una red de seguridad, no un reemplazo de la revisión humana.
- La detección de notas que repiten a otro medio busca expresiones de atribución ("según informó", "Fuente:", la firma "(EFE)") seguidas del nombre del medio, con sus mayúsculas. No ve una atribución escrita de otra forma, y un medio cuyo nombre no está configurado ni en la lista de agencias no se reconoce.
- Las contradicciones se detectan sobre el título y el resumen del feed, no sobre la nota completa: en un texto largo, dos cifras con la misma unidad suelen hablar de cosas distintas. En las cifras de tiempo (años, meses, días, horas) también tiene que coincidir la palabra anterior: "a los 96 años" (una edad) y "durante 22 años" (una duración) no se comparan.
- La detección de contradicciones compara cifras con la misma unidad y contexto compartido. No detecta contradicciones de hechos sin números (por ejemplo, "aprobó" frente a "rechazó"); ese caso puede cubrirse con un extractor de afirmaciones basado en un modelo, detrás de la misma interfaz.
