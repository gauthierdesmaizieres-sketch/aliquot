-- Envoi temporaire téléphone vers PC, sans compte. L'identifiant de salle (dans le QR) sert de clé.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
alter table public.rooms enable row level security; -- aucune règle : accès seulement par les fonctions ci-dessous

create function public.room_open(room text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.rooms where id::text = room and expires_at > now()) $$;

create function public.room_accepts(room text) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.room_open(room)
      and (select count(*) from storage.objects o
           where o.bucket_id = 'transfer' and (storage.foldername(o.name))[1] = room) < 200 $$;

create function public.create_room() returns uuid
language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if (select count(*) from public.rooms where expires_at > now()) >= 100 then
    raise exception 'Trop de salles ouvertes';
  end if;
  insert into public.rooms default values returning id into new_id;
  return new_id;
end $$;

create function public.room_files(room uuid)
returns table (name text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$ select o.name, o.created_at from storage.objects o
      where o.bucket_id = 'transfer' and public.room_open(room::text)
        and (storage.foldername(o.name))[1] = room::text
      order by o.created_at $$;

create function public.close_room(room uuid) returns void
language sql security definer set search_path = ''
as $$ delete from public.rooms where id = room $$;

create function public.expired_files() returns setof text
language sql stable security definer set search_path = ''
as $$ select o.name from storage.objects o
      where o.bucket_id = 'transfer' and not public.room_open((storage.foldername(o.name))[1])
      limit 500 $$;

create function public.purge_rooms() returns void
language sql security definer set search_path = ''
as $$ delete from public.rooms where expires_at <= now() $$;

revoke execute on function public.room_open(text), public.room_accepts(text), public.create_room(),
  public.room_files(uuid), public.close_room(uuid), public.expired_files(), public.purge_rooms() from public;
grant execute on function public.room_open(text), public.room_accepts(text), public.create_room(),
  public.room_files(uuid), public.close_room(uuid), public.expired_files(), public.purge_rooms() to anon, authenticated;

-- Bucket public sans règle de lecture : un fichier s'ouvre avec son adresse exacte, mais on ne peut pas lister les salles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('transfer', 'transfer', true, 15000000, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

create policy transfer_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'transfer' and public.room_accepts((storage.foldername(name))[1]));
-- Seuls les fichiers des salles fermées sont visibles, pour pouvoir les effacer.
create policy transfer_sweep_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'transfer' and not public.room_open((storage.foldername(name))[1]));
create policy transfer_sweep_delete on storage.objects for delete to anon, authenticated
  using (bucket_id = 'transfer' and not public.room_open((storage.foldername(name))[1]));
