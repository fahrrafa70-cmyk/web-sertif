E-Certificate Database Mapping

Overview
- This folder contains SQL for schema (tables.sql), seed data (insert.sql), and RLS policies (rls.sql).
- JWT claims expected by RLS: role (admin|team|public) and sub (UUID user id).

UI ↔ Database Mapping
- Templates page (`src/app/templates/page.tsx`)
  - Template Card: templates.name, templates.orientation, categories.name (via templates.category_id)
  - Create/Edit Sheet: templates (name, orientation, category_id)
  - Template Fields (future editor): template_fields.* per template_id
  - Role rules: Admin/Team can create/update; only Admin can delete (RLS enforces)

- Certificates page (`src/app/certificates/page.tsx`)
  - Table Columns: certificates.cert_number, recipient_name, category via templates.category_id, issue_date, expiry_date, status
  - Edit Sheet: certificates (recipient_name, category via template, issue_date, expiry_date)
  - Role rules: Admin/Team can create/update; only Admin can delete; Public can only read own (owner_user_id)

- My Certificates (`src/app/my-certificates/page.tsx`)
  - Lists certificates where certificates.owner_user_id = auth user id
  - No delete; view/download only

- Sidebar role behavior
  - UI reads localStorage `ecert-role` and toggles links. In production, derive from auth session.user.role.

How to import SQL into Supabase
1. Run tables.sql to create all objects.
2. Run insert.sql to seed data.
3. Run rls.sql to enable and apply policies.

Switching from dummy UI to live queries
1. Replace in-memory arrays with Supabase client queries in pages:
   - `templates`: select name, orientation, category_id, created_by
   - `certificates`: select cert_number, recipient_name, template_id, issue_date, expiry_date, status
2. Use `rpc()` or `select` joins for category names (templates ↔ categories).
3. Use auth session to determine role and user id; do not rely on localStorage in production.
4. On mutations, call insert/update/delete; RLS will enforce permissions.

Indexes & Performance
- Indexes added on foreign keys and common filters: category_id, created_by, owner_user_id, cert_number.

RLS Summary
- Admin: full access to all tables; can delete templates/certificates.
- Team: read/write non-destructive operations; no delete on templates/certificates.
- Public: read-only to own certificates; no template management.


