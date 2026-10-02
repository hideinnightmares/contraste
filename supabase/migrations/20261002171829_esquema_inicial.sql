-- Esquema inicial de Contraste.
--
-- Una nota se guarda como documento (`document`, el tipo `Article` de src/domain/types.ts,
-- validado con `articleSchema` antes de escribirlo). Las columnas que hacen falta para filtrar
-- y para las reglas de acceso (slug, estado, sección, fechas) se copian del documento con un
-- trigger: el documento es la única fuente de verdad y las columnas no pueden contradecirlo.
--
-- Acceso:
-- - anon y authenticated: leen solo notas publicadas (son públicas). Lo usa el armado del sitio.
-- - editores (tabla `editors`): leen y editan todo desde la mesa de redacción.
-- - service_role (clave secreta del pipeline, en GitHub y en .env.pipeline): escribe borradores
--   e informes. Nunca se usa en el navegador.
-- - Nadie borra notas por la API: una nota descartada pasa a `rejected` y queda en el historial.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ─── Corridas del pipeline ──────────────────────────────────────────────────

create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  collected integer not null check (collected >= 0),
  clusters integer not null check (clusters >= 0),
  report jsonb not null check (jsonb_typeof(report) = 'object'),
  created_at timestamptz not null default now(),
  constraint pipeline_runs_fechas check (finished_at >= started_at)
);

comment on table public.pipeline_runs is
  'Informe de cada corrida del pipeline: qué se recopiló, qué se verificó y qué se decidió.';

create index pipeline_runs_started_at_idx on public.pipeline_runs (started_at desc);

-- ─── Notas ──────────────────────────────────────────────────────────────────

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  -- Copiadas del documento por articles_sync_columns (no se escriben a mano).
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null check (status in ('draft', 'in_review', 'approved', 'rejected', 'published')),
  category text not null,
  title text not null check (length(title) > 0),
  published_at timestamptz not null,
  is_demo boolean not null default false,
  -- Origen del borrador.
  pipeline_run_id uuid references public.pipeline_runs (id) on delete set null,
  writer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.articles is
  'Notas de Contraste. `document` es el Article completo; el resto de las columnas se derivan de él.';
comment on column public.articles.writer is 'Modelo que redactó el borrador, por ejemplo gemini:gemini-3.5-flash.';

-- Lo que lee el armado del sitio: publicadas, de la más nueva a la más vieja.
create index articles_publicadas_idx on public.articles (published_at desc) where status = 'published';
-- Lo que lista la mesa de redacción: por estado, lo último tocado primero.
create index articles_estado_idx on public.articles (status, updated_at desc);
create index articles_pipeline_run_id_idx on public.articles (pipeline_run_id);

create function private.articles_sync_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.slug := new.document ->> 'slug';
  new.status := new.document -> 'review' ->> 'status';
  new.category := new.document ->> 'category';
  new.title := new.document ->> 'title';
  new.published_at := (new.document ->> 'publishedAt')::timestamptz;
  new.is_demo := coalesce((new.document ->> 'isDemo')::boolean, false);
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.articles_sync_columns() from public, anon, authenticated, service_role;

create trigger articles_sync_columns
  before insert or update on public.articles
  for each row execute function private.articles_sync_columns();

-- ─── Historial de cambios de estado ─────────────────────────────────────────

create table public.article_events (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles (id) on delete cascade,
  at timestamptz not null default now(),
  -- Persona de la redacción que hizo el cambio; null cuando fue el pipeline.
  actor_id uuid references auth.users (id) on delete set null,
  from_status text,
  to_status text not null
);

comment on table public.article_events is
  'Quién cambió el estado de cada nota y cuándo. Lo escribe un trigger; nadie lo edita.';

create index article_events_article_id_idx on public.article_events (article_id, at desc);
create index article_events_actor_id_idx on public.article_events (actor_id);

-- SECURITY DEFINER: tiene que poder registrar el cambio aunque quien edita no pueda escribir en
-- el historial. Solo inserta una fila derivada de la nota modificada; vive en el esquema privado
-- (no expuesto por la API) y nadie puede ejecutarla directamente.
create function private.articles_log_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.article_events (article_id, actor_id, from_status, to_status)
    values (new.id, (select auth.uid()), case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return null;
end;
$$;

revoke all on function private.articles_log_status() from public, anon, authenticated, service_role;

create trigger articles_log_status
  after insert or update on public.articles
  for each row execute function private.articles_log_status();

-- ─── Redacción ──────────────────────────────────────────────────────────────

create table public.editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.editors is
  'Quién puede usar la mesa de redacción. Se agrega a mano (SQL o panel), nunca desde la API.';

-- ─── Seguridad ──────────────────────────────────────────────────────────────

alter table public.pipeline_runs enable row level security;
alter table public.articles enable row level security;
alter table public.article_events enable row level security;
alter table public.editors enable row level security;

-- Los permisos por defecto de este proyecto les dan TRUNCATE, TRIGGER, REFERENCES y MAINTAIN
-- a anon y authenticated en las tablas nuevas. No los necesitan: se quitan y se otorga lo justo.
revoke all on public.pipeline_runs, public.articles, public.article_events, public.editors
  from anon, authenticated, service_role;

grant select on public.articles to anon, authenticated;
grant insert, update on public.articles to authenticated;
grant select on public.article_events, public.pipeline_runs, public.editors to authenticated;

-- Pipeline (clave secreta): escribe borradores e informes. No borra.
grant select, insert, update on public.articles, public.pipeline_runs to service_role;
grant select on public.article_events, public.editors to service_role;

-- Cualquiera lee las notas publicadas (ya son públicas en el sitio).
create policy articles_lectura_publica on public.articles
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());

-- La redacción ve todo, incluidos borradores y descartadas.
create policy articles_lectura_redaccion on public.articles
  for select to authenticated
  using (exists (select 1 from public.editors e where e.user_id = (select auth.uid())));

create policy articles_alta_redaccion on public.articles
  for insert to authenticated
  with check (exists (select 1 from public.editors e where e.user_id = (select auth.uid())));

create policy articles_edicion_redaccion on public.articles
  for update to authenticated
  using (exists (select 1 from public.editors e where e.user_id = (select auth.uid())))
  with check (exists (select 1 from public.editors e where e.user_id = (select auth.uid())));

create policy pipeline_runs_lectura_redaccion on public.pipeline_runs
  for select to authenticated
  using (exists (select 1 from public.editors e where e.user_id = (select auth.uid())));

create policy article_events_lectura_redaccion on public.article_events
  for select to authenticated
  using (exists (select 1 from public.editors e where e.user_id = (select auth.uid())));

-- Cada persona ve solo su propia fila: alcanza para saber si es editora.
create policy editors_lectura_propia on public.editors
  for select to authenticated
  using (user_id = (select auth.uid()));
