const db = require('../../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ============================================================================
// 1. STATISTIK GURU (DASHBOARD SUMMARY)
// ============================================================================
async function getGuruStats(req, res) {
  try {
    // 1. Total Siswa Bimbingan
    const studentsRes = await db.query(
      `SELECT COUNT(*) FROM students_profile`
    );

    // 2. Portofolio Menunggu Validasi
    const pendingRes = await db.query(
      `SELECT COUNT(*) FROM portfolios WHERE status = 'PENDING'`
    );

    // 3. Siswa Sedang PKL Aktif
    const pklRes = await db.query(
      `SELECT COUNT(*) FROM pkl_placements WHERE status ILIKE 'aktif%' OR status = 'ACTIVE'`
    );

    // 4. Portofolio Tervalidasi / Disetujui
    const verifiedRes = await db.query(
      `SELECT COUNT(*) FROM portfolios WHERE status = 'APPROVED' OR is_verified = true`
    );

    // 5. Total Sesi Bimbingan
    const guidanceRes = await db.query(
      `SELECT COUNT(*) FROM guidance_sessions`
    );

    return res.status(200).json({
      success: true,
      data: {
        total_students: parseInt(studentsRes.rows[0]?.count || 0),
        pending_reviews: parseInt(pendingRes.rows[0]?.count || 0),
        active_pkl: parseInt(pklRes.rows[0]?.count || 0),
        verified_portfolios: parseInt(verifiedRes.rows[0]?.count || 0),
        total_guidance: parseInt(guidanceRes.rows[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Error getGuruStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data statistik guru',
      error: error.message
    });
  }
}

// ============================================================================
// 2. ANTREAN VALIDASI PORTOFOLIO (REVIEW QUEUE)
// ============================================================================
async function getPortfoliosQueue(req, res) {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT 
        p.id,
        p.student_id,
        p.title,
        p.category,
        p.description,
        p.skills,
        p.repo_link,
        p.demo_link,
        p.status,
        p.is_verified,
        p.score,
        p.badge,
        p.teacher_feedback,
        p.created_at,
        p.reviewed_at,
        COALESCE(sp.full_name, u.email) AS student_name,
        sp.class_name,
        sp.major,
        sp.nisn,
        u.email AS student_email,
        gu.email AS reviewer_email
      FROM portfolios p
      JOIN users u ON u.id = p.student_id
      LEFT JOIN students_profile sp ON sp.user_id = p.student_id
      LEFT JOIN users gu ON gu.id = p.reviewed_by
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'ALL') {
      params.push(status.toUpperCase());
      query += ` AND UPPER(p.status) = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.title ILIKE $${params.length} OR sp.full_name ILIKE $${params.length} OR p.skills ILIKE $${params.length})`;
    }

    query += ` ORDER BY CASE WHEN p.status = 'PENDING' THEN 1 WHEN p.status = 'REVISION' THEN 2 ELSE 3 END, p.created_at DESC`;

    const result = await db.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getPortfoliosQueue:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil antrean portofolio',
      error: error.message
    });
  }
}

// ============================================================================
// 3. SETUJUI PORTOFOLIO & SEMATKAN BADGE
// ============================================================================
async function approvePortfolio(req, res) {
  const { id } = req.params;
  const { score, badge, teacher_feedback } = req.body;

  try {
    const reviewerId = req.user?.id || null;
    const finalScore = score !== undefined && score !== null && score !== '' ? parseFloat(score) : 90.0;
    const finalBadge = badge || '⭐ Siap Industri';
    const feedback = teacher_feedback || 'Portofolio memenuhi standar mutu keahlian industri.';

    const updateQuery = `
      UPDATE portfolios
      SET 
        status = 'APPROVED',
        is_verified = true,
        score = $1,
        badge = $2,
        teacher_feedback = $3,
        reviewed_by = COALESCE($4, reviewed_by),
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;

    const result = await db.query(updateQuery, [finalScore, finalBadge, feedback, reviewerId, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portofolio tidak ditemukan'
      });
    }

    // Catat log audit jika tabel audit_logs tersedia
    try {
      await db.query(`
        INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, payload, created_at)
        VALUES (gen_random_uuid(), $1, $2, 'APPROVE_PORTFOLIO', 'portfolios', $3, NOW())
      `, [
        req.user?.tenant_id || null,
        reviewerId,
        JSON.stringify({ portfolio_id: id, score: finalScore, badge: finalBadge })
      ]);
    } catch (auditErr) {
      // Abaikan jika audit_logs belum disinkron
    }

    return res.status(200).json({
      success: true,
      message: `Portofolio berhasil divalidasi dan lencana "${finalBadge}" disematkan!`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error approvePortfolio:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyetujui portofolio',
      error: error.message
    });
  }
}

// ============================================================================
// 4. MINTA REVISI PORTOFOLIO
// ============================================================================
async function revisePortfolio(req, res) {
  const { id } = req.params;
  const { teacher_feedback, score } = req.body;

  if (!teacher_feedback || teacher_feedback.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Catatan instruksi revisi wajib diisi oleh guru'
    });
  }

  try {
    const reviewerId = req.user?.id || null;
    const finalScore = score !== undefined && score !== null && score !== '' ? parseFloat(score) : null;

    const updateQuery = `
      UPDATE portfolios
      SET 
        status = 'REVISION',
        is_verified = false,
        teacher_feedback = $1,
        score = $2,
        badge = NULL,
        reviewed_by = COALESCE($3, reviewed_by),
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;

    const result = await db.query(updateQuery, [teacher_feedback, finalScore, reviewerId, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portofolio tidak ditemukan'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Instruksi revisi portofolio telah disimpan dan diteruskan ke siswa.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error revisePortfolio:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim catatan revisi',
      error: error.message
    });
  }
}

