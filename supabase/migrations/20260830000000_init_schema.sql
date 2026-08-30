-- Enable PostGIS extension
create extension if not exists postgis;

-- 1. Cities table
create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  created_at timestamptz default now()
);

-- 2. Routes table
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id uuid references cities(id) on delete cascade,
  geom geometry(LineString, 4326) not null,
  gpx_raw text not null,              -- original file content
  thumbnail_svg text not null,        -- pre-rendered at upload time
  distance_m numeric not null,
  elevation_gain_m numeric,
  status text not null check (status in ('official', 'community', 'pending', 'rejected')),
  uploaded_by uuid,                   -- optional link to auth.users in Supabase
  created_at timestamptz default now()
);

-- Spatial index on geometry
create index if not exists routes_geom_idx on routes using gist(geom);

-- 3. Duplicate Route Flags table
create table if not exists route_duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade,
  candidate_route_id uuid references routes(id) on delete cascade,
  similarity_score numeric not null,
  resolved boolean default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists routes_city_idx on routes(city_id);
create index if not exists routes_status_idx on routes(status);
create index if not exists route_duplicate_flags_route_id_idx on route_duplicate_flags(route_id);
create index if not exists route_duplicate_flags_candidate_idx on route_duplicate_flags(candidate_route_id);
