# Privacidad y aspectos legales

Este documento resume qué se implementó y qué tiene que revisar un profesional. **No es asesoramiento jurídico.** Las páginas `/privacidad`, `/terminos` y `/cookies` son textos base y lo dicen en un aviso visible.

## Marco considerado (Argentina)

- Ley 25.326 de Protección de los Datos Personales, vigente a octubre de 2026. Hay proyectos de reforma en el Congreso, sin sanción hasta esa fecha: conviene verificar su estado antes de publicar.
- La política de privacidad incluye la leyenda sobre el derecho de acceso gratuito cada seis meses (artículo 14, inciso 3) y la referencia a la Agencia de Acceso a la Información Pública como órgano de control, según la Disposición 10/2008 de la entonces Dirección Nacional de Protección de Datos Personales.

## Puntos a revisar con asesoría

- Datos del responsable (razón social, CUIT, domicilio, email de privacidad): hoy figuran como pendientes.
- Inscripción de la base de suscriptores del newsletter en el Registro Nacional de Bases de Datos, si corresponde.
- Transferencias internacionales a los proveedores de hosting y correo.
- Plazos de conservación de los registros del servidor.
- Si el sitio recibe visitantes de la Unión Europea, el Reino Unido o Suiza: aplicación del RGPD y equivalentes, y la exigencia de Google de una CMP certificada para publicidad personalizada.
- Términos: jurisdicción, limitación de responsabilidad y compatibilidad con la normativa de defensa del consumidor.
- Uso de contenido de terceros por el pipeline: condiciones de cada fuente y derecho de cita.

## Checklist implementado

| Punto | Estado |
| --- | --- |
| Política de privacidad | `/privacidad`, con aviso de texto base |
| Términos y condiciones | `/terminos`, con aviso de texto base |
| Política de cookies | `/cookies`, generada desde la misma configuración que usa el código (`config/privacy.ts`) |
| Tracking | No hay analytics ni píxeles instalados. Los tests e2e verifican que la portada no hace pedidos a otros dominios |
| Consentimiento de cookies | Aviso no bloqueante, "Rechazar" y "Aceptar" con el mismo peso, sin casillas premarcadas, preferencias reabribles desde el pie |
| Consentimiento del formulario | Casilla explícita, propósito explicado junto al campo, validado en servidor |
| Datos mínimos | Newsletter: solo email. El sitio no requiere registro |
| Embeds de terceros | Ninguno. Compartir usa enlaces simples. Fuentes tipográficas autoalojadas. Fotos servidas desde el propio sitio |
| Baja | Enlace de baja en cada envío y página de baja con confirmación |

## Contenido y transparencia

- Las notas DEMO están marcadas en cada tarjeta, en un aviso al comienzo de cada nota, en una franja en todas las páginas y en el pie; no se indexan.
- No hay reseñas, testimonios, cifras de audiencia, premios ni logos de medios. "Más leídas" aclara que su orden es manual mientras no haya medición.
- Las fotos llevan autor, licencia y enlace al original, y se aclara que son ilustrativas.
- La autoría se atribuye a la "Mesa editorial de Contraste" y se explica la asistencia automatizada; no hay periodistas inventados.
