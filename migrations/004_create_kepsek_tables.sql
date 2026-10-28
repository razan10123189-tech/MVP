-- Migration 004: Enhance partners with MoU tracking & School Quality Targets for Kepala Sekolah

-- 1. Tambahkan kolom MoU pada tabel partners jika belum ada
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mou_number VARCHAR(100);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mou_start DATE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mou_end DATE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mou_scope TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mou_status VARCHAR(50) DEFAULT 'Aktif';

-- 2. Buat tabel target mutu & KPI sekolah vokasi
CREATE TABLE IF NOT EXISTS school_quality_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year VARCHAR(20) DEFAULT '2025/2026',
  target_internship_rate INT DEFAULT 95,
  target_certified_talents INT DEFAULT 100,
  target_industry_partners INT DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
