const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

const TENANT_ID = '4eb88c5b-5b42-4c31-b16f-17dd38bc0ace'; // DEV1
const SCHOOL_ID = 'fc64c2c0-f2e8-4b42-b40f-4d47b80c57a7';

async function run() {
  console.log('🚀 Menjalankan migrasi 002...');
  const sql = fs.readFileSync(path.join(__dirname, '002_create_guru_and_portfolio_tables.sql'), 'utf-8');
  await db.query(sql);
  console.log('✅ Migrasi skema database berhasil dieksekusi!\n');

  console.log('🌱 Melakukan seeding data Guru, Siswa, Portofolio, PKL, dan Bimbingan...');

  // 1. Ambil ID Guru
  const guruRes = await db.query("SELECT id FROM users WHERE email = 'guru@cdgs.local'");
  if (guruRes.rows.length === 0) {
    throw new Error('Akun guru@cdgs.local belum ada!');
  }
  const guruId = guruRes.rows[0].id;

  // Role Murid
  const roleMuridRes = await db.query("SELECT id FROM roles WHERE name = 'Murid'");
  const muridRoleId = roleMuridRes.rows[0].id;

  // 2. Buat atau perbarui Siswa Demo
  const students = [
    {
      email: 'murid@cdgs.local',
      fullName: 'Muhammad Razan',
      nisn: '0068492011',
      className: 'XII RPL 1',
      major: 'Rekayasa Perangkat Lunak',
      skills: 'JavaScript, Node.js, PostgreSQL, Vue.js, Express',
      isRecommended: true
    },
    {
      email: 'dewi.lestari@cdgs.local',
      fullName: 'Dewi Lestari',
      nisn: '0068492012',
      className: 'XII DKV 2',
      major: 'Desain Komunikasi Visual',
      skills: 'UI/UX Design, Figma, Adobe Illustrator, CSS, Wireframing',
      isRecommended: true
    },
    {
      email: 'farhan.maulana@cdgs.local',
      fullName: 'Farhan Maulana',
      nisn: '0068492013',
      className: 'XI TKJ 2',
      major: 'Teknik Komputer & Jaringan',
      skills: 'Mikrotik, Linux Server, WireGuard, Cisco, Nginx',
      isRecommended: false
    },
    {
      email: 'anisa.rahma@cdgs.local',
      fullName: 'Anisa Rahma',
      nisn: '0068492014',
      className: 'XII RPL 2',
      major: 'Rekayasa Perangkat Lunak',
      skills: 'Flutter, Dart, Mobile Dev, Firebase, REST API',
      isRecommended: true
    }
  ];

  const studentMap = {}; // email -> userId

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('murid123', salt);

  for (const s of students) {
    let uRes = await db.query('SELECT id FROM users WHERE email = $1', [s.email]);
    let uid;
    if (uRes.rows.length === 0) {
      const insRes = await db.query(
        'INSERT INTO users (tenant_id, school_id, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [TENANT_ID, SCHOOL_ID, s.email, defaultPasswordHash]
      );
      uid = insRes.rows[0].id;
      await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [uid, muridRoleId]);
    } else {
      uid = uRes.rows[0].id;
    }
    studentMap[s.email] = uid;

    // Insert or update students_profile
    await db.query(`
      INSERT INTO students_profile (user_id, nisn, full_name, class_name, major, mentor_id, skills, is_recommended, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        nisn = EXCLUDED.nisn,
        full_name = EXCLUDED.full_name,
        class_name = EXCLUDED.class_name,
        major = EXCLUDED.major,
        mentor_id = EXCLUDED.mentor_id,
        skills = EXCLUDED.skills,
        is_recommended = EXCLUDED.is_recommended,
        updated_at = NOW()
    `, [uid, s.nisn, s.fullName, s.className, s.major, guruId, s.skills, s.isRecommended]);

    console.log(`✅ Siswa ${s.fullName} (${s.email}) siap dengan profil & pembimbing`);
  }

  // 3. Mitra Industri tambahan jika belum ada
  const partnersToEnsure = [
    { name: 'PT Telkom Indonesia', category: 'DUDI', contact: 'Bpk. Hendra Kurnia', phone: '081288776655', address: 'Jl. Japati No. 1, Bandung' },
    { name: 'Studio Digital Kreatif', category: 'DUDI', contact: 'Ibu Maya Safitri', phone: '081377889900', address: 'Jl. Riau No. 45, Bandung' }
  ];

  for (const p of partnersToEnsure) {
    const existP = await db.query('SELECT id FROM partners WHERE name = $1', [p.name]);
    if (existP.rows.length === 0) {
      await db.query(
        'INSERT INTO partners (id, name, category, address, contact_person, phone, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())',
        [p.name, p.category, p.address, p.contact, p.phone]
      );
      console.log(`✅ Mitra industri ${p.name} ditambahkan`);
    }
  }

  const partnersRes = await db.query('SELECT id, name FROM partners');
  const partnerByName = {};
  partnersRes.rows.forEach(p => { partnerByName[p.name] = p.id; });

  // 4. Seed Portofolio Siswa (Pending, Approved, Revision)
  const portfoliosData = [
    {
      studentEmail: 'murid@cdgs.local',
      title: 'Aplikasi Fullstack Web Point-of-Sale CDGS',
      category: 'Web App',
      description: 'Sistem POS ritel multi-cabang lengkap dengan manajemen inventaris real-time, cetak struk thermal, laporan laba-rugi otomatis, serta integrasi gateway pembayaran QRIS.',
      skills: 'Node.js, Express, PostgreSQL, Vanilla CSS, REST API',
      repo_link: 'https://github.com/razan/pos-cdgs',
      demo_link: 'https://pos-demo.cdgs.id',
      status: 'PENDING',
      is_verified: false,
      score: null,
      badge: null,
      teacher_feedback: null
    },
    {
      studentEmail: 'dewi.lestari@cdgs.local',
      title: 'Redesain Antarmuka Mobile Portal Magang Siswa',
      category: 'UI/UX Design',
      description: 'Desain pengalaman pengguna komprehensif 24 layar interaktif di Figma, menggunakan prinsip Atomic Design System, micro-interactions, serta mematuhi standar aksesibilitas WCAG AA.',
      skills: 'Figma, Design System, Wireframing, WCAG AA, Mobile UX',
      repo_link: 'https://figma.com/@dewi/portal-magang',
      demo_link: 'https://figma.com/proto/dewi-sample-2026',
      status: 'PENDING',
      is_verified: false,
      score: null,
      badge: null,
      teacher_feedback: null
    },
    {
      studentEmail: 'farhan.maulana@cdgs.local',
      title: 'Infrastruktur Server Linux & Firewall VPN WireGuard',
      category: 'Jaringan & Server',
      description: 'Implementasi klaster server Ubuntu 24.04 LTS yang diperkuat fail2ban, enkripsi VPN WireGuard peer-to-peer site, reverse proxy Nginx ber-SSL otomatis, dan skrip cron backup cloud harian.',
      skills: 'Ubuntu Server, WireGuard, Nginx, IPTables, Bash Scripting',
      repo_link: 'https://github.com/farhan/linux-infra-vpn',
      demo_link: 'https://vpn.farhan-lab.id',
      status: 'PENDING',
      is_verified: false,
      score: null,
      badge: null,
      teacher_feedback: null
    },
    {
      studentEmail: 'murid@cdgs.local',
      title: 'Sistem Manajemen Perpustakaan Digital Sekolah',
      category: 'Web App',
      description: 'Platform katalog buku digital sekolah dengan pemindaian barcode ISBN kamera ponsel, sistem denda keterlambatan otomatis, dan analitik literasi siswa per semester.',
      skills: 'Node.js, Express, PostgreSQL, JWT, Chart.js',
      repo_link: 'https://github.com/razan/perpus-digital',
      demo_link: 'https://perpus.cdgs.sch.id',
      status: 'APPROVED',
      is_verified: true,
      score: 95.0,
      badge: '⭐ Siap Industri',
      teacher_feedback: 'Arsitektur basis data relasional sangat rapi dan normalisasi 3NF diterapkan konsisten. Kualitas kode production-ready!'
    },
    {
      studentEmail: 'dewi.lestari@cdgs.local',
      title: 'Brand Identity & Design Token Kit Ekosistem SMK',
      category: 'UI/UX Design',
      description: 'Panduan identitas visual lengkap mencakup logo vector guidelines, tipografi skala modular, 16 token warna UI semantik, dan icon library SVG kustom.',
      skills: 'Figma, Branding, Typography, SVG Design',
      repo_link: 'https://figma.com/@dewi/smk-brand-tokens',
      demo_link: 'https://tokens.dewi-studio.id',
      status: 'APPROVED',
      is_verified: true,
      score: 92.5,
      badge: '🎨 UI/UX Expert',
      teacher_feedback: 'Sangat teliti dalam penerapan kontras warna AAA dan penyusunan documentation kit yang ramah programmer.'
    },
    {
      studentEmail: 'anisa.rahma@cdgs.local',
      title: 'Aplikasi Mobile Presensi Siswa Berbasis Geofencing',
      category: 'Mobile App',
      description: 'Aplikasi Android/iOS untuk absensi digital siswa dengan radius GPS radius 50 meter sekolah dan deteksi wajah anti-fake GPS.',
      skills: 'Flutter, Dart, Firebase, Geolocation, REST API',
      repo_link: 'https://github.com/anisa/attendance-geofence',
      demo_link: 'https://play.google.com/store/apps/details?id=com.cdgs.attend',
      status: 'REVISION',
      is_verified: false,
      score: 72.0,
      badge: null,
      teacher_feedback: 'Catatan Guru: Harap tambahkan penanganan saat ponsel siswa offline (local SQLite queue sync) dan lengkapi video demonstrasi pengujian geofence.'
    }
  ];

  // Hapus portofolio demo sebelumnya agar bersih
  await db.query('DELETE FROM portfolios');

  for (const p of portfoliosData) {
    const sid = studentMap[p.studentEmail];
    await db.query(`
      INSERT INTO portfolios (
        student_id, title, category, description, skills, repo_link, demo_link,
        status, is_verified, score, badge, teacher_feedback, reviewed_by, reviewed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    `, [
      sid, p.title, p.category, p.description, p.skills, p.repo_link, p.demo_link,
      p.status, p.is_verified, p.score, p.badge, p.teacher_feedback,
      p.status !== 'PENDING' ? guruId : null,
      p.status !== 'PENDING' ? new Date() : null
    ]);
  }
  console.log(`✅ ${portfoliosData.length} data portofolio berhasil di-seed (Pending, Approved, Revision)`);

  // 5. Seed PKL Placements
  await db.query('DELETE FROM pkl_placements');
  const ptAllanId = partnerByName['PT ALLAN'] || Object.values(partnerByName)[0];
  const ptTelkomId = partnerByName['PT Telkom Indonesia'] || ptAllanId;
  const studioId = partnerByName['Studio Digital Kreatif'] || ptAllanId;

  const pklData = [
    {
      studentId: studentMap['murid@cdgs.local'],
      partnerId: ptAllanId,
      status: 'Aktif',
      start_date: '2026-08-01',
      end_date: '2026-12-01',
      attendance_rate: 98,
      score: 93.5,
      supervisor_notes: 'Muhammad Razan menunjukkan dedikasi luar biasa dalam pengembangan modul backend dan cepat beradaptasi dengan stack produksi.'
    },
    {
      studentId: studentMap['dewi.lestari@cdgs.local'],
      partnerId: studioId,
      status: 'Aktif',
      start_date: '2026-08-15',
      end_date: '2026-12-15',
      attendance_rate: 100,
      score: 95.0,
      supervisor_notes: 'Dewi aktif merancang wireframe untuk klien industri dan memiliki kemampuan komunikasi tim yang sangat baik.'
    },
    {
      studentId: studentMap['farhan.maulana@cdgs.local'],
      partnerId: ptTelkomId,
      status: 'Aktif',
      start_date: '2026-09-01',
      end_date: '2026-12-30',
      attendance_rate: 94,
      score: 89.0,
      supervisor_notes: 'Farhan terampil dalam troubleshooting routing dan monitoring trafik fiber optic.'
    }
  ];

  for (const pk of pklData) {
    await db.query(`
      INSERT INTO pkl_placements (
        student_id, partner_id, mentor_id, status, start_date, end_date, attendance_rate, score, supervisor_notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [pk.studentId, pk.partnerId, guruId, pk.status, pk.start_date, pk.end_date, pk.attendance_rate, pk.score, pk.supervisor_notes]);
  }
  console.log(`✅ ${pklData.length} data penempatan PKL binaan guru berhasil di-seed`);

  // 6. Seed Guidance Sessions (Jurnal Bimbingan)
  await db.query('DELETE FROM guidance_sessions');
  const sessions = [
    {
      studentId: studentMap['murid@cdgs.local'],
      sessionDate: '2026-10-15',
      topic: 'Review Portofolio POS & Kesiapan Rekrutmen Industri',
      notes: 'Membahas arsitektur multi-tenant dan manajemen transaksi database. Siswa memahami alur async query dengan sangat baik.',
      actionPlan: 'Menambahkan dokumentasi Swagger/OpenAPI dan unit testing sebelum diajukan ke DUDI mitra.'
    },
    {
      studentId: studentMap['dewi.lestari@cdgs.local'],
      sessionDate: '2026-10-18',
      topic: 'Evaluasi Portofolio UI/UX & Persiapan Magang',
      notes: 'Siswa mempresentasikan studi kasus mobile portal magang. Prinsip visual hierarchy dan contrast ratio sudah tepat.',
      actionPlan: 'Mempublikasikan studi kasus ke Behance dan menautkan prototype interaktif Figma.'
    },
    {
      studentId: studentMap['farhan.maulana@cdgs.local'],
      sessionDate: '2026-10-22',
      topic: 'Pembinaan Lomba Kompetensi Siswa (LKS) IT Network System',
      notes: 'Simulasi topologi konfigurasi BGP router dan setup VPN WireGuard dengan waktu pengerjaan 120 menit.',
      actionPlan: 'Latihan mandiri konfigurasi failover gateway dan review keamanan firewall IPTables.'
    }
  ];

  for (const gs of sessions) {
    await db.query(`
      INSERT INTO guidance_sessions (teacher_id, student_id, session_date, topic, notes, action_plan, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [guruId, gs.studentId, gs.sessionDate, gs.topic, gs.notes, gs.actionPlan]);
  }
  console.log(`✅ ${sessions.length} catatan sesi bimbingan siswa berhasil di-seed`);

  console.log('\n🎉 Seluruh proses migrasi dan seeding data Guru selesai dengan sukses!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Gagal menjalankan migrasi & seeding:', err);
  process.exit(1);
});
