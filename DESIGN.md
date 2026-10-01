---
name: Contraste
description: Diario digital con verificación de fuentes. Blanco, negro y un solo color (amarillo resaltador), fotos en blanco y negro de alto contraste y titulares condensados y pesados.

colors:
  paper: "#ffffff"
  ink: "#0a0a0a"
  ink-2: "#3d3d3d"
  ink-3: "#696969"
  mist: "#f2f2f2"
  rule: "#dcdcdc"
  highlight: "#ffd60a"
  on-highlight: "#0a0a0a"
  verified: "#0f6a41"
  disputed: "#8a4f00"
  dark-paper: "#0b0b0b"
  dark-ink: "#f4f4f1"

typography:
  display:
    fontFamily: Archivo (wdth 70)
    fontWeight: 800
    lineHeight: 0.92-0.98
    letterSpacing: -0.02em
  headline-small:
    fontFamily: Archivo (wdth 88)
    fontWeight: 700
    lineHeight: 1.18
  body:
    fontFamily: Newsreader
    fontSize: 18-20px
    lineHeight: 1.66
  ui:
    fontFamily: Archivo
    fontWeight: 600-700
    fontSize: 13-15px

rounded:
  none: 0px
  round: 999px

---

## Idea

"Contrastar" es comparar una fuente con otra. La identidad lo lleva al extremo: blanco y negro, fotos en blanco y negro de alto contraste, y un único color, el amarillo del resaltador con el que alguien marca lo que verificó. Al pasar el puntero (o enfocar con teclado) una nota, su foto recupera el color y el titular se subraya en amarillo.

La colección de referencia está en `design-md/`. Este sistema toma de Wired (`design-md/wired`) la geometría recta, los filetes y el pie negro, y de The Verge (`design-md/theverge`) la tipografía condensada y pesada y la línea de tiempo en panel oscuro.

## Color

- **Papel y tinta** (`paper`, `ink`): todo el sitio. Tinta casi negra, no `#000`.
- **Resaltador** (`highlight`): etiqueta de sección en notas grandes, subrayado al pasar, sección actual en la navegación, horarios de "Último momento", bandas de "En breve" y newsletter. Siempre con tinta negra encima, o como texto sobre negro.
- **Estados** (`verified`, `disputed`): solo en el panel de fuentes de la nota abierta, con texto e ícono. En las tarjetas el medidor de fuentes es monocromo.
- **Bloques**: negro (`.invert`) para "Último momento", "Análisis y contexto" y el pie; amarillo (`.highlight-band`) para "En breve" y el newsletter. Cada bloque redefine los tokens, así sus componentes no cambian.
- Contrastes verificados con `npm run check:contrast` en claro, oscuro, negro y amarillo.

## Tipografía

- **Archivo** con eje de ancho: condensada (`wdth 70`) y en peso 800 para titulares grandes; `wdth 88` en peso 700 para titulares chicos; ancho normal para interfaz.
- **Newsreader** para bajadas y texto de lectura.
- Análisis: titular completo en cursiva. Sin mayúsculas sostenidas en etiquetas.

## Forma y profundidad

- Todo rectángulo a 0 px. Redondos solo los botones de un único ícono y los puntos de estado.
- Sin sombras: filetes de 1 px entre notas, filete de 5 px sobre cada sección, borde de 1 px en diálogos.

## Componentes clave

- **Cabecera**: franja negra (fecha, aviso DEMO, últimas, tema) que se va al bajar y barra fija de una línea con logo, secciones y buscador.
- **Principal**: foto 3:2, etiqueta amarilla, titular de hasta 100 px.
- **Último momento**: panel negro, horarios en amarillo, línea vertical con puntos.
- **Tarjetas**: el titular es el único enlace; el área de clic cubre la tarjeta.
- **Marca Demo**: etiqueta con borde, gris, en cada nota ficticia.

## Movimiento

Una sola animación al cargar (la foto principal se abre desde el centro). Al pasar: color en la foto, subrayado amarillo en el titular, barra amarilla en la navegación. Todo se desactiva con `prefers-reduced-motion`.
