const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Registrasi User Baru (Admin Sekolah, Guru, Siswa, dll)
const registerUser = async (req, res) => {
  const { tenant_id, school_id, email, password } = req.body;

  try {
    // Cek apakah email sudah terdaftar
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenant_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar pada sekolah/tenant ini' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Simpan User Baru
    const userResult = await db.query(
      'INSERT INTO users (tenant_id, school_id, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, created_at',
      [tenant_id, school_id, email, passwordHash]
    );
    const user = userResult.rows[0];

    res.status(201).json({
      message: 'User berhasil didaftarkan',
      user: {
        id: user.id,
        email: user.email,
        tenant_id,
        school_id
      }
    });
  } catch (error) {
    console.error('Error registerUser:', error);
    res.status(500).json({ error: 'Gagal meregistrasi user: ' + error.message });
  }
};

// 2. Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Ambil role dari user_roles -> roles
    const roleResult = await db.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.name
       LIMIT 1`,
      [user.id]
    );
    const role = roleResult.rows.length > 0 ? roleResult.rows[0].name : null;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        school_id: user.school_id,
        role
      },
      process.env.JWT_SECRET || 'super_secret_jwt_key_cdgs',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        school_id: user.school_id,
        role
      }
    });
  } catch (error) {
    console.error('Error loginUser:', error);
    res.status(500).json({ error: 'Gagal login: ' + error.message });
  }
};

module.exports = { registerUser, loginUser };
// ... kode login / register yang sudah ada sebelumnya ...

const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Berhasil mengambil data profil",
      user: req.user
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PASTIKAN getMe terdaftar di dalam object exports ini:
module.exports = {
  registerUser,
  loginUser,
  getMe
}