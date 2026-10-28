const db = require('../../config/database');

// Helper untuk mendapatkan student_id aktif (user yang login atau fallback ke akun demo murid@cdgs.local)
async function getEffectiveStudentId(req) {
  if (req.user && req.user.id) {
    // Cek apakah user adalah murid
    const roleRes = await db.query(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [req.user.id]);
    const isMurid = roleRes.rows.some(r => r.name.toLowerCase() === 'murid');
    if (isMurid) {
      return req.user.id;
    }
  }

  // Jika query memberikan student_id spesifik
  if (req.query.student_id) {
    return req.query.student_id;
  }

  // Fallback ke akun demo murid@cdgs.local
  const demoMurid = await db.query("SELECT id FROM users WHERE email = 'murid@cdgs.local'");
  return demoMurid.rows[0]?.id || null;
}

// ============================================================================
// 1. PROFIL TALENTA SISWA
// ============================================================================
async function getStudentProfile(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan' });
    }

    const query = `
      SELECT 
        u.id AS user_id,
        u.email,
        sp.nisn,
        COALESCE(sp.full_name, split_part(u.email, '@', 1)) AS full_name,
        COALESCE(sp.class_name, 'XII RPL 1') AS class_name,
        COALESCE(sp.major, 'Rekayasa Perangkat Lunak') AS major,
        COALESCE(sp.skills, 'JavaScript, Node.js, PostgreSQL') AS skills,
        sp.is_recommended,
        sp.mentor_id,
        gu.email AS mentor_email
      FROM users u
      LEFT JOIN students_profile sp ON sp.user_id = u.id
      LEFT JOIN users gu ON gu.id = sp.mentor_id
      WHERE u.id = $1;
    `;

    const result = await db.query(query, [studentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profil siswa tidak ditemukan' });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getStudentProfile:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil profil siswa', error: error.message });
  }
}

