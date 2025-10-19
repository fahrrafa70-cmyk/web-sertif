-- Create table members
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text,
  phone text,
  email text,
  job text,
  date_of_birth date,
  address text,
  city text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relationship with certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates during re-run (idempotent best-effort)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'Allow admin full access on members'
  ) THEN
    EXECUTE 'DROP POLICY "Allow admin full access on members" ON public.members';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'Allow team select, insert, update on members'
  ) THEN
    EXECUTE 'DROP POLICY "Allow team select, insert, update on members" ON public.members';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members' AND policyname = 'Allow public read member data for public certificates'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public read member data for public certificates" ON public.members';
  END IF;
END $$;

-- Admin Policy
CREATE POLICY "Allow admin full access on members"
ON public.members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = auth.uid()
      OR lower(u.email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
    )
    AND lower(u.role) = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = auth.uid()
      OR lower(u.email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
    )
    AND lower(u.role) = 'admin'
  )
);

-- Team Policy (no DELETE)
CREATE POLICY "Allow team select, insert, update on members"
ON public.members
FOR SELECT, INSERT, UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = auth.uid()
      OR lower(u.email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
    )
    AND lower(u.role) = 'team'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = auth.uid()
      OR lower(u.email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
    )
    AND lower(u.role) = 'team'
  )
);

-- Public Policy (read-only, allow reading members when accessed via anon, typically for public cert check)
CREATE POLICY "Allow public read member data for public certificates"
ON public.members
FOR SELECT
TO anon
USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members (email);
CREATE INDEX IF NOT EXISTS idx_certificates_member_id ON public.certificates (member_id);

-- Dummy data for testing
INSERT INTO public.members (name, organization, phone, email, job, date_of_birth, address, city, notes)
VALUES
('Budi Santoso', 'Universitas Brawijaya', '08123456789', 'budi@ub.ac.id', 'Mahasiswa', '2001-05-12', 'Jl. Veteran No.5', 'Malang', 'Peserta Pelatihan ReactJS'),
('Siti Lestari', 'PT Telkom Indonesia', '082134567890', 'siti@telkom.co.id', 'Engineer', '1998-09-25', 'Jl. Diponegoro No.8', 'Bandung', 'Peserta Magang'),
('Agus Prasetyo', 'SMK Negeri 1 Malang', '081356789012', 'agus@smkn1.sch.id', 'Guru', '1985-02-10', 'Jl. Ijen No.10', 'Malang', 'Kunjungan Industri')
ON CONFLICT DO NOTHING;
