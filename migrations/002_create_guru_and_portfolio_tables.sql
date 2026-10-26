-- ============================================================
-- Migration: Tabel Portofolio, Profil Siswa, Bimbingan & PKL Guru
-- ============================================================

-- 1. Tabel Portofolio Proyek Siswa
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  skills TEXT,
  repo_link VARCHAR(255),
  demo_link VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REVISION'
  is_verified BOOLEAN DEFAULT false,
  score NUMERIC(5, 2) DEFAULT NULL,
  badge VARCHAR(100) DEFAULT NULL,
  teacher_feedback TEXT DEFAULT NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabel Profil Detail Siswa & Pemetaan Guru Pembimbing
CREATE TABLE IF NOT EXISTS students_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nisn VARCHAR(30) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  class_name VARCHAR(50),
  major VARCHAR(100),
  mentor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  skills TEXT,
  is_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Update Kolom PKL Placements untuk Supervisi Guru
ALTER TABLE pkl_placements ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pkl_placements ADD COLUMN IF NOT EXISTS score NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE pkl_placements ADD COLUMN IF NOT EXISTS supervisor_notes TEXT DEFAULT NULL;
ALTER TABLE pkl_placements ADD COLUMN IF NOT EXISTS attendance_rate INTEGER DEFAULT 100;

-- 4. Tabel Sesi Bimbingan & Konseling Siswa (Journal Guru)
CREATE TABLE IF NOT EXISTS guidance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topic VARCHAR(255) NOT NULL,
  notes TEXT NOT NULL,
  action_plan TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
