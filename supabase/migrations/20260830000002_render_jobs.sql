-- Render jobs for server-side video export (tech-spec-video-render.md §4-5)
create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  status text not null check (status in ('queued','processing','done','failed')) default 'queued',
  params jsonb not null default '{}'::jsonb,
  output_url text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists render_jobs_route_id_idx on public.render_jobs (route_id);
create index if not exists render_jobs_status_idx on public.render_jobs (status);

alter table public.render_jobs enable row level security;
drop policy if exists "Render jobs are viewable by everyone" on public.render_jobs;
create policy "Render jobs are viewable by everyone" on public.render_jobs for select using (true);
drop policy if exists "Authenticated can create render jobs" on public.render_jobs;
create policy "Authenticated can create render jobs" on public.render_jobs for insert with check (true);
drop policy if exists "Service can update render jobs" on public.render_jobs;
create policy "Service can update render jobs" on public.render_jobs for update using (true);

create or replace function public.touch_render_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_render_jobs_updated_at on public.render_jobs;
create trigger trg_render_jobs_updated_at before update on public.render_jobs
for each row execute procedure public.touch_render_jobs_updated_at();
