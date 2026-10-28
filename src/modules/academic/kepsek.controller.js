/**
 * Kepsek (Kepala Sekolah) Controller
 * Endpoint eksekutif untuk monitoring mutu sekolah secara menyeluruh.
 */
const db = require('../../config/database');

// ============================================================================
// 1. STATISTIK EKSEKUTIF SEKOLAH
// ============================================================================
const getExecutiveStats = async (req, res) => {
  try {
    const [
      activeStudents,
      verifiedPortfolios,
      activePartners,
      pklPlacements,
      totalPortfolios,
      guidanceSessions
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM students_profile WHERE is_active = true`),
      db.query(`SELECT COUNT(*) AS total FROM portfolios WHERE status = 'verified'`),
      db.query(`SELECT COUNT(*) AS total FROM partners WHERE is_active = true`),
      db.query(`SELECT COUNT(*) AS total FROM pkl_placements`),
      db.query(`SELECT COUNT(*) AS total FROM portfolios`),
      db.query(`SELECT COUNT(*) AS total FROM guidance_sessions`)
    ]);

    const total = parseInt(activeStudents.rows[0]?.total || 0);
    const placed = parseInt(pklPlacements.rows[0]?.total || 0);
    const pklRate = total > 0 ? ((placed / total) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: {
        total_active_students: total,
        verified_portfolios: parseInt(verifiedPortfolios.rows[0]?.total || 0),
        total_portfolios: parseInt(totalPortfolios.rows[0]?.total || 0),
        active_partners: parseInt(activePartners.rows[0]?.total || 0),
        pkl_placements: placed,
        pkl_rate: parseFloat(pklRate),
        guidance_sessions: parseInt(guidanceSessions.rows[0]?.total || 0)
      }
    });
  } catch (err) {
    console.error('[Kepsek] getExecutiveStats error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik eksekutif.' });
  }
};

// ============================================================================
// 2. DISTRIBUSI TALENTA SISWA (PER JURUSAN / BIDANG)
// ============================================================================
const getTalentDistribution = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT major, COUNT(*) AS total
      FROM students_profile
      WHERE is_active = true
      GROUP BY major
      ORDER BY total DESC
    `);

    const distribution = result.rows.map(r => ({
      label: r.major || 'Umum',
      value: parseInt(r.total)
    }));

    res.json({ success: true, data: distribution });
  } catch (err) {
    console.error('[Kepsek] getTalentDistribution error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil distribusi talenta.' });
  }
};

// ============================================================================
// 3. TALENTA UNGGULAN (TOP STUDENTS)
// ============================================================================
const getTopTalents = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        sp.id,
        sp.full_name,
        sp.nis,
        sp.class_name,
        sp.major,
        sp.readiness_level,
        COUNT(p.id) FILTER (WHERE p.status = 'verified') AS verified_portfolios,
        COUNT(p.id) AS total_portfolios,
        MAX(pkl.company_name) AS pkl_partner,
        MAX(pkl.status) AS pkl_status
      FROM students_profile sp
      LEFT JOIN portfolios p ON sp.id = p.student_id
      LEFT JOIN pkl_placements pkl ON sp.id = pkl.student_id
      WHERE sp.is_active = true
      GROUP BY sp.id, sp.full_name, sp.nis, sp.class_name, sp.major, sp.readiness_level
      HAVING COUNT(p.id) FILTER (WHERE p.status = 'verified') > 0
      ORDER BY verified_portfolios DESC, sp.full_name ASC
      LIMIT 10
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Kepsek] getTopTalents error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data talenta unggulan.' });
  }
};

// ============================================================================
// 4. MANAJEMEN MoU KEMITRAAN
// ============================================================================
const getMouList = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, name, category, contact_person, phone,
        mou_number, mou_start, mou_end, mou_scope, mou_status, is_active, created_at,
        CASE
          WHEN mou_end IS NOT NULL AND mou_end < NOW() THEN 'expired'
          WHEN mou_end IS NOT NULL AND mou_end < NOW() + INTERVAL '90 days' THEN 'near_expiry'
          WHEN mou_status = 'aktif' THEN 'active'
          ELSE 'inactive'
        END AS computed_status
      FROM partners
      WHERE is_active = true
      ORDER BY mou_status DESC NULLS LAST, name ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Kepsek] getMouList error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar MoU.' });
  }
};