async function updateStudentProfile(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const { full_name, nisn, class_name, major, skills } = req.body;

    if (!full_name) {
      return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi' });
    }

    const query = `
      INSERT INTO students_profile (user_id, nisn, full_name, class_name, major, skills, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        nisn = COALESCE(EXCLUDED.nisn, students_profile.nisn),
        full_name = EXCLUDED.full_name,
        class_name = COALESCE(EXCLUDED.class_name, students_profile.class_name),
        major = COALESCE(EXCLUDED.major, students_profile.major),
        skills = COALESCE(EXCLUDED.skills, students_profile.skills),
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [studentId, nisn || null, full_name, class_name || null, major || null, skills || null]);

    return res.status(200).json({
      success: true,
      message: 'Profil talenta berhasil diperbarui!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updateStudentProfile:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui profil', error: error.message });
  }
}

// ============================================================================
// 2. STATISTIK TALENTA SISWA (PERSONAL STATS)
// ============================================================================
async function getStudentStats(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    // Hitung portofolio
    const portRes = await db.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS verified,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending,
        COUNT(CASE WHEN status = 'REVISION' THEN 1 END) AS revision,
        AVG(CASE WHEN score IS NOT NULL THEN score END) AS avg_score,
        COUNT(DISTINCT badge) FILTER (WHERE badge IS NOT NULL) AS badge_count
      FROM portfolios
      WHERE student_id = $1
    `, [studentId]);

    // Data PKL
    const pklRes = await db.query(`
      SELECT pkl.status, pkl.attendance_rate, pkl.score, pt.name AS partner_name
      FROM pkl_placements pkl
      LEFT JOIN partners pt ON pt.id = pkl.partner_id
      WHERE pkl.student_id = $1
      LIMIT 1
    `, [studentId]);

    // Jumlah lowongan magang
    const vacRes = await db.query("SELECT COUNT(*) FROM internship_vacancies WHERE status = 'OPEN'");

    const pData = portRes.rows[0];
    const avgScore = pData.avg_score ? parseFloat(pData.avg_score) : 85.0;
    const verifiedCount = parseInt(pData.verified || 0);

    // Hitung indeks kesiapan industri: kombinasi avg_score + bonus per portofolio verified
    const readinessIndex = Math.min(99, Math.round(avgScore * 0.8 + verifiedCount * 5));

    return res.status(200).json({
      success: true,
      data: {
        total_portfolios: parseInt(pData.total || 0),
        verified_count: verifiedCount,
        pending_count: parseInt(pData.pending || 0),
        revision_count: parseInt(pData.revision || 0),
        avg_score: avgScore.toFixed(1),
        readiness_score: readinessIndex,
        badge_count: parseInt(pData.badge_count || 0),
        available_vacancies: parseInt(vacRes.rows[0]?.count || 0),
        pkl: pklRes.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Error getStudentStats:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil statistik siswa', error: error.message });
  }
}

// ============================================================================
// 3. PORTOFOLIO SAYA (CRUD)
// ============================================================================
async function getStudentPortfolios(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const { status, search } = req.query;

    let query = `
      SELECT 
        p.*,
        gu.email AS reviewer_email
      FROM portfolios p
      LEFT JOIN users gu ON gu.id = p.reviewed_by
      WHERE p.student_id = $1
    `;
    const params = [studentId];

    if (status && status !== 'ALL') {
      params.push(status.toUpperCase());
      query += ` AND UPPER(p.status) = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.title ILIKE $${params.length} OR p.skills ILIKE $${params.length} OR p.category ILIKE $${params.length})`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await db.query(query, params);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getStudentPortfolios:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil portofolio', error: error.message });
  }
}

async function createStudentPortfolio(req, res) {
  const { title, category, description, skills, repo_link, demo_link } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, message: 'Judul dan Kategori wajib diisi' });
  }

  try {
    const studentId = await getEffectiveStudentId(req);

    const query = `
      INSERT INTO portfolios (
        id, student_id, title, category, description, skills, repo_link, demo_link,
        status, is_verified, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'PENDING', false, NOW(), NOW()
      ) RETURNING *;
    `;

    const result = await db.query(query, [
      studentId, title, category, description || null, skills || null, repo_link || null, demo_link || null
    ]);

    return res.status(201).json({
      success: true,
      message: 'Karya proyek berhasil diunggah dan diajukan ke antrean validasi guru pembimbing!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createStudentPortfolio:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengunggah portofolio', error: error.message });
  }
}

async function updateStudentPortfolio(req, res) {
  const { id } = req.params;
  const { title, category, description, skills, repo_link, demo_link } = req.body;

  try {
    const studentId = await getEffectiveStudentId(req);

    // Cek kepemilikan
    const check = await db.query('SELECT * FROM portfolios WHERE id = $1 AND student_id = $2', [id, studentId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Portofolio tidak ditemukan atau bukan milik Anda' });
    }

    // Jika sebelumnya berstatus REVISION, update otomatis mengembalikan ke PENDING untuk di-review ulang
    const isRevision = check.rows[0].status === 'REVISION';
    const nextStatus = isRevision ? 'PENDING' : check.rows[0].status;

    const query = `
      UPDATE portfolios
      SET 
        title = COALESCE($1, title),
        category = COALESCE($2, category),
        description = COALESCE($3, description),
        skills = COALESCE($4, skills),
        repo_link = COALESCE($5, repo_link),
        demo_link = COALESCE($6, demo_link),
        status = $7,
        updated_at = NOW()
      WHERE id = $8 AND student_id = $9
      RETURNING *;
    `;

    const result = await db.query(query, [
      title || null, category || null, description || null, skills || null,
      repo_link || null, demo_link || null, nextStatus, id, studentId
    ]);

    return res.status(200).json({
      success: true,
      message: isRevision 
        ? 'Perbaikan portofolio berhasil disimpan dan diajukan kembali ke guru pembimbing!' 
        : 'Portofolio berhasil diperbarui!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updateStudentPortfolio:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui portofolio', error: error.message });
  }
}

async function deleteStudentPortfolio(req, res) {
  const { id } = req.params;

  try {
    const studentId = await getEffectiveStudentId(req);
    const result = await db.query(
      'DELETE FROM portfolios WHERE id = $1 AND student_id = $2 RETURNING id',
      [id, studentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Portofolio tidak ditemukan' });
    }

    return res.status(200).json({ success: true, message: 'Portofolio berhasil dihapus' });
  } catch (error) {
    console.error('Error deleteStudentPortfolio:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus portofolio', error: error.message });
  }
}

// ============================================================================
// 4. LENCANA KEAHLIAN (EARNED BADGES)
// ============================================================================
async function getStudentBadges(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const query = `
      SELECT 
        p.id AS portfolio_id,
        p.title AS project_title,
        p.category,
        p.badge,
        p.score,
        p.teacher_feedback,
        p.reviewed_at,
        gu.email AS reviewer_email
      FROM portfolios p
      LEFT JOIN users gu ON gu.id = p.reviewed_by
      WHERE p.student_id = $1 AND p.status = 'APPROVED' AND p.badge IS NOT NULL
      ORDER BY p.reviewed_at DESC;
    `;

    const result = await db.query(query, [studentId]);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getStudentBadges:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil lencana siswa', error: error.message });
  }
}

