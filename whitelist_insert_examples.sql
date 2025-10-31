-- ========================================
-- SQL INSERT STATEMENTS UNTUK EMAIL WHITELIST
-- ========================================

-- ========================================
-- 1. INSERT SINGLE EMAIL
-- ========================================

-- Insert admin email
INSERT INTO email_whitelist (email, role) 
VALUES ('admin@company.com', 'admin');

-- Insert team member email
INSERT INTO email_whitelist (email, role) 
VALUES ('manager@company.com', 'team');

-- Insert regular member email
INSERT INTO email_whitelist (email, role) 
VALUES ('user@company.com', 'member');


-- ========================================
-- 2. INSERT MULTIPLE EMAILS SEKALIGUS
-- ========================================

INSERT INTO email_whitelist (email, role) VALUES
  ('admin@company.com', 'admin'),
  ('manager@company.com', 'team'),
  ('staff1@company.com', 'team'),
  ('staff2@company.com', 'team'),
  ('user1@gmail.com', 'member'),
  ('user2@gmail.com', 'member');


-- ========================================
-- 3. INSERT DENGAN CREATED_BY (Optional)
-- ========================================
-- Gunakan ini jika Anda ingin track siapa admin yang menambahkan email

-- Catatan: Ganti 'YOUR_ADMIN_USER_ID' dengan UUID dari auth.users
-- Cara cek UUID admin: SELECT id FROM auth.users WHERE email = 'admin@company.com';

INSERT INTO email_whitelist (email, role, created_by) 
VALUES 
  ('admin@company.com', 'admin', 'YOUR_ADMIN_USER_ID'),
  ('manager@company.com', 'team', 'YOUR_ADMIN_USER_ID');


-- ========================================
-- 4. INSERT DENGAN HANDLE DUPLICATE (Safe Insert)
-- ========================================
-- Menggunakan ON CONFLICT untuk prevent error jika email sudah ada

INSERT INTO email_whitelist (email, role) 
VALUES ('admin@company.com', 'admin')
ON CONFLICT (email) 
DO UPDATE 
SET 
  role = EXCLUDED.role,
  updated_at = NOW();


-- ========================================
-- 5. INSERT MULTIPLE DENGAN HANDLE DUPLICATE
-- ========================================

INSERT INTO email_whitelist (email, role) 
VALUES 
  ('admin@company.com', 'admin'),
  ('manager@company.com', 'team'),
  ('staff@company.com', 'team')
ON CONFLICT (email) 
DO UPDATE 
SET 
  role = EXCLUDED.role,
  updated_at = NOW();


-- ========================================
-- 6. TEMPLATE UNTUK SETUP AWAL (Copy dan Edit Sesuai Kebutuhan)
-- ========================================

-- Admin Emails
INSERT INTO email_whitelist (email, role) VALUES
  ('admin@yourcompany.com', 'admin'),
  ('superadmin@yourcompany.com', 'admin');

-- Team Member Emails
INSERT INTO email_whitelist (email, role) VALUES
  ('manager@yourcompany.com', 'team'),
  ('supervisor@yourcompany.com', 'team'),
  ('staff1@yourcompany.com', 'team'),
  ('staff2@yourcompany.com', 'team');

-- Member Emails (Optional - untuk testing atau specific users)
INSERT INTO email_whitelist (email, role) VALUES
  ('member1@yourcompany.com', 'member'),
  ('member2@yourcompany.com', 'member');


-- ========================================
-- 7. VERIFICATION QUERIES (Untuk Cek Data Setelah Insert)
-- ========================================

-- Cek semua data di whitelist
SELECT * FROM email_whitelist ORDER BY role, email;

-- Cek hanya admin
SELECT email, role, created_at FROM email_whitelist WHERE role = 'admin';

-- Cek hanya team
SELECT email, role, created_at FROM email_whitelist WHERE role = 'team';

-- Cek hanya member
SELECT email, role, created_at FROM email_whitelist WHERE role = 'member';

-- Cek email spesifik
SELECT * FROM email_whitelist WHERE email = 'admin@company.com';

-- Count per role
SELECT role, COUNT(*) as count FROM email_whitelist GROUP BY role;


-- ========================================
-- 8. UPDATE EXISTING EMAIL ROLE
-- ========================================

-- Update role email yang sudah ada
UPDATE email_whitelist 
SET role = 'admin', updated_at = NOW()
WHERE email = 'manager@company.com';


-- ========================================
-- 9. DELETE EMAIL DARI WHITELIST
-- ========================================

-- Hapus email spesifik
DELETE FROM email_whitelist WHERE email = 'user@company.com';

-- Hapus semua member (hati-hati!)
-- DELETE FROM email_whitelist WHERE role = 'member';


-- ========================================
-- 10. CONTOH REAL-WORLD SCENARIO
-- ========================================

-- Setup awal untuk tim kecil
INSERT INTO email_whitelist (email, role) VALUES
  ('ceo@company.com', 'admin'),
  ('cto@company.com', 'admin'),
  ('hr@company.com', 'team'),
  ('developer1@company.com', 'team'),
  ('developer2@company.com', 'team'),
  ('designer@company.com', 'team')
ON CONFLICT (email) DO NOTHING;


-- ========================================
-- NOTES:
-- ========================================
-- 1. Email harus unique (tidak bisa duplikat)
-- 2. Role harus salah satu: 'admin', 'team', atau 'member'
-- 3. created_at dan updated_at otomatis di-set
-- 4. created_by optional (bisa NULL)
-- 5. Gunakan ON CONFLICT untuk prevent error jika insert email yang sudah ada
-- 6. Pastikan email lowercase untuk consistency (OAuth email biasanya lowercase)
-- 
-- Cara menjalankan:
-- 1. Login ke Supabase Dashboard
-- 2. Go to: SQL Editor
-- 3. Copy-paste SQL statement
-- 4. Klik "Run" atau "Execute"
-- ========================================

