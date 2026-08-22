-- ═══════════════════════════════════════════════════════════════
-- REVISTA BY VAL — base de datos en Supabase
-- ───────────────────────────────────────────────────────────────
-- Pega TODO esto en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar sin romper nada.
--
-- SEGURO PARA UN PROYECTO COMPARTIDO: todo lo que crea lleva el
-- prefijo "revista", incluidos los nombres de las políticas. Si este
-- proyecto ya tiene otra aplicación (una tienda, una landing), no se
-- le toca ni una tabla ni un permiso.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. El catálogo ────────────────────────────────────────────
-- Una sola fila con todo el contenido. Para un catálogo de una
-- tienda es más simple y más rápido que repartirlo en tablas:
-- se lee de un solo golpe y se guarda de un solo golpe.
create table if not exists public.revista (
  id           text primary key default 'principal',
  config       jsonb not null default '{}'::jsonb,
  productos    jsonb not null default '[]'::jsonb,
  paginas      jsonb not null default '[]'::jsonb,
  actualizado  timestamptz not null default now()
);

insert into public.revista (id) values ('principal')
on conflict (id) do nothing;

-- ── 2. Contador de vistas ─────────────────────────────────────
create table if not exists public.revista_vistas (
  clave  text primary key,          -- 'producto:amapola' o 'pagina:pg04'
  cuenta integer not null default 0
);

-- Las clientas no pueden escribir en la tabla directamente, pero sí
-- llamar a esta función, que solo sabe sumar uno. SECURITY DEFINER
-- hace que corra con permisos de la función, no de quien la llama.
create or replace function public.sumar_vista(p_clave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.revista_vistas (clave, cuenta)
  values (p_clave, 1)
  on conflict (clave) do update set cuenta = revista_vistas.cuenta + 1;
end;
$$;

-- ── 3. Permisos (RLS) ─────────────────────────────────────────
-- Regla: cualquiera LEE la revista (es un catálogo público);
-- solo TÚ puedes modificarla.
--
-- Importante si compartes el proyecto con otra aplicación: no basta con
-- pedir "estar autenticado", porque cualquier cliente registrado en la
-- otra app también lo estaría. Comprobamos el correo concreto.
--
-- ¿Vas a administrar la revista desde otro correo? Agrégalo a esta lista.
create or replace function public.revista_es_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'valeriafzg98@gmail.com',
    'galvissantiago38@gmail.com'
  );
$$;

alter table public.revista        enable row level security;
alter table public.revista_vistas enable row level security;

drop policy if exists "revista: cualquiera lee" on public.revista;
create policy "revista: cualquiera lee"
  on public.revista for select
  to anon, authenticated
  using (true);

drop policy if exists "revista: solo la tienda edita" on public.revista;
create policy "revista: solo la tienda edita"
  on public.revista for update
  to authenticated
  using (public.revista_es_admin())
  with check (public.revista_es_admin());

drop policy if exists "revista: cualquiera lee las vistas" on public.revista_vistas;
create policy "revista: cualquiera lee las vistas"
  on public.revista_vistas for select
  to anon, authenticated
  using (true);

grant execute on function public.sumar_vista(text) to anon, authenticated;

-- ── 4. Fotos ──────────────────────────────────────────────────
-- Las imágenes van a Storage, no a la base: pesan mucho y así el
-- navegador las cachea como cualquier foto.
insert into storage.buckets (id, name, public)
values ('revista-fotos', 'revista-fotos', true)
on conflict (id) do nothing;

-- Ojo: storage.objects es una tabla compartida por TODOS los buckets del
-- proyecto. Por eso cada política lleva el prefijo "revista:" en el nombre
-- y filtra por bucket_id: así no pisa las de otra aplicación que ya exista.
drop policy if exists "revista: cualquiera ve las fotos" on storage.objects;
create policy "revista: cualquiera ve las fotos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'revista-fotos');

drop policy if exists "revista: solo la tienda sube fotos" on storage.objects;
create policy "revista: solo la tienda sube fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'revista-fotos' and public.revista_es_admin());

drop policy if exists "revista: solo la tienda borra fotos" on storage.objects;
create policy "revista: solo la tienda borra fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'revista-fotos' and public.revista_es_admin());

-- ── Listo ─────────────────────────────────────────────────────
-- Comprobación rápida: esto debe devolver una fila.
select id, actualizado from public.revista;
