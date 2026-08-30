-- Route analytics counters + view tracking
alter table public.routes add column if not exists view_count integer not null default 0;
alter table public.routes add column if not exists share_count integer not null default 0;
alter table public.routes add column if not exists download_count integer not null default 0;
alter table public.routes add column if not exists start_count integer not null default 0;

create index if not exists routes_analytics_idx on public.routes (view_count desc, share_count desc);

-- Optional: individual route view events (for future unique tracking)
create table if not exists public.route_views (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  viewer_id uuid,
  created_at timestamptz default now()
);
create index if not exists route_views_route_idx on public.route_views(route_id);
alter table public.route_views enable row level security;
drop policy if exists "Route views insert open" on public.route_views;
create policy "Route views insert open" on public.route_views for insert with check (true);
drop policy if exists "Route views select open" on public.route_views;
create policy "Route views select open" on public.route_views for select using (true);
