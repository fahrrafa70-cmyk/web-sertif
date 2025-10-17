-- Enable Row Level Security and define policies aligned with UI rules

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.templates enable row level security;
alter table public.template_fields enable row level security;
alter table public.members enable row level security;
alter table public.certificates enable row level security;
alter table public.email_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.translations enable row level security;

-- Helper: assume JWT contains claim role and user_id
-- Using CURRENT_SETTING for Supabase: request.jwt.claims -> sub (user id) and role

create or replace function public.auth_role()
returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','public')
$$;

create or replace function public.auth_uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid
$$;

-- USERS: only admins can read all; users can read self; admins manage
create policy users_admin_all on public.users
  for all using (public.auth_role() = 'admin') with check (public.auth_role() = 'admin');
create policy users_read_self on public.users
  for select using (id = public.auth_uid());

-- CATEGORIES: read all; write admin/team
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.auth_role() in ('admin','team')) with check (public.auth_role() in ('admin','team'));

-- TEMPLATES: read all; admin/team insert/update; delete only admin
create policy templates_read on public.templates for select using (true);
create policy templates_insert_update on public.templates for insert with check (public.auth_role() in ('admin','team'));
create policy templates_update on public.templates for update using (public.auth_role() in ('admin','team')) with check (public.auth_role() in ('admin','team'));
create policy templates_delete_admin on public.templates for delete using (public.auth_role() = 'admin');

-- TEMPLATE FIELDS: follow templates ownership semantics
create policy template_fields_read on public.template_fields for select using (true);
create policy template_fields_write on public.template_fields for all using (public.auth_role() in ('admin','team')) with check (public.auth_role() in ('admin','team'));

-- MEMBERS: admin read/write all; team read self
create policy members_admin_all on public.members for all using (public.auth_role() = 'admin') with check (public.auth_role() = 'admin');
create policy members_team_read_self on public.members for select using (user_id = public.auth_uid());

-- CERTIFICATES: 
--  select: admin/team all; public only own
--  insert/update: admin/team; delete: admin only
create policy certs_read_admin_team on public.certificates for select using (public.auth_role() in ('admin','team'));
create policy certs_read_public_own on public.certificates for select using (owner_user_id = public.auth_uid());
create policy certs_write_admin_team on public.certificates for insert with check (public.auth_role() in ('admin','team'));
create policy certs_update_admin_team on public.certificates for update using (public.auth_role() in ('admin','team')) with check (public.auth_role() in ('admin','team'));
create policy certs_delete_admin on public.certificates for delete using (public.auth_role() = 'admin');

-- EMAIL LOGS: admin/team manage; public read none
create policy email_logs_admin_team on public.email_logs for all using (public.auth_role() in ('admin','team')) with check (public.auth_role() in ('admin','team'));
create policy email_logs_read_public_none on public.email_logs for select using (false);

-- ACTIVITY LOGS: read for admin/team; insert for all (system/user) attaching actor
create policy activity_logs_read_admin_team on public.activity_logs for select using (public.auth_role() in ('admin','team'));
create policy activity_logs_insert_any on public.activity_logs for insert with check (true);

-- TRANSLATIONS: read all; write admin
create policy translations_read on public.translations for select using (true);
create policy translations_admin_write on public.translations for all using (public.auth_role() = 'admin') with check (public.auth_role() = 'admin');


