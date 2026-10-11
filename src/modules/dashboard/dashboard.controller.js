const db = require('../../config/database');

const getDashboardStats = async (req, res) => {
  try {
    // 1. Total Siswa Terdata
    const studentRes = await db.query(
      "SELECT COUNT(*) FROM users WHERE role = 'STUDENT'"
    );

    // 2. Mitra DUDI & PTN
    const partnerRes = await db.query(
      "SELECT COUNT(*) FROM partners"
    );

    // 3. Penyaluran PKL SMK (Aktif/Selesai)
    const pklRes = await db.query(
      "SELECT COUNT(*) FROM pkl_placements"
    );

    // 4. Sertifikasi / Portofolio Verified
    const certRes = await db.query(
      "SELECT COUNT(*) FROM portfolios WHERE is_verified = true"
    );

    res.status(200).json({
      total_students: parseInt(studentRes.rows[0].count),
      total_partners: parseInt(partnerRes.rows[0].count),
      total_pkl: parseInt(pklRes.rows[0].count),
      verified_certifications: parseInt(certRes.rows[0].count)
    });
  } catch (error) {
    console.error('Error getDashboardStats:', error);
    res.status(500).json({ error: 'Gagal mengambil data statistik dashboard' });
  }
};

module.exports = { getDashboardStats };