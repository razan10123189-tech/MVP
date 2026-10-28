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

// 4. Kirim Undangan Magang / Wawancara ke Siswa Talenta
async function sendInvitation(req, res) {
  const { student_name, student_major, position, notes, partner_name } = req.body;

  if (!student_name || !position) {
    return res.status(400).json({
      success: false,
      message: 'Nama siswa dan posisi magang wajib diisi'
    });
  }

  try {
    // Cari user_id siswa berdasarkan nama atau fallback ke akun demo murid
    let studentId = null;
    const studentLookup = await pool.query(`
      SELECT u.id 
      FROM users u
      LEFT JOIN students_profile sp ON sp.user_id = u.id
      WHERE sp.full_name ILIKE $1 OR u.email ILIKE $1
      LIMIT 1
    `, [`%${student_name.trim()}%`]);

    if (studentLookup.rows.length > 0) {
      studentId = studentLookup.rows[0].id;
    } else {
      const fallbackMurid = await pool.query("SELECT id FROM users WHERE email = 'murid@cdgs.local'");
      studentId = fallbackMurid.rows[0]?.id || null;
    }

    // Tentukan data partner pengirim
    let partnerId = null;
    let finalPartnerName = partner_name || 'PT Telkom Indonesia';
    const partnerLookup = await pool.query("SELECT id, name FROM partners WHERE name ILIKE $1 LIMIT 1", [`%${finalPartnerName}%`]);
    if (partnerLookup.rows.length > 0) {
      partnerId = partnerLookup.rows[0].id;
      finalPartnerName = partnerLookup.rows[0].name;
    } else {
      const anyPartner = await pool.query("SELECT id, name FROM partners WHERE category = 'DUDI' LIMIT 1");
      if (anyPartner.rows.length > 0) {
        partnerId = anyPartner.rows[0].id;
        finalPartnerName = anyPartner.rows[0].name;
      }
    }

    const query = `
      INSERT INTO internship_invitations (id, student_id, student_name, student_major, partner_id, partner_name, position, notes, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW())
      RETURNING *;
    `;
    const result = await pool.query(query, [
      studentId,
      student_name,
      student_major || 'Rekayasa Perangkat Lunak',
      partnerId,
      finalPartnerName,
      position,
      notes || 'Kami mengundang Anda untuk mengikuti proses wawancara dan program magang industri di perusahaan kami.'
    ]);

    return res.status(201).json({
      success: true,
      message: `Undangan magang untuk posisi "${position}" berhasil dikirim ke ${student_name} dan masuk ke akun siswa!`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error sendInvitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirimkan undangan magang',
      error: error.message
    });
  }
}

// 5. Ambil Daftar Undangan Terkirim (Untuk Instansi)
async function getPartnerInvitations(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        inv.*,
        to_char(inv.created_at, 'DD Mon YYYY, HH24:MI') as created_at_fmt
      FROM internship_invitations inv
      ORDER BY inv.created_at DESC
    `);
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getPartnerInvitations:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar undangan',
      error: error.message
    });
  }
}

// EXPORT HARUS DI PALING BAWAH
module.exports = {
  getPartners,
  createPartner,
  deletePartner,
  updatePartner,
  sendInvitation,
  getPartnerInvitations
};