// ============================================================================
// 5. MANAJEMEN SISWA BIMBINGAN (MENTORED STUDENTS)
// ============================================================================
async function getMentoredStudents(req, res) {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        u.id AS user_id,
        u.email,
        sp.nisn,
        sp.full_name,
        sp.class_name,
        sp.major,
        sp.skills,
        sp.is_recommended,
        COUNT(p.id) AS total_portfolios,
        COUNT(CASE WHEN p.status = 'APPROVED' THEN 1 END) AS approved_portfolios,
        COALESCE(pkl.status, 'Belum Penempatan') AS pkl_status,
        pt.name AS partner_name,
        pkl.score AS pkl_score,
        pkl.attendance_rate AS pkl_attendance,
        MAX(gs.session_date) AS last_guidance_date
      FROM users u
      LEFT JOIN students_profile sp ON sp.user_id = u.id
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id AND r.name = 'Murid'
      LEFT JOIN portfolios p ON p.student_id = u.id
      LEFT JOIN pkl_placements pkl ON pkl.student_id = u.id
      LEFT JOIN partners pt ON pt.id = pkl.partner_id
      LEFT JOIN guidance_sessions gs ON gs.student_id = u.id
      WHERE 1=1
    `;

    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (sp.full_name ILIKE $1 OR sp.nisn ILIKE $1 OR sp.class_name ILIKE $1 OR sp.skills ILIKE $1 OR u.email ILIKE $1)`;
    }

    query += `
      GROUP BY u.id, u.email, sp.nisn, sp.full_name, sp.class_name, sp.major, sp.skills, sp.is_recommended, pkl.status, pt.name, pkl.score, pkl.attendance_rate
      ORDER BY sp.full_name ASC NULLS LAST, u.email ASC
    `;

    const result = await db.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getMentoredStudents:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar siswa bimbingan',
      error: error.message
    });
  }
}

// Tambah Siswa Bimbingan Baru
async function addMentoredStudent(req, res) {
  const { full_name, email, nisn, class_name, major, skills } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Nama lengkap dan Email siswa wajib diisi'
    });
  }

  try {
    const guruId = req.user?.id || null;
    const tenantId = req.user?.tenant_id || '4eb88c5b-5b42-4c31-b16f-17dd38bc0ace';
    const schoolId = req.user?.school_id || 'fc64c2c0-f2e8-4b42-b40f-4d47b80c57a7';

    // Cek atau buat user
    let userId;
    const userExist = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      userId = userExist.rows[0].id;
    } else {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('murid123', salt);
      const newUser = await db.query(
        'INSERT INTO users (tenant_id, school_id, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
        [tenantId, schoolId, email, hash]
      );
      userId = newUser.rows[0].id;

      // Assign role Murid
      const roleRes = await db.query("SELECT id FROM roles WHERE name = 'Murid'");
      if (roleRes.rows.length > 0) {
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, roleRes.rows[0].id]
        );
      }
    }

    // Insert or update profile
    await db.query(`
      INSERT INTO students_profile (user_id, nisn, full_name, class_name, major, mentor_id, skills, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        nisn = COALESCE(EXCLUDED.nisn, students_profile.nisn),
        full_name = EXCLUDED.full_name,
        class_name = COALESCE(EXCLUDED.class_name, students_profile.class_name),
        major = COALESCE(EXCLUDED.major, students_profile.major),
        mentor_id = COALESCE(EXCLUDED.mentor_id, students_profile.mentor_id),
        skills = COALESCE(EXCLUDED.skills, students_profile.skills),
        updated_at = NOW()
    `, [userId, nisn || null, full_name, class_name || null, major || null, guruId, skills || null]);

    return res.status(201).json({
      success: true,
      message: 'Siswa berhasil didaftarkan ke kelompok bimbingan guru',
      data: { user_id: userId, full_name, email, class_name }
    });
  } catch (error) {
    console.error('Error addMentoredStudent:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan siswa bimbingan',
      error: error.message
    });
  }
}