// ============================================================================
// 5. STATUS PKL & JURNAL BIMBINGAN SISWA
// ============================================================================
async function getStudentPKL(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const query = `
      SELECT 
        pkl.*,
        pt.name AS partner_name,
        pt.category AS partner_category,
        pt.address AS partner_address,
        pt.contact_person AS partner_contact,
        pt.phone AS partner_phone,
        gu.email AS mentor_email
      FROM pkl_placements pkl
      LEFT JOIN partners pt ON pt.id = pkl.partner_id
      LEFT JOIN users gu ON gu.id = pkl.mentor_id
      WHERE pkl.student_id = $1
      ORDER BY pkl.created_at DESC
      LIMIT 1;
    `;

    const result = await db.query(query, [studentId]);
    return res.status(200).json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    console.error('Error getStudentPKL:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data PKL', error: error.message });
  }
}

async function getStudentGuidance(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const query = `
      SELECT 
        gs.*,
        tu.email AS teacher_email
      FROM guidance_sessions gs
      LEFT JOIN users tu ON tu.id = gs.teacher_id
      WHERE gs.student_id = $1
      ORDER BY gs.session_date DESC, gs.created_at DESC;
    `;

    const result = await db.query(query, [studentId]);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getStudentGuidance:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat bimbingan', error: error.message });
  }
}

// ============================================================================
// 6. LOWONGAN & PELUANG MAGANG DUDI
// ============================================================================
async function getVacancies(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const query = `
      SELECT 
        v.*,
        pt.name AS partner_name,
        pt.category AS partner_category,
        pt.address AS partner_address,
        ia.id AS application_id,
        ia.status AS application_status,
        ia.applied_at
      FROM internship_vacancies v
      JOIN partners pt ON pt.id = v.partner_id
      LEFT JOIN internship_applications ia ON ia.vacancy_id = v.id AND ia.student_id = $1
      WHERE v.status = 'OPEN'
      ORDER BY v.created_at DESC;
    `;

    const result = await db.query(query, [studentId]);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getVacancies:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil lowongan magang', error: error.message });
  }
}

