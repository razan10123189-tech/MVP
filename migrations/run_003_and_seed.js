const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function run() {
  console.log('🚀 Menjalankan migrasi 003 (Murid & Lowongan Magang)...');
  const sql = fs.readFileSync(path.join(__dirname, '003_create_murid_and_vacancies_tables.sql'), 'utf-8');
  await db.query(sql);
  console.log('✅ Skema tabel lowongan & lamaran magang berhasil dibuat!');

  // Ambil partner
  const partnersRes = await db.query('SELECT id, name FROM partners');
  const partnerMap = {};
  partnersRes.rows.forEach(p => { partnerMap[p.name] = p.id; });

  const telkomId = partnerMap['PT Telkom Indonesia'] || partnersRes.rows[0]?.id;
  const studioId = partnerMap['Studio Digital Kreatif'] || partnersRes.rows[0]?.id;
  const allanId = partnerMap['PT ALLAN'] || partnersRes.rows[0]?.id;

  const vacancies = [
    {
      partner_id: telkomId,
      title: 'Junior Web Developer Intern',
      department: 'Digital Solution & Cloud Systems',
      requirements: 'Menguasai Node.js, Express, REST API, SQL dasar, dan pemahaman Git colaborative workflow.',
      quota: 3,
      location: 'Bandung / Hybrid',
      status: 'OPEN'
    },
    {
      partner_id: telkomId,
      title: 'Network & Server Operations Intern',
      department: 'Infrastructure & Telco Operations',
      requirements: 'Familiar dengan konfigurasi Router Mikrotik/Cisco, Linux Ubuntu Server, dan dasar firewall/VPN.',
      quota: 2,
      location: 'Bandung On-site',
      status: 'OPEN'
    },
    {
      partner_id: studioId,
      title: 'UI/UX Design Apprentice',
      department: 'Creative Product Design',
      requirements: 'Mampu membuat wireframe & clickable prototype di Figma, mematuhi Design System & standard WCAG AA.',
      quota: 2,
      location: 'Bandung On-site',
      status: 'OPEN'
    },
    {
      partner_id: studioId,
      title: 'Motion & Visual Graphic Apprentice',
      department: 'Creative Multimedia Studio',
      requirements: 'Terbiasa dengan Adobe Illustrator, SVG assets, dan perancangan micro-interactions interaktif.',
      quota: 2,
      location: 'Bandung Hybrid',
      status: 'OPEN'
    },
    {
      partner_id: allanId,
      title: 'Fullstack Software Engineering Intern',
      department: 'Commerce & POS Retail Tech',
      requirements: 'Pengalaman membangun aplikasi web fullstack menggunakan PostgreSQL, Node.js, dan arsitektur database relasional.',
      quota: 3,
      location: 'Bandung / Remote',
      status: 'OPEN'
    }
  ];

  await db.query('DELETE FROM internship_vacancies');
  for (const v of vacancies) {
    if (v.partner_id) {
      await db.query(`
        INSERT INTO internship_vacancies (id, partner_id, title, department, requirements, quota, location, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
      `, [v.partner_id, v.title, v.department, v.requirements, v.quota, v.location, v.status]);
    }
  }

  console.log(`✅ ${vacancies.length} lowongan magang DUDI berhasil di-seed!`);

  // Seed sample applied vacancy for demo student
  const studentRes = await db.query("SELECT id FROM users WHERE email = 'murid@cdgs.local'");
  if (studentRes.rows.length > 0) {
    const studentId = studentRes.rows[0].id;
    const vacRes = await db.query('SELECT id, partner_id FROM internship_vacancies LIMIT 1');
    if (vacRes.rows.length > 0) {
      await db.query('DELETE FROM internship_applications WHERE student_id = $1', [studentId]);
      await db.query(`
        INSERT INTO internship_applications (id, vacancy_id, student_id, partner_id, notes, status, applied_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Menunggu Wawancara', NOW())
        ON CONFLICT (student_id, vacancy_id) DO NOTHING
      `, [vacRes.rows[0].id, studentId, vacRes.rows[0].partner_id, 'Sangat tertarik mengembangkan modul backend POS di lingkungan cloud.']);
      console.log('✅ 1 sampel lamaran magang siswa berhasil di-seed');
    }
  }

  console.log('🎉 Migrasi 003 dan seeding data Murid berhasil!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error migrasi 003:', err);
  process.exit(1);
});