// Rekomendasikan Siswa ke Mitra Industri (Talent Endorsement)
async function toggleRecommendation(req, res) {
  const { id } = req.params; // student user_id
  const { is_recommended } = req.body;

  try {
    const result = await db.query(
      `UPDATE students_profile SET is_recommended = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
      [Boolean(is_recommended), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil siswa tidak ditemukan'
      });
    }

    const statusText = is_recommended ? 'direkomendasikan ke mitra industri' : 'dihapus dari rekomendasi utama';
    return res.status(200).json({
      success: true,
      message: `Status talenta siswa berhasil diperbarui: Siswa ${statusText}.`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggleRecommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui rekomendasi talenta siswa',
      error: error.message
    });
  }
}

// ============================================================================
// 6. MONITORING & EVALUASI PKL / MAGANG INDUSTRI
// ============================================================================
async function getPKLPlacements(req, res) {
  try {
    const query = `
      SELECT 
        pkl.id,
        pkl.student_id,
        pkl.partner_id,
        pkl.mentor_id,
        pkl.status,
        pkl.start_date,
        pkl.end_date,
        pkl.attendance_rate,
        pkl.score,
        pkl.supervisor_notes,
        pkl.created_at,
        COALESCE(sp.full_name, u.email) AS student_name,
        sp.class_name,
        sp.major,
        sp.nisn,
        u.email AS student_email,
        pt.name AS partner_name,
        pt.category AS partner_category,
        pt.address AS partner_address,
        pt.contact_person AS partner_contact,
        pt.phone AS partner_phone
      FROM pkl_placements pkl
      JOIN users u ON u.id = pkl.student_id
      LEFT JOIN students_profile sp ON sp.user_id = pkl.student_id
      LEFT JOIN partners pt ON pt.id = pkl.partner_id
      ORDER BY pkl.created_at DESC;
    `;

    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getPKLPlacements:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data monitoring PKL',
      error: error.message
    });
  }
}

// Tambah Penempatan PKL Siswa
async function createPKLPlacement(req, res) {
  const { student_id, partner_id, start_date, end_date, status, supervisor_notes, attendance_rate } = req.body;

  if (!student_id || !partner_id) {
    return res.status(400).json({
      success: false,
      message: 'Siswa dan Mitra Industri PKL wajib dipilih'
    });
  }

  try {
    const mentorId = req.user?.id || null;
    const query = `
      INSERT INTO pkl_placements (
        id, student_id, partner_id, mentor_id, status, start_date, end_date,
        attendance_rate, supervisor_notes, created_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;

    const values = [
      student_id,
      partner_id,
      mentorId,
      status || 'Aktif',
      start_date || new Date(),
      end_date || null,
      attendance_rate ? parseInt(attendance_rate) : 100,
      supervisor_notes || null
    ];

    const result = await db.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Penempatan PKL siswa berhasil dicatat',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createPKLPlacement:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan penempatan PKL',
      error: error.message
    });
  }
}

// Evaluasi & Beri Nilai PKL oleh Guru Pembimbing
async function evaluatePKLPlacement(req, res) {
  const { id } = req.params;
  const { score, attendance_rate, supervisor_notes, status } = req.body;

  try {
    const query = `
      UPDATE pkl_placements
      SET 
        score = COALESCE($1, score),
        attendance_rate = COALESCE($2, attendance_rate),
        supervisor_notes = COALESCE($3, supervisor_notes),
        status = COALESCE($4, status)
      WHERE id = $5
      RETURNING *;
    `;

    const values = [
      score !== undefined && score !== null && score !== '' ? parseFloat(score) : null,
      attendance_rate !== undefined && attendance_rate !== null && attendance_rate !== '' ? parseInt(attendance_rate) : null,
      supervisor_notes || null,
      status || null,
      id
    ];

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data penempatan PKL tidak ditemukan'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Evaluasi & penilaian PKL siswa berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error evaluatePKLPlacement:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui evaluasi PKL',
      error: error.message
    });
  }
}