async function applyVacancy(req, res) {
  const vacancy_id = req.body.vacancy_id || req.params.id;
  const { notes } = req.body;

  if (!vacancy_id) {
    return res.status(400).json({ success: false, message: 'Lowongan magang wajib dipilih' });
  }

  try {
    const studentId = await getEffectiveStudentId(req);

    // Ambil partner_id dari vacancy
    const vacRes = await db.query('SELECT partner_id, title FROM internship_vacancies WHERE id = $1', [vacancy_id]);
    if (vacRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lowongan magang tidak ditemukan' });
    }
    const partnerId = vacRes.rows[0].partner_id;

    const query = `
      INSERT INTO internship_applications (id, vacancy_id, student_id, partner_id, notes, status, applied_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Menunggu Tinjauan', NOW())
      ON CONFLICT (student_id, vacancy_id) DO UPDATE SET
        notes = EXCLUDED.notes,
        applied_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [vacancy_id, studentId, partnerId, notes || 'Mengajukan minat magang industri.']);

    return res.status(201).json({
      success: true,
      message: `🎉 Lamaran untuk posisi "${vacRes.rows[0].title}" berhasil diajukan ke mitra industri!`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error applyVacancy:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengajukan lamaran magang', error: error.message });
  }
}

// ============================================================================
// 7. CV & RESUME PORTOFOLIO DIGITAL (PRINT-READY)
// ============================================================================
async function getStudentResume(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);

    // Profile
    const profRes = await db.query(`
      SELECT sp.*, u.email 
      FROM users u
      LEFT JOIN students_profile sp ON sp.user_id = u.id
      WHERE u.id = $1
    `, [studentId]);

    // Verified Portfolios
    const portRes = await db.query(`
      SELECT * FROM portfolios 
      WHERE student_id = $1 AND status = 'APPROVED'
      ORDER BY score DESC NULLS LAST, created_at DESC
    `, [studentId]);

    // PKL Info
    const pklRes = await db.query(`
      SELECT pkl.*, pt.name AS partner_name
      FROM pkl_placements pkl
      LEFT JOIN partners pt ON pt.id = pkl.partner_id
      WHERE pkl.student_id = $1
    `, [studentId]);

    return res.status(200).json({
      success: true,
      profile: profRes.rows[0] || null,
      verified_portfolios: portRes.rows,
      pkl: pklRes.rows[0] || null,
      generated_at: new Date()
    });
  } catch (error) {
    console.error('Error getStudentResume:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat resume talenta', error: error.message });
  }
}

// ============================================================================
// 8. UNDANGAN MAGANG / WAWANCARA DUDI MASUK KE SISWA
// ============================================================================
async function getStudentInvitations(req, res) {
  try {
    const studentId = await getEffectiveStudentId(req);
    const query = `
      SELECT 
        inv.*,
        to_char(inv.created_at, 'DD Mon YYYY, HH24:MI') as created_at_fmt,
        pt.category as partner_category,
        pt.address as partner_address
      FROM internship_invitations inv
      LEFT JOIN partners pt ON pt.id = inv.partner_id
      WHERE inv.student_id = $1 OR inv.student_name ILIKE '%Razan%'
      ORDER BY inv.created_at DESC;
    `;

    const result = await db.query(query, [studentId]);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getStudentInvitations:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data undangan magang', error: error.message });
  }
}

async function respondInvitation(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['ACCEPTED', 'REJECTED'].includes(status.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Status tanggapan wajib ACCEPTED atau REJECTED' });
  }

  try {
    const updateRes = await db.query(`
      UPDATE internship_invitations 
      SET status = $1, responded_at = NOW()
      WHERE id = $2
      RETURNING *;
    `, [status.toUpperCase(), id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Undangan tidak ditemukan' });
    }

    const item = updateRes.rows[0];
    const statusText = status.toUpperCase() === 'ACCEPTED' ? 'diterima' : 'ditolak';

    return res.status(200).json({
      success: true,
      message: `Undangan magang dari ${item.partner_name} untuk posisi "${item.position}" berhasil ${statusText}!`,
      data: item
    });
  } catch (error) {
    console.error('Error respondInvitation:', error);
    return res.status(500).json({ success: false, message: 'Gagal menanggapi undangan', error: error.message });
  }
}

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  getStudentStats,
  getStudentPortfolios,
  createStudentPortfolio,
  updateStudentPortfolio,
  deleteStudentPortfolio,
  getStudentBadges,
  getStudentPKL,
  getStudentGuidance,
  getVacancies,
  applyVacancy,
  getStudentResume,
  getStudentInvitations,
  respondInvitation
};
