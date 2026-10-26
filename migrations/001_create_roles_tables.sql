-- ============================================================
-- Migration: Membuat tabel roles & user_roles, serta seed data
-- ============================================================

-- 1. Tabel Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabel User-Roles (relasi many-to-many antara users dan roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 3. Seed Data: Role-role bawaan sistem
INSERT INTO roles (name, description) VALUES
  ('Platform Admin', 'Administrator platform, memiliki akses penuh ke seluruh sistem'),
  ('Kepala Sekolah', 'Kepala sekolah, bertanggung jawab atas manajemen sekolah'),
  ('Guru', 'Tenaga pengajar di sekolah'),
  ('Murid', 'Peserta didik / siswa'),
  ('Instansi', 'Instansi / lembaga mitra yang bekerja sama dengan sekolah')
ON CONFLICT (name) DO NOTHING;
