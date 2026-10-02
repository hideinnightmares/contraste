# Publicidad con Google AdSense

El sitio está preparado para AdSense pero no tiene ningún ID cargado: no se inventa un ID de editor.

## Posiciones

| Posición | Dónde | Reserva de alto |
| --- | --- | --- |
| `top-banner` | Franja superior, sobre la cabecera | 90 px escritorio / 100 px móvil |
| `home-infeed` | Entre la banda de análisis y las secciones | 250 px |
| `home-sidebar` | Columna lateral de portada, fija al hacer scroll (solo escritorio) | 600 px |
| `article-inline` | Dentro de la nota, después del tercer párrafo (solo notas de 4 párrafos o más) | 280 px |
| `article-sidebar` | Columna lateral de la nota (solo escritorio) | 600 px |
| `section-infeed` | Dentro de listados de sección y tema | 250 px |
| `section-sidebar` | Columna lateral de listados (solo escritorio) | 600 px |

Cada espacio lleva la etiqueta "Publicidad", un fondo distinto al editorial y su alto reservado para no mover el contenido al cargar (CLS). Ninguno está pegado a botones de navegación o de compartir, para evitar clics accidentales.

## Cómo activarlo

1. Solicitar AdSense con el sitio ya publicado, con contenido real y con las páginas de privacidad, términos y contacto completas.
2. Cargar en las variables de entorno el ID de editor (`NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…`) y el ID de cada bloque (`NEXT_PUBLIC_ADSENSE_SLOT_…`). Ver `.env.example`.
3. Con eso:
   - `/ads.txt` responde con la línea `google.com, pub-…, DIRECT, f08c47fec0942fa0` (formato publicado por Google).
   - `<AdSenseLoader>` carga el script oficial después de que la persona decide en el aviso de cookies; si rechazó la publicidad personalizada, se piden anuncios no personalizados.
   - `<AdSlot>` monta el `<ins class="adsbygoogle">` de cada posición.
4. Poner `NEXT_PUBLIC_AD_PLACEHOLDERS=false` para que los espacios sin bloque configurado no muestren el marcador gris.
5. Proteger la sesión de la mesa de redacción. La mesa guarda la sesión de quien edita en el navegador, en el mismo dominio que el sitio, y el script de AdSense correría en las demás páginas de ese dominio. Antes de activarlo, servir la mesa desde un dominio propio (por ejemplo, un subdominio que publique solo `/redaccion`) o dejar de guardar la sesión en el navegador (`src/lib/supabase/browser.ts`), aunque haya que ingresar en cada pestaña. Ver `docs/MESA-DE-REDACCION.md`.

## Consentimiento

Google exige una plataforma de gestión de consentimiento (CMP) certificada e integrada con el TCF de IAB para servir anuncios personalizados a visitantes del Espacio Económico Europeo, el Reino Unido y Suiza. El aviso de cookies propio de este sitio **no** es una CMP certificada. Si el medio recibe tráfico de esas regiones, hay que usar la CMP de Google (Privacidad y mensajería, en la consola de AdSense) u otra certificada, e integrarla con el aviso propio o reemplazarlo.

## Políticas a respetar

- No pedir clics ni ubicar anuncios donde puedan confundirse con contenido o navegación.
- No superar la cantidad de anuncios al contenido editorial de la página.
- Mantener la política de privacidad con el texto requerido sobre cookies de Google y terceros (ya incluido en `/privacidad`).
- Con contenido generado con asistencia de IA, Google evalúa la utilidad y originalidad: la revisión editorial y las fuentes visibles ayudan, la publicación masiva sin revisión puede considerarse abuso de contenido a escala.
