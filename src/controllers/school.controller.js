const crypto = require('crypto');
const pool = require('../config/database');


/**
 * 1. Tambah Data Sekolah Baru (POST)
 */
async function createSchool(req, res) {
  const { npsn, name, level, status, accreditation, address } = req.body;

  // Validasi field wajib
  if (!npsn || !name || !level || !status) {
    return res.status(400).json({
      success: false,
      message: 'NPSN, Nama Sekolah, Jenjang, dan Status wajib diisi'
    });
  }

  try {
    const schoolId = crypto.randomUUID();
    const query = `
      INSERT INTO schools (id, npsn, name, level, status, accreditation, address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
    `;

    const values = [
      schoolId,
      npsn,
      name,
      level,
      status,
      accreditation || null,
      address || null
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Sekolah berhasil ditambahkan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createSchool:', error);

    // Kode error PostgreSQL 23505 = NPSN duplikat (unique key constraint)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'NPSN sudah terdaftar di sistem'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal menambah data sekolah',
      error: error.message
    });
  }
}

/**
 * 2. Ambil Seluruh Data Sekolah (GET)
 */
async function getSchools(req, res) {
  try {
    const query = 'SELECT * FROM schools ORDER BY created_at DESC';
    const result = await pool.query(query);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getSchools:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data sekolah',
      error: error.message
    });
  }
}

/**
 * 3. Hapus Data Sekolah (DELETE)
 */
async function deleteSchool(req, res) {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM schools WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data sekolah tidak ditemukan'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sekolah berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleteSchool:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus data sekolah',
      error: error.message
    });
  }
}

const updateSchool = async (req, res) => {
  const { id } = req.params;
  const { npsn, name, level, status, accreditation, address } = req.body;

  try {
    const query = `
      UPDATE schools
      SET npsn = $1, name = $2, level = $3, status = $4, accreditation = $5, address = $6
      WHERE id = $7
      RETURNING *;
    `;
    const values = [npsn, name, level, status, accreditation, address, id];
    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });
    }

    res.status(200).json({
      success: true,
      message: 'Data sekolah berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui data sekolah', error: error.message });
  }
};

// Eksport ketiga fungsi agar dapat diakses oleh school.router.js
module.exports = {
  createSchool,
  getSchools,
  deleteSchool,
  updateSchool
};