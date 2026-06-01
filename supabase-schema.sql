-- Lash Brows CMS schema (Supabase)
-- Run this in Supabase SQL Editor.

-- 1) Tables
create table if not exists public.hero_settings (
  id int primary key default 1,
  address text not null default 'P. Usumacinta, multi 80',
  title text not null default 'Resalta tu belleza natural.',
  subtitle text not null default 'Especialistas en extensiones de pestañas y diseño de mirada en el corazón de la ciudad.',
  updated_at timestamptz not null default now(),
  constraint hero_settings_singleton check (id = 1)
);

insert into public.hero_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.promo_settings (
  id int primary key default 1,
  title text not null default 'Efecto Mojado',
  description text not null default 'Extensiones con un acabado brillante y moderno para un look sofisticado y en tendencia.',
  price text not null default '$499',
  image_url text,
  image_alt text not null default 'Promo del mes',
  updated_at timestamptz not null default now(),
  constraint promo_settings_singleton check (id = 1)
);

insert into public.promo_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price text,
  image_url text,
  image_alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_sort_order_idx on public.services (sort_order asc);

create table if not exists public.work_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quote text not null,
  stars int not null default 5,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint testimonials_stars_range check (stars >= 1 and stars <= 5)
);

create index if not exists testimonials_sort_order_idx on public.testimonials (sort_order asc);

create index if not exists work_photos_sort_order_idx on public.work_photos (sort_order asc);

-- 2) Updated_at trigger for services
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

-- 3) Storage bucket (images)
-- NOTE: This inserts into storage metadata. If you prefer, create the bucket in the Supabase UI instead.
insert into storage.buckets (id, name, public)
values ('lash-brows', 'lash-brows', true)
on conflict (id) do nothing;

-- 4) Public read policy for storage objects in this bucket
-- (Uploads will be done server-side with SERVICE_ROLE key, which bypasses RLS.)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read lash-brows'
  ) then
    create policy "Public read lash-brows"
    on storage.objects
    for select
    to public
    using (bucket_id = 'lash-brows');
  end if;
end
$$;
