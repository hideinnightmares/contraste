# Mesa de redacción

Está en `/redaccion` (<https://contraste.mateopradal23.workers.dev/redaccion>). Es una página estática más del sitio, pero corre entera en el navegador: habla directo con la base, con la sesión de quien edita. Los buscadores no la indexan, no figura en el mapa del sitio y no tiene publicidad ni aviso de cookies.

## Qué se hace ahí

La lista tiene tres pestañas:

- **Para revisar**: lo que dejó el pipeline (en revisión, aprobadas y borradores).
- **Publicadas**.
- **Descartadas**: no se borra nada; una nota descartada se puede volver a revisar.

Al abrir una nota se editan el título, la bajada, la sección, el formato, los temas, el cuerpo (bloque por bloque) y la descripción para buscadores. Al costado está lo que hay que mirar antes de publicar: el resultado del control automático (verificación, fuentes que no coinciden, nombres o cifras que no pudo confirmar, observaciones del pipeline), las fuentes con su enlace, cada afirmación con sus fuentes y las correcciones ya publicadas.

| Estado de la nota | Acciones |
| --- | --- |
| En revisión | Publicar, guardar cambios, descartar |
| Descartada | Volver a revisión, guardar cambios |
| Publicada | Publicar una corrección, despublicar (pide confirmación) |

Publicar y despublicar piden confirmación, porque cambian lo que ve el público. Si las fuentes no coinciden, la confirmación lo recuerda: el texto tiene que explicar la diferencia sin dar ninguna versión por cierta. Publicar desde la mesa es aprobar como persona de la redacción, que es lo que la base exige para publicar una nota en disputa.

Con cambios sin guardar, la mesa pregunta antes de cerrar o recargar la pestaña, de seguir un enlace (por ejemplo, "Volver a la lista") y de cerrar la sesión. En el teléfono, el resultado del control aparece antes del formulario.

## Qué controla la base

La mesa revisa todo antes de guardar para explicar mejor los errores, pero las reglas las hace cumplir la base (migración `20261002182417_mesa_de_redaccion.sql`), así que valen también para el pipeline y para cualquier acceso por la API:

- **Formato**: cada nota tiene que cumplir el esquema de `supabase/esquema-nota.json`, generado desde `articleSchema` con `npx tsx scripts/esquema-nota.ts`. Un test avisa si quedó desactualizado.
- **La dirección no cambia**: el slug de una nota es fijo.
- **Las correcciones quedan a la vista**: una nota publicada solo se puede cambiar si se agrega una nota de corrección, que se muestra al pie con la fecha.
- **Una nota sin verificar no se publica**. Una nota en la que las fuentes no coinciden solo la puede publicar una persona.
- **Fechas y firma**: al publicar, la base pone la fecha de publicación y registra que la aprobó una persona y cuándo. El historial (`article_events`) guarda quién cambió cada estado.
- **Dos personas editando a la vez**: si alguien guardó la nota mientras otra persona la editaba, la segunda recibe un aviso y tiene que recargarla. Nadie pisa cambios ajenos sin darse cuenta.

## Qué pasa al publicar

Al publicar, despublicar o corregir una nota publicada, la base le pide a GitHub que rearme el sitio (`repository_dispatch` de tipo `publicar`). El cambio aparece en unos minutos. Las notas de demostración no piden armado. Si se llegó al tope diario de armados, sale en el armado de medianoche (ver `docs/DESPLIEGUE.md`).

Mientras el sitio muestre la edición de demostración (sin `CONTENT_SOURCE=database`, ver `docs/BASE-DE-DATOS.md`), lo publicado queda en la base pero no aparece en el sitio. La mesa sabe cómo se armó el sitio y lo dice al confirmar y al publicar.

## Configuración inicial

Se hace una sola vez, desde el panel de Supabase (<https://supabase.com/dashboard/project/xeytiarseubrzrnmyomp>).

1. **Crear el usuario**: *Authentication > Users > Add user > Create new user*, con email y contraseña, y la opción *Auto Confirm User* marcada.
2. **Cerrar el registro**: *Authentication > Sign In / Providers*, desactivar *Allow new users to sign up*. Así nadie puede crearse una cuenta por su cuenta. Igual no vería nada sin estar en la redacción, pero no hay motivo para dejarlo abierto.
3. **Sumarlo a la redacción**, en *SQL Editor*:

   ```sql
   insert into public.editors (user_id)
   select id from auth.users where email = 'el-email-del-editor';
   ```

4. **Permitir que la base pida armados**: en GitHub, *Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token*:
   - *Repository access*: *Only select repositories*, solo `contraste`.
   - *Permissions > Repository permissions > Contents*: *Read and write*. No hace falta nada más.
   - Anotar cuándo vence.

   Después, en Supabase, *Integrations > Vault > Add new secret*: nombre `github_dispatch_token` y, como valor, el token. Queda cifrado en la base y solo lo lee el trigger que pide el armado.

   Sin este secreto la mesa funciona igual, pero lo publicado recién aparece en el armado de medianoche. Cuando el token vence pasa lo mismo: se crea otro y se reemplaza el valor del secreto.

Para sacar a alguien de la redacción: `delete from public.editors where user_id = (select id from auth.users where email = '…');`. Para que no pueda entrar más, también se borra su usuario en *Authentication > Users*.

## La sesión

La sesión de quien edita se guarda en el navegador, en el almacenamiento del dominio del sitio, para no pedir la contraseña en cada pestaña. Cualquier script que corra en ese dominio podría leerla. Hoy el sitio no carga scripts de terceros y la mesa no carga publicidad, pero con AdSense el script de Google correría en el resto de las páginas: antes de activarlo, ver el paso correspondiente en `docs/ADSENSE.md`. En una computadora compartida, cerrar la sesión al terminar.

## Pruebas

`tests/e2e/redaccion.spec.ts` prueba la mesa contra un Supabase simulado (`tests/e2e/supabase-mock.ts`), sin tocar la base real: ingresar, publicar una nota en disputa, corregir una publicada, el aviso cuando otra persona guardó la nota antes y el de cambios sin guardar. Las capturas de `npx playwright test -c playwright.visual.config.ts` incluyen la mesa en claro, oscuro y teléfono.

## Si algo no anda

- **"No forma parte de la redacción"**: falta el paso 3.
- **Se publicó pero no aparece**: en GitHub, pestaña *Actions*, ver si corrió "Publicar". Si no corrió, ver qué respondió GitHub al pedido de la base, en *SQL Editor*:

  ```sql
  select created, status_code, content from net._http_response order by created desc limit 5;
  ```

  204 es que salió bien; 401, que el token es inválido o venció; 403 o 404, que el token no tiene acceso al repositorio o le falta el permiso *Contents*.
