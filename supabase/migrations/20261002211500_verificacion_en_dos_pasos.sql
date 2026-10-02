-- Verificación en dos pasos para la redacción: para leer o cambiar notas, historial e informes
-- hace falta una sesión que pasó el segundo paso (un código de una app de autenticación), es
-- decir, nivel `aal2`. Ver docs/MESA-DE-REDACCION.md.
--
-- Son reglas restrictivas: se suman a las que ya existen (ser editor, leer solo lo publicado) y
-- ninguna otra regla las puede saltear. Afectan solo a usuarios logueados (`authenticated`):
-- el armado del sitio lee como visitante (`anon`) y el pipeline usa la clave secreta.
--
-- La tabla `editors` queda fuera a propósito: con la contraseña sola (nivel `aal1`) la mesa
-- tiene que poder saber si la persona es editora, para pedirle el segundo paso.

create policy articles_exige_dos_pasos on public.articles
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy article_events_exige_dos_pasos on public.article_events
  as restrictive
  for select
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy pipeline_runs_exige_dos_pasos on public.pipeline_runs
  as restrictive
  for select
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
