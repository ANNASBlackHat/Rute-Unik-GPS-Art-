-- Hardening pass: enable RLS on tables that were created without it,
-- replace deprecated auth.role() checks, and tighten policies that
-- allow ownership reassignment or unrestricted updates.

-- ---------------------------------------------------------------------------
-- 1. cities — public reference data, read-only from the client
-- ---------------------------------------------------------------------------
alter table public.cities enable row level security;

drop policy if exists "Cities are viewable by everyone" on public.cities;
create policy "Cities are viewable by everyone"
  on public.cities for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies: only the service role may write
-- (matches the current server-side admin path).

-- ---------------------------------------------------------------------------
-- 2. route_duplicate_flags — internal moderation data, never expose
-- ---------------------------------------------------------------------------
alter table public.route_duplicate_flags enable row level security;

-- No policies defined → no role may read or write.
-- Server-side admin paths use the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- 3. routes — tighten insert and update policies
-- ---------------------------------------------------------------------------
-- Replace the deprecated auth.role() check with a TO clause, and require
-- that the row's uploaded_by matches the inserting user's JWT.
drop policy if exists "Authenticated users can insert routes" on public.routes;
create policy "Authenticated users can insert their own routes"
  on public.routes for insert
  to authenticated
  with check ((select auth.uid()) = uploaded_by);

-- The previous policy lacked WITH CHECK, which let a user reassign
-- uploaded_by on a row they owned. Add WITH CHECK that preserves ownership.
drop policy if exists "Users can update their own pending routes" on public.routes;
create policy "Users can update their own pending routes"
  on public.routes for update
  to authenticated
  using ((select auth.uid()) = uploaded_by and status = 'pending')
  with check ((select auth.uid()) = uploaded_by);

-- ---------------------------------------------------------------------------
-- 4. route_views — require viewer_id to match the JWT when present
-- ---------------------------------------------------------------------------
-- Anonymous inserts (no session) are still allowed for public view tracking;
-- when a viewer is signed in, the row must be attributed to that user.
drop policy if exists "Route views insert open" on public.route_views;
create policy "Route views insert open"
  on public.route_views for insert
  to anon, authenticated
  with check (viewer_id is null or (select auth.uid()) = viewer_id);

-- ---------------------------------------------------------------------------
-- 5. render_jobs — restrict updates to the service role
-- ---------------------------------------------------------------------------
-- The previous "Service can update render jobs" policy used using (true),
-- which let any authenticated client mutate any job. Remove it; the
-- service role bypasses RLS, so the server-side worker keeps working.
drop policy if exists "Service can update render jobs" on public.render_jobs;

-- ---------------------------------------------------------------------------
-- 6. profiles — protect the role column
-- ---------------------------------------------------------------------------
-- The current update policy lets a user update any column on their own
-- row, including `role`. Tighten so `role` can only be changed by the
-- service role (admins are promoted server-side).
create or replace function public.prevent_role_self_promotion()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null or auth.uid() <> old.id then
      raise exception 'role cannot be changed by this user';
    end if;
    -- Even the owner is not allowed to self-promote; require service role.
    raise exception 'role can only be changed by the service role';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_profiles_protect_role on public.profiles;
create trigger trg_profiles_protect_role
  before update on public.profiles
  for each row execute procedure public.prevent_role_self_promotion();

-- Defense in depth: the trigger function is SECURITY DEFINER, so revoke
-- direct calls from public-facing roles. It is only meant to run via trigger.
revoke execute on function public.prevent_role_self_promotion() from public, anon, authenticated;