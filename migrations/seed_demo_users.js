/**
 * Script untuk membuat akun demo masing-masing role.
 * Jalankan: node migrations/seed_demo_users.js
 */
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

const TENANT_ID = '4eb88c5b-5b42-4c31-b16f-17dd38bc0ace'; // DEV1
const SCHOOL_ID = 'fc64c2c0-f2e8-4b42-b40f-4d47b80c57a7';

const demoUsers = [
  { email: 'admin@devr.sch.id',   password: 'admin123',   role_name: 'Platform Admin' },
  { email: 'kepsek@cdgs.local',   password: 'kepsek123',   role_name: 'Kepala Sekolah' },
  { email: 'guru@cdgs.local',     password: 'guru123',     role_name: 'Guru' },
  { email: 'murid@cdgs.local',    password: 'murid123',    role_name: 'Murid' },
  { email: 'instansi@cdgs.local', password: 'instansi123', role_name: 'Instansi' },
];

async function seed() {
  console.log('🌱 Memulai seeding akun demo...\n');

  for (const u of demoUsers) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(u.password, salt);

      // Cek duplikat
      const existing = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [u.email]
      );

      if (existing.rows.length > 0) {
        await db.query(
          'UPDATE users SET password_hash = $1 WHERE email = $2',
          [hash, u.email]
        );
        console.log(`🔄 ${u.email} password diperbarui -> ${u.password}`);
        continue;
      }

      // Insert user
      const userResult = await db.query(
        'INSERT INTO users (tenant_id, school_id, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [TENANT_ID, SCHOOL_ID, u.email, hash]
      );
      const userId = userResult.rows[0].id;

      // Cari role
      const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [u.role_name]);
      if (roleResult.rows.length > 0) {
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roleResult.rows[0].id]
        );
      }

      console.log(`✅ ${u.email} -> ${u.role_name} (password: ${u.password})`);
    } catch (err) {
      console.error(`❌ Gagal seed ${u.email}:`, err.message);
    }
  }

  console.log('\n🎉 Seeding selesai!');
  process.exit(0);
}

seed();
