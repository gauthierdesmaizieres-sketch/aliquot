-- À coller une fois dans Supabase > SQL Editor.

-- Liste blanche : seuls ces e-mails voient les données, même si quelqu'un crée un compte.
create table public.team (email text primary key);
alter table public.team enable row level security;

create function public.is_team() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.team where email = lower(auth.jwt()->>'email')) $$;

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null default '',
  status text not null default 'running' check (status in ('running', 'done')),
  poste text not null default '',
  reagents jsonb not null default '[]',
  hazards jsonb not null default '[]',
  extinguisher text not null default '',
  instructions text not null default '',
  responsible text not null default '',
  responsible2 text not null default '',
  night jsonb not null default '[]',
  phone text not null default '',
  end_planned date,
  sds_links text not null default '',
  checked_by text not null default '',
  qr_token uuid not null unique default gen_random_uuid(),
  author text not null default coalesce(auth.jwt()->>'email', ''),
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  reaction_id uuid not null references public.reactions on delete cascade,
  step text not null,
  taken_at timestamptz not null default now(),
  note text not null default '',
  color text not null default '',
  photo_path text,
  tlc jsonb
);
create index on public.entries (reaction_id, taken_at);

alter table public.reactions enable row level security;
alter table public.entries enable row level security;
create policy team_all on public.reactions for all to authenticated using (public.is_team()) with check (public.is_team());
create policy team_all on public.entries for all to authenticated using (public.is_team()) with check (public.is_team());
grant select, insert, update, delete on public.reactions, public.entries to authenticated;

create table public.reagents (
  id uuid primary key default gen_random_uuid(),
  product text not null default '',
  supplier text not null default '',
  ref text not null default '',
  lot text not null default '',
  expiry date,
  location text not null default '',
  note text not null default '',
  photos jsonb not null default '[]',
  coa_path text,
  author text not null default coalesce(auth.jwt()->>'email', ''),
  created_at timestamptz not null default now()
);

-- Profils fournisseurs : mots repères séparés par des virgules.
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  match text not null default '',
  lot_keys text not null default '',
  ref_keys text not null default '',
  expiry_keys text not null default '',
  created_at timestamptz not null default now()
);

alter table public.reagents enable row level security;
alter table public.suppliers enable row level security;
create policy team_all on public.reagents for all to authenticated using (public.is_team()) with check (public.is_team());
create policy team_all on public.suppliers for all to authenticated using (public.is_team()) with check (public.is_team());
grant select, insert, update, delete on public.reagents, public.suppliers to authenticated;

-- Fiche du QR : lisible sans compte, uniquement avec le jeton, et sans titre, réactifs ni photos.
revoke execute on function public.is_team() from public, anon;
grant execute on function public.is_team() to authenticated;

insert into storage.buckets (id, name, public) values ('photos', 'photos', false);
create policy team_photos on storage.objects for all to authenticated
  using (bucket_id = 'photos' and public.is_team())
  with check (bucket_id = 'photos' and public.is_team());

-- Base déjà créée ? Ajouter le poste de paillasse (plan du labo) :
alter table public.reactions add column if not exists poste text not null default '';
alter table public.reagents add column if not exists cas text not null default '';
-- 2e responsable (manager) et tableau de surveillance de nuit :
alter table public.reactions add column if not exists responsible2 text not null default '';
alter table public.reactions add column if not exists night jsonb not null default '[]';

-- Fiche du QR : lisible sans compte, uniquement avec le jeton, et sans titre, réactifs ni photos.
drop function if exists public.public_safety(uuid);
create function public.public_safety(t uuid)
returns table (code text, hazards jsonb, extinguisher text, instructions text, responsible text, responsible2 text,
               night jsonb, phone text, end_planned date, sds_links text, checked_by text)
language sql stable security definer set search_path = ''
as $$ select code, hazards, extinguisher, instructions, responsible, responsible2, night, phone, end_planned, sds_links, checked_by
      from public.reactions where qr_token = t and status = 'running' $$;
revoke execute on function public.public_safety(uuid) from public;
grant execute on function public.public_safety(uuid) to anon, authenticated;

-- Liste des responsables possibles (la table team n'est pas lisible directement).
create or replace function public.team_members() returns setof text
language sql stable security definer set search_path = ''
as $$ select email from public.team where public.is_team() order by email $$;
revoke execute on function public.team_members() from public, anon;
grant execute on function public.team_members() to authenticated;
