const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigration() {
  console.log('🚀 Running Migration 004 (Kepala Sekolah & MoU Tracking)...');
  const sql = fs.readFileSync(path.join(__dirname, '004_create_kepsek_tables.sql'), 'utf-8');
  await db.query(sql);
  console.log('✅ Tables & columns for Migration 004 created successfully.');

  // Update existing partners with MoU data
  console.log('🌱 Updating partners with industrial MoU data...');
  
  await db.query(`
    UPDATE partners 
    SET 
      mou_number = 'MOU/CDGS-TELKOM/2025/001',
      mou_start = '2025-01-10',
      mou_end = '2028-01-10',
      mou_scope = 'Praktik Kerja Lapangan (PKL), Sinkronisasi Kurikulum Software Engineering, Program Guru Tamu Industri, Uji Kompetensi Keahlian',
      mou_status = 'Aktif'
    WHERE name ILIKE '%Telkom%';
  `);

  await db.query(`
    UPDATE partners 
    SET 
      mou_number = 'MOU/CDGS-STUDIO/2025/002',
      mou_start = '2025-02-15',
      mou_end = '2027-02-15',
      mou_scope = 'Magang Siswa DKV & Animasi, Pengembangan Portofolio Desain Komersial, Bimbingan Portofolio Kreatif',
      mou_status = 'Aktif'
    WHERE name ILIKE '%Studio%';
  `);

  await db.query(`
    UPDATE partners 
    SET 
      mou_number = 'MOU/CDGS-ALLAN/2024/008',
      mou_start = '2024-07-01',
      mou_end = '2027-07-01',
      mou_scope = 'Penyaluran Kerja Lulusan SMK, Magang Industri Fullstack Web, Sertifikasi Kompetensi Database',
      mou_status = 'Aktif'
    WHERE name ILIKE '%ALLAN%';
  `);

  // Tambahkan mitra PTN dan mitra industri baru jika belum ada
  const checkPtn = await db.query("SELECT id FROM partners WHERE name ILIKE '%Universitas Indonesia%'");
  if (checkPtn.rows.length === 0) {
    await db.query(`
      INSERT INTO partners (id, name, category, address, contact_person, phone, mou_number, mou_start, mou_end, mou_scope, mou_status)
      VALUES (
        gen_random_uuid(),
        'Konsorsium PTN (UI & ITB)',
        'PTN',
        'Kampus UI Depok & Kampus ITB Ganesha Bandung',
        'Prof. Hendra Gunawan',
        '021-7867222',
        'PKS/CDGS-KONSORSIUM/2025/004',
        '2025-03-01',
        '2028-03-01',
        'Jalur Prestasi Vokasi, Beasiswa Kuliah Talenta Unggulan, Riset Terapan Bersama',
        'Aktif'
      );
    `);
  }

  const checkNet = await db.query("SELECT id FROM partners WHERE name ILIKE '%Solusi Jaringan%'");
  if (checkNet.rows.length === 0) {
    await db.query(`
      INSERT INTO partners (id, name, category, address, contact_person, phone, mou_number, mou_start, mou_end, mou_scope, mou_status)
      VALUES (
        gen_random_uuid(),
        'PT Solusi Jaringan Nusantara',
        'DUDI',
        'Jl. Gatot Subroto No. 45, Bandung',
        'Ir. Agus Santoso, M.T.',
        '022-7301122',
        'MOU/CDGS-SJN/2024/011',
        '2024-09-01',
        '2026-09-01',
        'Praktik Kerja Lapangan TKJ & Jaringan Cloud, Donasi Perangkat Lab Jaringan, Sertifikasi Mikrotik/Cisco',
        'Aktif'
      );
    `);
  }

  // Seed School Quality Targets
  const checkKpi = await db.query("SELECT id FROM school_quality_targets WHERE academic_year = '2025/2026'");
  if (checkKpi.rows.length === 0) {
    await db.query(`
      INSERT INTO school_quality_targets (academic_year, target_internship_rate, target_certified_talents, target_industry_partners, notes)
      VALUES (
        '2025/2026',
        95,
        150,
        25,
        'Target Kinerja Kepala Sekolah SMK Pusat Keunggulan: 100% siswa kelas XII tervalidasi portofolio standar DUDI dan terserap magang.'
      );
    `);
  }

  console.log('✨ Migration 004 & Seeding completed successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
