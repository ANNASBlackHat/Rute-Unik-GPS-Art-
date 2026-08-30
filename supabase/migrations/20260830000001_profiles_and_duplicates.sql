-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'runner' check (role in ('runner', 'admin')),
  created_at timestamptz default now()
);

-- RLS on profiles
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone."
  on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile."
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile."
  on public.profiles for update using (auth.uid() = id);

-- Trigger for auth.users -> public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'runner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS on routes if needed, but allow public read
alter table public.routes enable row level security;

drop policy if exists "Routes are viewable by everyone" on public.routes;
create policy "Routes are viewable by everyone"
  on public.routes for select using (true);

drop policy if exists "Authenticated users can insert routes" on public.routes;
create policy "Authenticated users can insert routes"
  on public.routes for insert with check (auth.role() = 'authenticated');

drop policy if exists "Users can update their own pending routes" on public.routes;
create policy "Users can update their own pending routes"
  on public.routes for update using (auth.uid() = uploaded_by);

-- 2. PostGIS Duplicate Route Detection Function
create or replace function public.detect_route_duplicates(
  p_route_id uuid,
  p_threshold_meters numeric default 80.0
)
returns table (
  candidate_id uuid,
  similarity_meters numeric
) as $$
declare
  v_geom geometry;
begin
  select geom into v_geom from public.routes where id = p_route_id;
  if v_geom is null then
    return;
  end if;

  return query
  select 
    r.id as candidate_id,
    round(
      least(
        ST_FrechetDistance(ST_Transform(v_geom, 3857), ST_Transform(r.geom, 3857)),
        ST_FrechetDistance(ST_Transform(ST_Reverse(v_geom), 3857), ST_Transform(r.geom, 3857))
      )::numeric, 1
    ) as similarity_meters
  from public.routes r
  where r.id != p_route_id
    and r.status != 'rejected'
    and ST_DWithin(v_geom::geography, r.geom::geography, 5000)
    and least(
      ST_FrechetDistance(ST_Transform(v_geom, 3857), ST_Transform(r.geom, 3857)),
      ST_FrechetDistance(ST_Transform(ST_Reverse(v_geom), 3857), ST_Transform(r.geom, 3857))
    ) <= p_threshold_meters;
end;
$$ language plpgsql;
