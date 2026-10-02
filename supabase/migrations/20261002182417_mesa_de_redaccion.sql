-- Mesa de redacción: la base valida cada nota, aplica las reglas de publicación y pide el
-- armado del sitio cuando cambia algo visible. Ver docs/BASE-DE-DATOS.md.

create extension if not exists pg_jsonschema with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ─── 1. Formato de la nota ──────────────────────────────────────────────────
-- JSON Schema generado de src/domain/schema.ts (scripts/esquema-nota.ts → supabase/esquema-nota.json).
-- Si cambia el esquema de la aplicación, una migración nueva reemplaza esta restricción; el test
-- tests/unit/esquema-nota.test.ts avisa cuando quedó desactualizada.
alter table public.articles add constraint articles_documento_valido
  check (extensions.jsonb_matches_schema($json${"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"id":{"type":"string","minLength":1},"slug":{"type":"string","pattern":"^[a-z0-9]+(?:-[a-z0-9]+)*$"},"title":{"type":"string","minLength":10,"maxLength":160},"dek":{"type":"string","minLength":20,"maxLength":320},"category":{"type":"string"},"type":{"type":"string","enum":["noticia","analisis","explicador","breve"]},"tags":{"maxItems":8,"type":"array","items":{"type":"string","minLength":2}},"body":{"minItems":1,"type":"array","items":{"oneOf":[{"type":"object","properties":{"type":{"type":"string","const":"p"},"text":{"type":"string","minLength":1}},"required":["type","text"]},{"type":"object","properties":{"type":{"type":"string","const":"h2"},"text":{"type":"string","minLength":1}},"required":["type","text"]},{"type":"object","properties":{"type":{"type":"string","const":"list"},"items":{"minItems":1,"type":"array","items":{"type":"string","minLength":1}},"ordered":{"type":"boolean"}},"required":["type","items"]},{"type":"object","properties":{"type":{"type":"string","const":"facts"},"confirmed":{"type":"array","items":{"type":"string"}},"unconfirmed":{"type":"array","items":{"type":"string"}}},"required":["type","confirmed","unconfirmed"]},{"type":"object","properties":{"type":{"type":"string","const":"note"},"tone":{"type":"string","enum":["disputed","context","update"]},"title":{"type":"string","minLength":1},"text":{"type":"string","minLength":1}},"required":["type","tone","title","text"]}]}},"image":{"anyOf":[{"type":"object","properties":{"src":{"type":"string","format":"starts_with","pattern":"^\\/.*"},"alt":{"type":"string","minLength":10},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"caption":{"type":"string"},"credit":{"type":"object","properties":{"author":{"type":"string","minLength":1},"license":{"type":"string","minLength":1},"licenseUrl":{"anyOf":[{"type":"string","format":"uri"},{"type":"null"}]},"sourceUrl":{"type":"string","format":"uri"}},"required":["author","license","licenseUrl","sourceUrl"]},"illustrative":{"type":"boolean"},"focal":{"type":"object","properties":{"x":{"type":"number","minimum":0,"maximum":100},"y":{"type":"number","minimum":0,"maximum":100}},"required":["x","y"]},"blurDataURL":{"type":"string","format":"starts_with","pattern":"^data:image\\/.*"}},"required":["src","alt","width","height","credit","illustrative"]},{"type":"null"}]},"byline":{"type":"object","properties":{"kind":{"type":"string","enum":["automated_desk","staff"]},"name":{"type":"string","minLength":1}},"required":["kind","name"]},"publishedAt":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"},"updatedAt":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"},"priority":{"anyOf":[{"type":"number","const":1},{"type":"number","const":2},{"type":"number","const":3},{"type":"number","const":4},{"type":"number","const":5}]},"sources":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","minLength":1},"name":{"type":"string","minLength":1},"kind":{"type":"string","enum":["news_agency","international_media","local_media","official","public_document","aggregator","other"]},"url":{"anyOf":[{"type":"string","format":"uri"},{"type":"null"}]},"consultedAt":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"},"contribution":{"type":"string"},"isDemo":{"type":"boolean"}},"required":["id","name","kind","url","consultedAt","isDemo"]}},"verification":{"type":"object","properties":{"status":{"type":"string","enum":["verified","partial","developing","disputed","unverified"]},"confidence":{"type":"string","enum":["high","medium","low"]},"independentSources":{"type":"integer","minimum":0,"maximum":9007199254740991},"checkedAt":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"},"claims":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"text":{"type":"string","minLength":1},"status":{"type":"string","enum":["confirmed","unconfirmed","disputed"]},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["id","text","status","sourceIds"]}},"contradictions":{"type":"array","items":{"type":"object","properties":{"topic":{"type":"string"},"detail":{"type":"string"},"sourceIds":{"type":"array","items":{"type":"string"}}},"required":["topic","detail","sourceIds"]}},"checks":{"type":"object","properties":{"dates":{"type":"string","enum":["passed","flagged","not_applicable"]},"names":{"type":"string","enum":["passed","flagged","not_applicable"]},"figures":{"type":"string","enum":["passed","flagged","not_applicable"]}},"required":["dates","names","figures"]}},"required":["status","confidence","independentSources","checkedAt","claims","contradictions","checks"]},"review":{"type":"object","properties":{"status":{"type":"string","enum":["draft","in_review","approved","rejected","published"]},"approvedBy":{"anyOf":[{"type":"string","enum":["human","policy"]},{"type":"null"}]},"reviewedAt":{"anyOf":[{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"},{"type":"null"}]},"notes":{"type":"string"}},"required":["status","approvedBy","reviewedAt"]},"seo":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"}}},"updates":{"type":"array","items":{"type":"object","properties":{"at":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"},"text":{"type":"string","minLength":1}},"required":["at","text"]}},"live":{"type":"boolean"},"isDemo":{"type":"boolean"}},"required":["id","slug","title","dek","category","type","tags","body","image","byline","publishedAt","updatedAt","priority","sources","verification","review","seo","updates","live","isDemo"]}$json$::json, document));

-- ─── 2. Reglas de publicación ───────────────────────────────────────────────
-- Corre antes que articles_sync_columns (los triggers BEFORE van en orden alfabético), así las
-- columnas derivadas reflejan lo que este trigger pone en el documento.
create function private.articles_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  estado text := new.document -> 'review' ->> 'status';
  estado_anterior text := case when tg_op = 'UPDATE' then old.document -> 'review' ->> 'status' end;
  verificacion text := new.document -> 'verification' ->> 'status';
  editor uuid := (select auth.uid());
  ahora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if tg_op = 'UPDATE' and new.document ->> 'slug' is distinct from old.document ->> 'slug' then
    raise exception 'La dirección de una nota no se cambia: rompería los enlaces que ya circulan.'
      using errcode = 'check_violation';
  end if;

  -- Una nota publicada que cambia su contenido deja constancia pública en el historial.
  if tg_op = 'UPDATE' and estado_anterior = 'published' and estado = 'published'
     and (new.document - 'review' - 'updates' - 'updatedAt') is distinct from (old.document - 'review' - 'updates' - 'updatedAt') then
    if jsonb_array_length(coalesce(new.document -> 'updates', '[]'::jsonb))
       <= jsonb_array_length(coalesce(old.document -> 'updates', '[]'::jsonb)) then
      raise exception 'Una nota publicada solo se corrige agregando una nota de corrección al historial de cambios.'
        using errcode = 'check_violation';
    end if;
    new.document := jsonb_set(new.document, '{updatedAt}', to_jsonb(ahora));
  end if;

  if estado = 'published' then
    if verificacion = 'unverified' then
      raise exception 'Una nota sin verificar no se publica.' using errcode = 'check_violation';
    end if;
    if estado_anterior is distinct from 'published' then
      -- Al publicar, la fecha y quién aprobó los pone el servidor, no el navegador.
      new.document := jsonb_set(jsonb_set(new.document, '{publishedAt}', to_jsonb(ahora)), '{updatedAt}', to_jsonb(ahora));
      if editor is not null then
        new.document := jsonb_set(new.document, '{review}',
          (new.document -> 'review') || jsonb_build_object('approvedBy', 'human', 'reviewedAt', ahora));
      end if;
    end if;
    if verificacion = 'disputed' and new.document -> 'review' ->> 'approvedBy' is distinct from 'human' then
      raise exception 'Una nota con fuentes en disputa solo la publica una persona de la redacción.'
        using errcode = 'check_violation';
    end if;
  elsif estado = 'rejected' and estado_anterior is distinct from 'rejected' and editor is not null then
    new.document := jsonb_set(new.document, '{review}',
      (new.document -> 'review') || jsonb_build_object('approvedBy', null, 'reviewedAt', ahora));
  end if;

  return new;
end;
$$;

revoke all on function private.articles_reglas() from public, anon, authenticated, service_role;

create trigger articles_reglas
  before insert or update on public.articles
  for each row execute function private.articles_reglas();

-- ─── 3. Pedido de armado del sitio ──────────────────────────────────────────
-- Cuando se publica, se despublica o se corrige una nota real, le pide a GitHub que rearme el
-- sitio (repository_dispatch "publicar", .github/workflows/publicar.yml). El token de GitHub vive
-- en Vault (secreto github_dispatch_token), nunca en el navegador ni en el repositorio. pg_net
-- solo manda el pedido si la transacción se confirma.
--
-- SECURITY DEFINER: tiene que leer Vault, que ningún rol de la API puede leer. Vive en el
-- esquema privado (no expuesto) y nadie puede ejecutarlo directamente.
create function private.articles_pedir_armado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  if new.is_demo then
    return null;
  end if;
  if not (new.status = 'published' or (tg_op = 'UPDATE' and old.status = 'published')) then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.status = old.status and new.document = old.document then
    return null;
  end if;

  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_dispatch_token';
  if token is null then
    raise warning 'Falta el secreto github_dispatch_token en Vault: el sitio no se rearmó solo.';
    return null;
  end if;

  perform net.http_post(
    url := 'https://api.github.com/repos/hideinnightmares/contraste/dispatches',
    body := jsonb_build_object('event_type', 'publicar', 'client_payload', jsonb_build_object('slug', new.slug, 'estado', new.status)),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'contraste-supabase',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

revoke all on function private.articles_pedir_armado() from public, anon, authenticated, service_role;

create trigger articles_pedir_armado
  after insert or update on public.articles
  for each row execute function private.articles_pedir_armado();
