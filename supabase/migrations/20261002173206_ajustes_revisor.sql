-- Arreglos de los avisos del revisor de Supabase (supabase db advisors) después del esquema inicial.

-- 1. Supabase crea public.rls_auto_enable() al activar "Enable automatic RLS": es la función del
--    event trigger ensure_rls. Queda con EXECUTE para todos y se ve como RPC en la API. Devuelve
--    event_trigger, así que llamarla da error, pero no hay motivo para dejarla abierta: el event
--    trigger no necesita ese permiso para dispararse.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 2. Una sola regla de lectura por rol. Con dos reglas permisivas para authenticated (pública y
--    de redacción), Postgres evalúa las dos en cada fila.
drop policy articles_lectura_publica on public.articles;
drop policy articles_lectura_redaccion on public.articles;

create policy articles_lectura_anon on public.articles
  for select to anon
  using (status = 'published' and published_at <= now());

-- Publicadas para cualquier usuario logueado; todo para la redacción.
create policy articles_lectura_autenticados on public.articles
  for select to authenticated
  using (
    (status = 'published' and published_at <= now())
    or exists (select 1 from public.editors e where e.user_id = (select auth.uid()))
  );
