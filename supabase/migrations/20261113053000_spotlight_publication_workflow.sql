-- Spotlight public company reviews and moderated member submissions.
create table if not exists public.spotlight_company_reviews (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  company_name text not null default 'TIZIBANE',
  category text not null default 'Company review' check (char_length(category) between 2 and 60),
  body text not null check (char_length(body) between 20 and 5000),
  source_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_pinned boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotlight_company_reviews_source_https check (source_url is null or source_url ~ '^https://')
);
create index if not exists spotlight_company_reviews_public_idx on public.spotlight_company_reviews (is_pinned desc, published_at desc, created_at desc) where status = 'published';

create table if not exists public.spotlight_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(category) between 2 and 60),
  title text not null check (char_length(title) between 2 and 140),
  public_url text not null check (public_url ~ '^https://'),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text not null default '' check (char_length(admin_note) <= 1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists spotlight_submissions_owner_idx on public.spotlight_submissions (user_id, created_at desc);
create index if not exists spotlight_submissions_public_idx on public.spotlight_submissions (created_at desc) where status = 'approved';

alter table public.spotlight_company_reviews enable row level security;
alter table public.spotlight_submissions enable row level security;

drop policy if exists spotlight_company_reviews_public_read on public.spotlight_company_reviews;
create policy spotlight_company_reviews_public_read on public.spotlight_company_reviews for select to anon, authenticated using (status = 'published' or private.is_platform_admin((select auth.uid())));
drop policy if exists spotlight_company_reviews_admin_insert on public.spotlight_company_reviews;
create policy spotlight_company_reviews_admin_insert on public.spotlight_company_reviews for insert to authenticated with check (created_by = (select auth.uid()) and private.is_platform_admin((select auth.uid())));
drop policy if exists spotlight_company_reviews_admin_update on public.spotlight_company_reviews;
create policy spotlight_company_reviews_admin_update on public.spotlight_company_reviews for update to authenticated using (private.is_platform_admin((select auth.uid()))) with check (private.is_platform_admin((select auth.uid())));
drop policy if exists spotlight_company_reviews_admin_delete on public.spotlight_company_reviews;
create policy spotlight_company_reviews_admin_delete on public.spotlight_company_reviews for delete to authenticated using (private.is_platform_admin((select auth.uid())));

drop policy if exists spotlight_submissions_public_read_approved on public.spotlight_submissions;
create policy spotlight_submissions_public_read_approved on public.spotlight_submissions for select to anon, authenticated using (status = 'approved');
drop policy if exists spotlight_submissions_owner_read on public.spotlight_submissions;
create policy spotlight_submissions_owner_read on public.spotlight_submissions for select to authenticated using (user_id = (select auth.uid()) or private.is_platform_admin((select auth.uid())));
drop policy if exists spotlight_submissions_member_insert on public.spotlight_submissions;
create policy spotlight_submissions_member_insert on public.spotlight_submissions for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists spotlight_submissions_admin_update on public.spotlight_submissions;
create policy spotlight_submissions_admin_update on public.spotlight_submissions for update to authenticated using (private.is_platform_admin((select auth.uid()))) with check (private.is_platform_admin((select auth.uid())));

grant select on public.spotlight_company_reviews to anon, authenticated;
grant insert, update, delete on public.spotlight_company_reviews to authenticated;
grant select on public.spotlight_submissions to anon, authenticated;
grant insert, update on public.spotlight_submissions to authenticated;
