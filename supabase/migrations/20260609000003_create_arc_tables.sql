create table if not exists public.casp_registry (
  id uuid primary key default gen_random_uuid(),
  casp_id text not null unique,
  casp_name text not null,
  endpoint_url text not null,
  public_key text not null,
  country text not null,
  fsca_licensed boolean default false,
  active boolean default true,
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.travel_rule_records (
  id uuid primary key default gen_random_uuid(),
  arc_transaction_id text not null unique,
  originator_casp_id text not null,
  beneficiary_casp_id text not null,
  originator_enumber text,
  originator_wallet text not null,
  beneficiary_wallet text not null,
  amount_zar numeric not null,
  payload_hash text not null,
  threshold text not null,
  status text not null default 'sent',
  transmitted_at timestamp with time zone not null,
  received_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint arc_threshold_check check (threshold in ('full', 'reduced')),
  constraint arc_status_check check (status in ('sent', 'received', 'failed'))
);
