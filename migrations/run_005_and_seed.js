const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function run() {
  console.log('🚀 Menjalankan migrasi 005 (Tabel Undangan Magang DUDI)...');
  const sql = fs.readFileSync(path.join(__dirname, '005_create_internship_invitations_table.sql'), 'utf-8');
  await db.query(sql);
  console.log('✅ Tabel internship_invitations berhasil dibuat!');

  // Ambil user student Muhammad Razan (murid@cdgs.local)
  const muridRes = await db.query("SELECT id FROM users WHERE email = 'murid@cdgs.local'");
  const razanId = muridRes.rows[0]?.id;

  // Ambil partner
  const telkomRes = await db.query("SELECT id, name FROM partners WHERE name ILIKE '%telkom%' LIMIT 1");
  const telkom = telkomRes.rows[0] || { id: null, name: 'PT Telkom Indonesia' };

  const studioRes = await db.query("SELECT id, name FROM partners WHERE name ILIKE '%studio%' LIMIT 1");
  const studio = studioRes.rows[0] || { id: null, name: 'Studio Digital Kreatif' };

  // Seed sample invitation jika belum ada
  const countRes = await db.query('SELECT COUNT(*) FROM internship_invitations');
  if (parseInt(countRes.rows[0].count) === 0 && razanId) {
    await db.query(`
      INSERT INTO internship_invitations (student_id, student_name, student_major, partner_id, partner_name, position, notes, status, created_at)
      VALUES 
      ($1, 'Muhammad Razan', 'Rekayasa Perangkat Lunak', $2, $3, 'Junior Software Developer Intern', 'Halo Razan, kami sangat terkesan dengan portofolio Web POS & Database kamu di platform CDGS. Kami ingin mengundangmu untuk tahap wawancara magang industri di tim Cloud & Systems.', 'PENDING', NOW() - INTERVAL '1 day'),
      ($1, 'Muhammad Razan', 'Rekayasa Perangkat Lunak', $4, $5, 'Frontend Interface Apprentice', 'Kami melihat keahlian JavaScript kamu yang solid. Kami memiliki kuota magang untuk pengembangan UI portal sekolah.', 'ACCEPTED', NOW() - INTERVAL '3 day')
    `, [razanId, telkom.id, telkom.name, studio.id, studio.name]);
    console.log('🌱 Seed data contoh undangan magang berhasil diinput!');
  } else {
    console.log(`ℹ️ Data undangan magang sudah tersedia (${countRes.rows[0].count} baris).`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Gagal menjalankan migrasi 005:', err);
  process.exit(1);
});
