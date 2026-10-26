const db = require('../../config/database');

// ====================================================
// 1. Ambil Semua Roles
// ====================================================
const getAllRoles = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description FROM roles ORDER BY name ASC'
    );

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data roles',
      data: result.rows
    });
  } catch (error) {
    console.error('Error getAllRoles:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data roles',
      error: error.message
    });
  }
};

// ====================================================
// 2. Ambil Role Berdasarkan ID
// ====================================================
const getRoleById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT id, name, description FROM roles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getRoleById:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data role',
      error: error.message
    });
  }
};

// ====================================================
// 3. Buat Role Baru
// ====================================================
const createRole = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Nama role wajib diisi'
    });
  }

  try {
    const result = await db.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Role berhasil dibuat',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createRole:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Role dengan nama tersebut sudah ada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal membuat role',
      error: error.message
    });
  }
};

// ====================================================
// 4. Update Role
// ====================================================
const updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const result = await db.query(
      `UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name || null, description || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updateRole:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Role dengan nama tersebut sudah ada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui role',
      error: error.message
    });
  }
};

// ====================================================
// 5. Hapus Role
// ====================================================
const deleteRole = async (req, res) => {
  const { id } = req.params;

  try {
    // Cek apakah role masih digunakan oleh user
    const usageCheck = await db.query(
      'SELECT COUNT(*) FROM user_roles WHERE role_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Role tidak bisa dihapus karena masih digunakan oleh user'
      });
    }

    const result = await db.query(
      'DELETE FROM roles WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleteRole:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus role',
      error: error.message
    });
  }
};

// ====================================================
// 6. Assign Role ke User
// ====================================================
const assignRoleToUser = async (req, res) => {
  const { user_id, role_id } = req.body;

  if (!user_id || !role_id) {
    return res.status(400).json({
      success: false,
      message: 'user_id dan role_id wajib diisi'
    });
  }

  try {
    // Validasi: cek apakah user dan role ada
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const roleCheck = await db.query('SELECT id, name FROM roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }

    const result = await db.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) RETURNING *',
      [user_id, role_id]
    );

    res.status(201).json({
      success: true,
      message: `Role "${roleCheck.rows[0].name}" berhasil diberikan ke user`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error assignRoleToUser:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'User sudah memiliki role tersebut'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memberikan role ke user',
      error: error.message
    });
  }
};

// ====================================================
// 7. Hapus Role dari User
// ====================================================
const removeRoleFromUser = async (req, res) => {
  const { user_id, role_id } = req.body;

  if (!user_id || !role_id) {
    return res.status(400).json({
      success: false,
      message: 'user_id dan role_id wajib diisi'
    });
  }

  try {
    const result = await db.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *',
      [user_id, role_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Relasi user-role tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role berhasil dihapus dari user'
    });
  } catch (error) {
    console.error('Error removeRoleFromUser:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus role dari user',
      error: error.message
    });
  }
};

// ====================================================
// 8. Ambil Semua Roles Milik User Tertentu
// ====================================================
const getUserRoles = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      `SELECT r.id, r.name, r.description
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.name ASC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getUserRoles:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil roles user',
      error: error.message
    });
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles
};
