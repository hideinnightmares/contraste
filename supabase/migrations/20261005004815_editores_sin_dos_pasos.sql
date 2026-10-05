-- Excepción a la verificación en dos pasos, editor por editor. Un editor con `sin_dos_pasos`
-- entra a la mesa con la contraseña sola (sesión `aal1`): su cuenta queda protegida solo por la
-- contraseña. Ver docs/MESA-DE-REDACCION.md, "Verificación en dos pasos".
--
-- La marca solo se cambia desde el panel o con SQL: los usuarios logueados pueden leer su propia
-- fila de `editors` (para que la mesa sepa si pedir el código) pero no tienen permiso para
-- escribir en la tabla, así que nadie se puede eximir a sí mismo, ni siquiera con la contraseña
-- de un editor.

alter table public.editors
  add column sin_dos_pasos boolean not null default false;

comment on column public.editors.sin_dos_pasos is
  'Entra a la mesa con la contraseña sola, sin el código de la app de autenticación. Excepción explícita: la cuenta queda protegida solo por la contraseña.';

-- Las reglas restrictivas de la migración 20261002211500 pasan a aceptar, además del segundo
-- paso, a un editor eximido. La consulta a `editors` corre con los permisos de quien pregunta:
-- solo ve su propia fila.
alter policy articles_exige_dos_pasos on public.articles
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    or exists (select 1 from public.editors e where e.user_id = (select auth.uid()) and e.sin_dos_pasos)
  )
  with check (
    (select auth.jwt() ->> 'aal') = 'aal2'
    or exists (select 1 from public.editors e where e.user_id = (select auth.uid()) and e.sin_dos_pasos)
  );

alter policy article_events_exige_dos_pasos on public.article_events
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    or exists (select 1 from public.editors e where e.user_id = (select auth.uid()) and e.sin_dos_pasos)
  );

alter policy pipeline_runs_exige_dos_pasos on public.pipeline_runs
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    or exists (select 1 from public.editors e where e.user_id = (select auth.uid()) and e.sin_dos_pasos)
  );
