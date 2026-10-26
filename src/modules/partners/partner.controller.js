const pool = require('../../config/database'); // Sesuaikan jika nama file DB kamu database.js
const crypto = require('crypto');
// 1. Get All Partners (Mitra DUDI & PTN)
async function getPartners(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, category, address, contact_person, phone, created_at FROM partners ORDER BY created_at DESC'
    );
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getPartners:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data mitra' });
  }
}

// 2. Add New Partner
async function createPartner(req, res) {
  const { name, category, address, contact_person, contactPerson, phone } = req.body;

  if (!name || !category) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nama dan Kategori Mitra wajib diisi' 
    });
  }

  try {
    const partnerId = crypto.randomUUID();
    const cp = contact_person || contactPerson || null;

    const query = `
      INSERT INTO partners (id, name, category, address, contact_person, phone, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;

    const values = [partnerId, name, category, address || null, cp, phone || null];
    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Mitra berhasil ditambahkan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createPartner:', error);

    return res.status(500).json({ 
      success: false, 
      message: 'Gagal menambah mitra',
      error: error.message 
    });
  }
}

async function updatePartner(req, res) {
  const { id } = req.params;
  const { name, category, contact_person, phone } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Nama Instansi dan Kategori wajib diisi'
    });
  }

  try {
    const query = `
      UPDATE partners
      SET name = $1, category = $2, contact_person = $3, phone = $4
      WHERE id = $5
      RETURNING *;
    `;
    const values = [name, category, contact_person, phone, id];
    const result = await db.query(query, values); // Sesuaikan 'db' atau 'pool' dengan file kamu

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data mitra tidak ditemukan'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Data mitra berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error update partner:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data mitra',
      error: error.message
    });
  }
}
// 3. Delete Partner
async function deletePartner(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM partners WHERE id = $1 RETURNING id', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan' });
    }

    return res.status(200).json({ success: true, message: 'Mitra berhasil dihapus' });
  } catch (error) {
    console.error('Error deletePartner:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus mitra' });
  }
}

// EXPORT HARUS DI PALING BAWAH
module.exports = {
  getPartners,
  createPartner,
  deletePartner,
  updatePartner
};