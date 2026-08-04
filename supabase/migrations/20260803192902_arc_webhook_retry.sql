alter table arc_transmissions
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists retry_count int not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text;

create index if not exists idx_arc_transmissions_retry
  on arc_transmissions (next_retry_at)
  where delivery_status in ('pending', 'retrying');
