-- 迁移 2026-09-04：来源健康度持久化表 source_checks
-- 用法：在 Supabase → SQL Editor 粘贴本文件全部内容并运行一次。
-- （supabase/schema.sql 已包含相同定义，供全新库 bootstrap 使用。）

create table if not exists public.source_checks (
  id               bigint generated always as identity primary key,
  checked_at       timestamptz not null,
  source_id        text not null,
  name             text not null,
  owner            text,
  url              text not null,
  reachable        boolean not null default false,
  http_status      integer,
  error            text,
  hit_count        integer not null default 0
);

alter table public.source_checks enable row level security;

create policy "anon can read source_checks" on public.source_checks
  for select to anon using (true);

create index if not exists source_checks_checked_idx
  on public.source_checks (checked_at desc);
create index if not exists source_checks_source_idx
  on public.source_checks (source_id, checked_at desc);