// ============================================================================
// 7. JURNAL & CATATAN SESI BIMBINGAN SISWA
// ============================================================================
async function getGuidanceSessions(req, res) {
  try {
    const query = `
      SELECT 
        gs.id,
        gs.teacher_id,
        gs.student_id,
        gs.session_date,
        gs.topic,
        gs.notes,
        gs.action_plan,
        gs.created_at,
        COALESCE(sp.full_name, u.email) AS student_name,
        sp.class_name,
        sp.nisn,
        u.email AS student_email,
        tu.email AS teacher_email
      FROM guidance_sessions gs
      JOIN users u ON u.id = gs.student_id
      LEFT JOIN students_profile sp ON sp.user_id = gs.student_id
      LEFT JOIN users tu ON tu.id = gs.teacher_id
      ORDER BY gs.session_date DESC, gs.created_at DESC;
    `;

    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getGuidanceSessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat bimbingan',
      error: error.message
    });
  }
}

async function createGuidanceSession(req, res) {
  const { student_id, session_date, topic, notes, action_plan } = req.body;

  if (!student_id || !topic || !notes) {
    return res.status(400).json({
      success: false,
      message: 'Siswa, Topik Bimbingan, dan Catatan Guru wajib diisi'
    });
  }

  try {
    const teacherId = req.user?.id || (await db.query("SELECT id FROM users WHERE email = 'guru@cdgs.local'")).rows[0]?.id;

    const query = `
      INSERT INTO guidance_sessions (
        id, teacher_id, student_id, session_date, topic, notes, action_plan, created_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;

    const values = [
      teacherId,
      student_id,
      session_date || new Date(),
      topic,
      notes,
      action_plan || null
    ];

    const result = await db.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Catatan sesi bimbingan siswa berhasil disimpan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error createGuidanceSession:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan catatan bimbingan',
      error: error.message
    });
  }
}

async function deleteGuidanceSession(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM guidance_sessions WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Data bimbingan tidak ditemukan' });
    }
    return res.status(200).json({ success: true, message: 'Catatan bimbingan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleteGuidanceSession:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus data bimbingan' });
  }
}

// ============================================================================
// 8. LAPORAN & REKAPITULASI BIMBINGAN GURU (EXPORT-READY)
// ============================================================================
async function getGuruReport(req, res) {
  try {
    const statsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM students_profile) AS total_students,
        (SELECT COUNT(*) FROM portfolios WHERE status = 'APPROVED') AS verified_portfolios,
        (SELECT COUNT(*) FROM portfolios WHERE status = 'PENDING') AS pending_portfolios,
        (SELECT COUNT(*) FROM pkl_placements WHERE status ILIKE 'aktif%') AS active_pkl,
        (SELECT AVG(score) FROM portfolios WHERE score IS NOT NULL) AS avg_portfolio_score,
        (SELECT AVG(score) FROM pkl_placements WHERE score IS NOT NULL) AS avg_pkl_score
    `);

    const students = await db.query(`
      SELECT 
        sp.full_name,
        sp.nisn,
        sp.class_name,
        sp.major,
        sp.is_recommended,
        COUNT(p.id) AS total_projects,
        COUNT(CASE WHEN p.status = 'APPROVED' THEN 1 END) AS verified_projects,
        pt.name AS pkl_partner,
        pkl.score AS pkl_score
      FROM students_profile sp
      JOIN users u ON u.id = sp.user_id
      LEFT JOIN portfolios p ON p.student_id = u.id
      LEFT JOIN pkl_placements pkl ON pkl.student_id = u.id
      LEFT JOIN partners pt ON pt.id = pkl.partner_id
      GROUP BY sp.full_name, sp.nisn, sp.class_name, sp.major, sp.is_recommended, pt.name, pkl.score
      ORDER BY sp.full_name ASC;
    `);

    return res.status(200).json({
      success: true,
      generated_at: new Date(),
      stats: statsRes.rows[0],
      students: students.rows
    });
  } catch (error) {
    console.error('Error getGuruReport:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat laporan bimbingan',
      error: error.message
    });
  }
}

module.exports = {
  getGuruStats,
  getPortfoliosQueue,
  approvePortfolio,
  revisePortfolio,
  getMentoredStudents,
  addMentoredStudent,
  toggleRecommendation,
  getPKLPlacements,
  createPKLPlacement,
  evaluatePKLPlacement,
  getGuidanceSessions,
  createGuidanceSession,
  deleteGuidanceSession,
  getGuruReport
};
