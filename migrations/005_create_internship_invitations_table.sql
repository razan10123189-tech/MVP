-- ============================================================
-- Migration 005: Tabel Undangan Magang / Wawancara DUDI (Internship Invitations)
-- ============================================================

CREATE TABLE IF NOT EXISTS internship_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
  student_major VARCHAR(100),
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  partner_name VARCHAR(150) NOT NULL,
  position VARCHAR(150) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_student ON internship_invitations(student_id);
CREATE INDEX IF NOT EXISTS idx_invitations_partner ON internship_invitations(partner_id);
