create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  e_number text not null,
  did text,
  verification_id text not null unique,
  country text,
  id_type text,
  verified_at timestamp with time zone,
  aml_clear boolean,
  credential_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint kyc_verifications_e_number_not_blank check (length(trim(e_number)) > 0),
  constraint kyc_verifications_verification_id_not_blank check (length(trim(verification_id)) > 0)
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

drop trigger if exists update_kyc_verifications_updated_at on public.kyc_verifications;
create trigger update_kyc_verifications_updated_at
before update on public.kyc_verifications
for each row
execute function public.update_updated_at_column();
