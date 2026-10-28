-- ============================================================
-- Migration: Tabel Lowongan Magang DUDI & Lamaran Siswa (Murid)
-- ============================================================

-- 1. Tabel Lowongan Magang Industri (Internship Vacancies)
CREATE TABLE IF NOT EXISTS internship_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  requirements TEXT,
  quota INTEGER DEFAULT 3,
  location VARCHAR(150),
  status VARCHAR(50) DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabel Pengajuan Minat / Lamaran Magang Siswa
CREATE TABLE IF NOT EXISTS internship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID REFERENCES internship_vacancies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Menunggu Tinjauan',
  applied_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, vacancy_id)
);
