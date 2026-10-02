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

Llega hasta la verificación con las fuentes habilitadas en `src/config/sources.ts` (hoy, ítems de prueba ficticios) y guarda un informe en `.data/pipeline/informes/`.

```bash
npm run pipeline -- --write --save
```

Además redacta con IA y guarda. Con `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.pipeline`, guarda las notas y el informe de la corrida en la base de datos (ver [BASE-DE-DATOS.md](BASE-DE-DATOS.md)); sin ellas, en `.data/pipeline/publicadas/` o `.data/pipeline/revision/`. Requiere `GEMINI_API_KEY` en `.env.pipeline` (gratis, ver [Redactor con IA](#redactor-con-ia)). Sin `--save`, los borradores quedan solo en el informe.

Las notas armadas con fuentes de prueba quedan marcadas como demostración (`isDemo`) y **no se guardan en la base** salvo que se agregue `--permitir-demo`. El esquema de las notas rechaza una nota real que cite una fuente de prueba.

**Sin duplicados entre corridas.** Antes de redactar, el pipeline lee de la base qué fuentes citan las notas de los últimos 7 días, en cualquier estado. Un hecho que comparte alguna fuente con una nota existente queda como `already_covered` y no se redacta de nuevo (tampoco gasta cupo de Gemini). Los slugs ya usados tampoco se repiten.

Para correrlo de forma periódica, la opción gratis prevista es un flujo programado de GitHub Actions cada 2 horas: entra en los minutos gratis junto con las publicaciones (ver el presupuesto en [DESPLIEGUE.md](DESPLIEGUE.md#cuánto-se-puede-publicar)). Todavía no está creado, porque el pipeline necesita una base de datos donde guardar lo que produce. El pipeline es idempotente respecto de los slugs si se le pasan los ya usados (`takenSlugs`).

## Etapas

| Etapa | Archivo | Qué hace |
| --- | --- | --- |
| Fuentes | `config/sources.ts`, `sources/` | Conectores RSS/Atom (real, con límite de tiempo y tamaño) y de prueba. Cada fuente declara tipo y origen editorial |
| Recopilación | `run.ts` | Corre los conectores en paralelo. Una fuente que falla queda registrada y no frena al resto |
| Deduplicación | `stages/dedupe.ts` | Agrupa ítems del mismo hecho por URL canónica o superposición de raíces del título dentro de 36 horas |
| Investigación | `stages/research.ts` | Arma el dossier para el redactor. Punto de extensión: `ArticleFetcher` para traer el texto completo y buscar fuentes primarias |
| Verificación | `stages/verify.ts`, `stages/figures.ts` | Cuenta fuentes independientes (excluye agregadores y detecta réplicas por similitud de texto), extrae cifras en formato argentino y detecta contradicciones entre fuentes, marca el lenguaje condicional |
| Clasificación | `stages/classify.ts` | Asigna sección por palabras clave de `config/categories.ts` |
| Redacción | `writers/` | Gemini (o Claude) escribe un borrador original solo con la información del dossier, con salida estructurada validada. En el dossier las fuentes se llaman F1, F2…; al volver, las citas se traducen a los ids reales (`resolveSourceIds`) |
| Control | `stages/grounding.ts` | Rechaza borradores con cifras o nombres propios que no estén en las fuentes, o que den un mismo dato como confirmado y no confirmado |
| Revisión | `stages/review.ts` | Decide: publicación automática, revisión humana o espera |
| Publicación y SEO | `stages/publish.ts`, `storage/supabase.ts` | Convierte el borrador en una nota válida (slug único, metadatos, fuentes, verificación) y la guarda en la base. Si el guardado falla, el hecho queda como `save_failed` (no se confunde con una falla del redactor) |

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
- Salida estructurada (`writers/draft-schema.ts`, Zod): título, bajada, cuerpo en bloques, sección, etiquetas, descripción SEO y afirmaciones con las fuentes que las respaldan. Una respuesta que no cumple el esquema se descarta.
- El borrador registra qué modelo lo escribió (por ejemplo, `gemini:gemini-3.5-flash-lite`).
- Un borrador generado por IA es siempre un borrador: el control posterior y la política de revisión deciden qué pasa después.
- Si la redacción falla por algo temporal (proveedor saturado o sin cupo), el hecho queda en espera y se reintenta en la próxima corrida. Si falla por configuración (clave inválida, pedido bloqueado), va a revisión humana.

### Gemini (por defecto, gratis)

- Clave en [Google AI Studio](https://aistudio.google.com/apikey), guardada como `GEMINI_API_KEY` en `.env.pipeline`. Ese archivo lo lee solo el pipeline: en `.env.local` terminaría dentro del código que se publica en Cloudflare (ver [docs/DESPLIEGUE.md](DESPLIEGUE.md)). El plan gratuito no pide tarjeta y está disponible en Argentina.
- Cadena de modelos (`CONTRASTE_GEMINI_MODELS`): `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.5-flash` y, al final, `gemini-3.5-flash-lite`. El cupo gratuito es por modelo y los Flash se saturan seguido (error 503): si uno no responde, pasa al siguiente. Si todos fallan por algo temporal, espera 20 segundos y da una segunda vuelta.
- Los Flash Lite escriben peor (más repeticiones, más errores de criterio) pero casi siempre responden. Sus borradores pasan por los mismos controles.
- Google retira modelos: `gemini-2.5-flash`, por ejemplo, ya no se ofrece a cuentas nuevas (error 404). Un modelo retirado se salta solo; conviene revisar la lista cada tanto.
- **Uso de datos:** en el plan gratuito, Google usa lo enviado para mejorar sus productos y puede revisarlo una persona. El dossier contiene solo texto de fuentes públicas; nunca hay que mandarle datos personales, del newsletter ni material sin publicar de terceros. El plan pago de Gemini no usa los datos para entrenar.

### Claude (pago por uso)

- `CONTRASTE_WRITER=anthropic` y credenciales de Anthropic (`ANTHROPIC_API_KEY` o `ant auth login`).
- Modelo: `claude-opus-5-5` por defecto (`CONTRASTE_ANTHROPIC_MODEL`), con razonamiento adaptativo y esfuerzo `high` (`CONTRASTE_ANTHROPIC_EFFORT`).
- Fallbacks del lado del servidor activados (`fallbacks: "default"`): si el modelo declina una solicitud, la API la reintenta con otro modelo. Se puede quitar en `writers/anthropic.ts`.

## Conectar fuentes reales

1. Revisar las condiciones de uso de cada medio. Usar un feed para detectar y contrastar hechos no habilita a reproducir su texto; el redactor escribe una nota original y cita la fuente.
2. Agregar la fuente en `config/sources.ts` con `connector: 'rss'`, su URL y `enabled: true`.
3. Asignar `origin`: dos medios que publican el mismo cable comparten origen.
4. Marcar los agregadores (por ejemplo, feeds de búsqueda de noticias) con `discoveryOnly: true`: sirven para detectar temas, nunca cuentan como fuente.
5. Para APIs de noticias, implementar `SourceConnector` (`sources/connector.ts`) y sumarlo en `connectorsFor()`.

## Distribución

El sitio es estático: una nota aprobada aparece cuando el sitio se rearma (lo dispara la aprobación, con un tope diario; ver [DESPLIEGUE.md](DESPLIEGUE.md#publicación-automática)). El RSS (`/rss.xml`) y los sitemaps se regeneran en ese mismo armado. El envío del newsletter y la publicación en redes no están implementados: requieren elegir proveedor y tener credenciales.

## Límites conocidos

- La extracción de cifras y nombres es por reglas: es determinista y auditable, pero puede no ver una cifra escrita en palabras ("dos años") o un nombre de una sola palabra. Por eso es una red de seguridad, no un reemplazo de la revisión humana.
- La detección de contradicciones compara cifras con la misma unidad y contexto compartido. No detecta contradicciones de hechos sin números (por ejemplo, "aprobó" frente a "rechazó"); ese caso puede cubrirse con un extractor de afirmaciones basado en un modelo, detrás de la misma interfaz.
