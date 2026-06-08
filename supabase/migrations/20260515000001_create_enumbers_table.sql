create extension if not exists pgcrypto;

create table if not exists public.enumbers (
  id uuid primary key default gen_random_uuid(),
  e_number text not null unique,
  did text unique,
  did_created_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint enumbers_e_number_not_blank check (length(trim(e_number)) > 0),
  constraint enumbers_did_not_blank check (did is null or length(trim(did)) > 0)
);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_enumbers_updated_at on public.enumbers;

create trigger update_enumbers_updated_at
before update on public.enumbers
for each row
execute function public.update_updated_at_column();
