-- Seed data for E-Certificate Management Platform

-- USERS
insert into public.users (id, email, full_name, role) values
  ('00000000-0000-0000-0000-000000000001','admin@example.com','Administrator','admin'),
  ('00000000-0000-0000-0000-000000000002','team1@example.com','Team One','team'),
  ('00000000-0000-0000-0000-000000000003','user1@example.com','User Public','public')
on conflict (id) do nothing;

-- CATEGORIES
insert into public.categories (id, name) values
  ('10000000-0000-0000-0000-000000000001','Training'),
  ('10000000-0000-0000-0000-000000000002','Internship'),
  ('10000000-0000-0000-0000-000000000003','MoU'),
  ('10000000-0000-0000-0000-000000000004','Visit')
on conflict (id) do nothing;

-- TEMPLATES
insert into public.templates (id, name, category_id, orientation, preview_url, created_by) values
  ('20000000-0000-0000-0000-000000000001','General Training','10000000-0000-0000-0000-000000000001','Landscape',null,'00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002','Internship','10000000-0000-0000-0000-000000000002','Portrait',null,'00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000003','MoU Certificate','10000000-0000-0000-0000-000000000003','Landscape',null,'00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004','Industrial Visit','10000000-0000-0000-0000-000000000004','Landscape',null,'00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- TEMPLATE FIELDS
insert into public.template_fields (id, template_id, field_key, label, x, y, width, height, font_family, font_size, font_weight, color) values
  ('21000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','recipient_name','Recipient Name',100,200,300,40,'Inter',18,'600','#111111'),
  ('21000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','issue_date','Issue Date',100,250,200,32,'Inter',14,'500','#333333'),
  ('21000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','recipient_name','Recipient Name',90,180,280,38,'Inter',18,'600','#111111')
on conflict (id) do nothing;

-- MEMBERS
insert into public.members (id, user_id, team_name) values
  ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Certification Team')
on conflict (id) do nothing;

-- CERTIFICATES
insert into public.certificates (id, cert_number, recipient_name, template_id, issued_by, issue_date, expiry_date, status, owner_user_id) values
  ('40000000-0000-0000-0000-000000000001','EC-2025-0001','Ayu Pratama','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','2025-01-12','2027-01-12','active','00000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000002','EC-2025-0002','Budi Santoso','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','2025-02-05','2027-02-05','active','00000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003','EC-2025-0003','Clara Wijaya','20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','2025-03-21',null,'active','00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- EMAIL LOGS
insert into public.email_logs (id, certificate_id, recipient_email, subject) values
  ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','ayu@example.com','Your Certificate EC-2025-0001'),
  ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','budi@example.com','Your Certificate EC-2025-0002')
on conflict (id) do nothing;

-- ACTIVITY LOGS
insert into public.activity_logs (id, actor_user_id, action, entity_type, entity_id) values
  ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','create','template','20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','issue','certificate','40000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- TRANSLATIONS (example)
insert into public.translations (id, namespace, key, locale, value) values
  ('70000000-0000-0000-0000-000000000001','ui','templates.title','en','Templates'),
  ('70000000-0000-0000-0000-000000000002','ui','templates.title','id','Template')
on conflict (id) do nothing;

