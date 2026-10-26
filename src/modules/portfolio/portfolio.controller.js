const db = require('../../config/database');

// 1. Get All Portfolios (atau filter berdasarkan student_id)
async function getPortfolios(req, res) {
  try {
    const { student_id, status } = req.query;
    let query = `
      SELECT 
        p.*,
        COALESCE(sp.full_name, u.email) as student_name,
        sp.class_name,
        sp.major,
        sp.nisn
      FROM portfolios p
      JOIN users u ON u.id = p.student_id
      LEFT JOIN students_profile sp ON sp.user_id = p.student_id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      params.push(student_id);
      query += ` AND p.student_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND UPPER(p.status) = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await db.query(query, params);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getPortfolios:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data portofolio', error: error.message });
  }
}

// 2. Create Portfolio (Siswa mengunggah proyek baru)
async function createPortfolio(req, res) {
  const { title, category, description, skills, repo_link, demo_link } = req.body;

  if (!title || !category) {
    return res.status(400).json({
      success: false,
      message: 'Judul dan Kategori portofolio wajib diisi'
    });
  }

  try {
    // Cari student_id: gunakan user yang login, atau fallback ke akun murid demo
    let studentId = req.user?.id;
    if (!studentId) {
      const demoMurid = await db.query("SELECT id FROM users WHERE email = 'murid@cdgs.local'");
      studentId = demoMurid.rows[0]?.id;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'User siswa tidak valid' });
    }

    const query = `
      INSERT INTO portfolios (
        id, student_id, title, category, description, skills, repo_link, demo_link,
        status, is_verified, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'PENDING', false, NOW(), NOW()
      )
      RETURNING *;
    `;

    const values = [
      studentId,
      title,
      category,
      description || null,
      skills || null,
      repo_link || null,
      demo_link || null
    ];

    const result = await db.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Portofolio berhasil diajukan untuk validasi guru!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createPortfolio:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengunggah portofolio',
      error: error.message
    });
  }
}

module.exports = {
  getPortfolios,
  createPortfolio
};
