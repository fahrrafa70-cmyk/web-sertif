-- Schema for E-Certificate Management Platform
-- Create required tables, relationships, indexes

-- USERS AND ROLES
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin','team','public')),
  created_at timestamptz not null default now()
);

-- CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- TEMPLATES
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  orientation text not null check (orientation in ('Landscape','Portrait')),
  preview_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists templates_category_idx on public.templates(category_id);
create index if not exists templates_created_by_idx on public.templates(created_by);

-- TEMPLATE FIELDS/POSITIONS
create table if not exists public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  field_key text not null,
  label text not null,
  x numeric not null,
  y numeric not null,
  width numeric,
  height numeric,
  font_family text,
  font_size numeric,
  font_weight text,
  color text,
  created_at timestamptz not null default now(),
  unique(template_id, field_key)
);
create index if not exists template_fields_template_idx on public.template_fields(template_id);

-- MEMBERS (ORGANIZATION USERS)
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_name text,
  created_at timestamptz not null default now()
);
create index if not exists members_user_idx on public.members(user_id);

-- CERTIFICATES
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  cert_number text not null unique,
  recipient_name text not null,
  template_id uuid references public.templates(id) on delete set null,
  issued_by uuid references public.users(id) on delete set null,
  issue_date date not null,
  expiry_date date,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  owner_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists certificates_template_idx on public.certificates(template_id);
create index if not exists certificates_owner_idx on public.certificates(owner_user_id);
create index if not exists certificates_number_idx on public.certificates(cert_number);

-- EMAIL LOGS
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent'
);
create index if not exists email_logs_certificate_idx on public.email_logs(certificate_id);

-- ACTIVITY LOGS
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_actor_idx on public.activity_logs(actor_user_id);

-- TRANSLATIONS (for multilingual labels)
create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  key text not null,
  locale text not null,
  value text not null,
  unique(namespace, key, locale)
);

-- Helpful views can be added later.

