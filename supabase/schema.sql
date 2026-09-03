-- OPC Policy Map · Supabase schema
-- 用法：在 Supabase Dashboard → SQL Editor 中执行本文件（或 supabase db push）。
-- 说明：字段与前端 types/policy.ts、types/intel.ts 对齐；REST 由 PostgREST 自动暴露。

-- ── 已核验：政策文件 ─────────────────────────────
create table if not exists public.policies (
  id                text primary key,
  title             text not null,
  province          text not null,
  city              text not null default '',
  category          text not null,
  tags              text[] not null default '{}',
  publish_date      date,
  effective_date    date,
  expiry_date       date,
  document_number   text,
  issued_by         text not null default '',
  policy_level      text not null,
  relevance         text not null check (relevance in ('direct', 'related')),
  status            text not null,
  summary           text not null,
  benefits          text[] not null default '{}',
  eligibility       text[] not null default '{}',
  application_notes text not null default '',
  application_url   text,
  source_name       text not null,
  source_type       text not null,
  source_url        text not null unique,
  verified_at       date not null,
  updated_at        timestamptz not null default now()
);

-- ── 已核验：四类跟进情报 ──────────────────────────
create table if not exists public.intel_items (
  id                 text primary key,
  kind               text not null check (kind in ('policy','application','interpretation','news','resource')),
  title              text not null,
  province           text not null,
  city               text,
  scope_label        text,
  publish_date       date,
  publish_date_text  text,
  document_number    text,
  issued_by          text,
  source_name        text not null,
  source_url         text not null unique,
  source_type        text,
  summary            text not null,
  key_facts          text[] not null default '{}',
  eligibility        text[],
  application_notes  text,
  contact_text       text,
  application_window jsonb,
  tags               text[] not null default '{}',
  discovered_at      date not null,
  verified           boolean not null default false,
  verified_at        date,
  confidence         text not null check (confidence in ('high','medium','low')),
  origin             text not null,
  updated_at         timestamptz not null default now()
);

-- ── 待核验池（巡检器写入） ─────────────────────────
create table if not exists public.intel_pool (
  url        text primary key,
  title      text not null,
  snippet    text,
  source_id  text not null,
  keyword    text not null,
  province   text,
  kind_guess text,
  found_at   timestamptz not null default now(),
  status     text not null default 'pending'
);

-- ── 更新日志 ──────────────────────────────────────
create table if not exists public.changelog (
  id      bigint generated always as identity primary key,
  date    date not null,
  summary text not null,
  detail  text
);

-- ── 行级安全：允许 anon 读（前端用 anon key 查询）；写入仅 service role ──
alter table public.policies    enable row level security;
alter table public.intel_items enable row level security;
alter table public.intel_pool  enable row level security;
alter table public.changelog   enable row level security;

create policy "anon can read policies"    on public.policies    for select to anon using (true);
create policy "anon can read intel_items" on public.intel_items for select to anon using (true);
create policy "anon can read intel_pool"  on public.intel_pool  for select to anon using (true);
create policy "anon can read changelog"   on public.changelog   for select to anon using (true);

-- 常用索引
create index if not exists policies_province_idx  on public.policies (province);
create index if not exists intel_kind_idx         on public.intel_items (kind);
create index if not exists intel_province_idx     on public.intel_items (province);
create index if not exists pool_source_idx        on public.intel_pool (source_id);
