# Newsletter

## Qué se pide y qué se guarda

El formulario pide solo el email y un consentimiento explícito (casilla sin marcar por defecto, con enlace a la política de privacidad y explicación del uso). Se guarda:

- email (normalizado en minúsculas),
- estado: `pending`, `confirmed` o `unsubscribed`,
- fecha y versión del texto de consentimiento aceptado,
- hash SHA-256 de los tokens de confirmación y baja (nunca el token en claro).

No se guarda IP, nombre ni ningún otro dato.

## Estado actual: deshabilitado

El sitio es estático (ver `docs/ARQUITECTURA.md`): no tiene servidor donde guardar suscripciones ni desde donde mandar correos. Mientras `newsletter.endpoint` sea `null` (`src/config/newsletter.ts`):

- la portada ofrece el feed RSS en lugar del formulario, para no mostrar algo que no puede funcionar,
- `/newsletter/confirmar` y `/newsletter/baja` explican que el newsletter todavía no existe.

Ya están hechos y probados: la validación del alta (`src/lib/newsletter/schema.ts`), la lógica de suscripción con tokens guardados como hash (`src/lib/newsletter/store.ts`), el límite de pedidos (`src/lib/rate-limit.ts`) y el formulario de la portada (`NewsletterSignup`).

## Flujo previsto

1. El formulario manda el email y el consentimiento al `endpoint`. Ahí se valida (zod), se aplica un límite de pedidos por IP, se descartan bots por el campo trampa y se registra la solicitud como pendiente.
2. Se envía un correo con el enlace de confirmación (vence a las 48 horas) y el de baja.
3. `/newsletter/confirmar?token=…` muestra un botón; al tocarlo se confirma. Los filtros de correo que abren enlaces no confirman por la persona.
4. `/newsletter/baja?token=…` funciona igual para la baja.
5. Las solicitudes nunca confirmadas se eliminan a los 7 días.

La respuesta del alta tiene que ser la misma esté o no suscripto el email, para no revelar quién está en la lista.

## Habilitarlo

1. Elegir proveedor de correo (Resend, Amazon SES, Postmark…) e implementar `Mailer` (`src/lib/newsletter/mailer.ts`), con el encabezado `List-Unsubscribe` (y `List-Unsubscribe-Post` para baja con un clic).
2. Crear el `endpoint`: una función de Cloudflare (Worker con `run_worker_first` para `/api/*` en `wrangler.jsonc`) que use `store.ts` sobre una base de datos (D1 de Cloudflare o la base del sitio), con el límite de pedidos de Cloudflare y la clave del proveedor como secreto (`npx wrangler secret put`).
3. Convertir `/newsletter/confirmar` y `/newsletter/baja` en páginas que lean el token de la dirección y lo manden al `endpoint` con un botón.
4. Poner la dirección en `newsletter.endpoint` y probar el flujo completo de punta a punta.
5. Revisar con asesoría legal la inscripción de la base de suscriptores (ver `PRIVACIDAD-Y-LEGAL.md`).