const updateMou = async (req, res) => {
  const { id } = req.params;
  const { mou_number, mou_start, mou_end, mou_scope, mou_status } = req.body;

  if (!id) return res.status(400).json({ success: false, message: 'ID mitra diperlukan.' });

  try {
    const result = await db.query(`
      UPDATE partners
      SET
        mou_number = COALESCE($1, mou_number),
        mou_start  = COALESCE($2::date, mou_start),
        mou_end    = COALESCE($3::date, mou_end),
        mou_scope  = COALESCE($4, mou_scope),
        mou_status = COALESCE($5, mou_status),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, mou_number, mou_status
    `, [mou_number || null, mou_start || null, mou_end || null, mou_scope || null, mou_status || null, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Mitra tidak ditemukan.' });

    res.json({ success: true, data: result.rows[0], message: 'Informasi MoU berhasil diperbarui.' });
  } catch (err) {
    console.error('[Kepsek] updateMou error:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui MoU.' });
  }
};

// ============================================================================
// 5. TARGET KPI & MUTU SEKOLAH
// ============================================================================
const getQualityTargets = async (req, res) => {
  try {
    const targets = await db.query(`
      SELECT id, indicator_name, target_value, target_unit, academic_year, semester, notes
      FROM school_quality_targets
      ORDER BY academic_year DESC, indicator_name
    `);

    const [activeStudents, verifiedPortfolios, pklPlacements, activePartners] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM students_profile WHERE is_active = true`),
      db.query(`SELECT COUNT(*) AS total FROM portfolios WHERE status = 'verified'`),
      db.query(`SELECT COUNT(*) AS total FROM pkl_placements`),
      db.query(`SELECT COUNT(*) AS total FROM partners WHERE is_active = true`)
    ]);

    const realization = {
      'Jumlah Siswa Aktif': parseInt(activeStudents.rows[0]?.total || 0),
      'Portofolio Terverifikasi': parseInt(verifiedPortfolios.rows[0]?.total || 0),
      'Siswa Magang PKL': parseInt(pklPlacements.rows[0]?.total || 0),
      'Mitra DUDI & PTN Aktif': parseInt(activePartners.rows[0]?.total || 0)
    };

    const enriched = targets.rows.map(t => ({
      ...t,
      realization: realization[t.indicator_name] ?? null,
      achievement_pct: realization[t.indicator_name] != null && t.target_value > 0
        ? Math.min(100, parseFloat(((realization[t.indicator_name] / t.target_value) * 100).toFixed(1)))
        : null
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[Kepsek] getQualityTargets error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data target KPI.' });
  }
};

const updateTarget = async (req, res) => {
  const { id } = req.params;
  const { target_value, notes } = req.body;

  try {
    const result = await db.query(`
      UPDATE school_quality_targets
      SET target_value = $1, notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [target_value, notes, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Target tidak ditemukan.' });

    res.json({ success: true, data: result.rows[0], message: 'Target KPI berhasil diperbarui.' });
  } catch (err) {
    console.error('[Kepsek] updateTarget error:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui target.' });
  }
};

// ============================================================================
// 6. RINGKASAN KINERJA GURU
// ============================================================================
const getTeacherSummary = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        gs.teacher_name,
        COUNT(gs.id) AS total_sessions,
        COUNT(DISTINCT gs.student_id) AS students_guided,
        MAX(gs.session_date) AS last_active
      FROM guidance_sessions gs
      WHERE gs.teacher_name IS NOT NULL AND gs.teacher_name != ''
      GROUP BY gs.teacher_name
      ORDER BY total_sessions DESC
      LIMIT 10
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Kepsek] getTeacherSummary error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan guru.' });
  }
};

// ============================================================================
// 7. DATA LAPORAN EKSEKUTIF LENGKAP
// ============================================================================
const getReportData = async (req, res) => {
  try {
    const [stats, talents, mou, targets] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM students_profile WHERE is_active = true)::int AS active_students,
          (SELECT COUNT(*) FROM portfolios WHERE status = 'verified')::int AS verified_portfolios,
          (SELECT COUNT(*) FROM partners WHERE is_active = true)::int AS active_partners,
          (SELECT COUNT(*) FROM pkl_placements)::int AS pkl_placements
      `),
      db.query(`
        SELECT sp.full_name, sp.class_name, sp.major, sp.readiness_level,
               COUNT(p.id) FILTER (WHERE p.status = 'verified') AS verified_portfolios
        FROM students_profile sp
        LEFT JOIN portfolios p ON sp.id = p.student_id
        WHERE sp.is_active = true
        GROUP BY sp.id, sp.full_name, sp.class_name, sp.major, sp.readiness_level
        HAVING COUNT(p.id) FILTER (WHERE p.status = 'verified') > 0
        ORDER BY verified_portfolios DESC
        LIMIT 5
      `),
      db.query(`SELECT name, category, mou_number, mou_start, mou_end, mou_status FROM partners WHERE is_active = true ORDER BY mou_status`),
      db.query(`SELECT indicator_name, target_value, target_unit, academic_year FROM school_quality_targets ORDER BY indicator_name`)
    ]);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      data: {
        stats: stats.rows[0],
        top_talents: talents.rows,
        mou_list: mou.rows,
        kpi_targets: targets.rows
      }
    });
  } catch (err) {
    console.error('[Kepsek] getReportData error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data laporan.' });
  }
};

module.exports = {
  getExecutiveStats,
  getTalentDistribution,
  getTopTalents,
  getMouList,
  updateMou,
  getQualityTargets,
  updateTarget,
  getTeacherSummary,
  getReportData
};
