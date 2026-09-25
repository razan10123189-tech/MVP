const db = require('../../config/database');

// 1. Fungsi Membuat Tenant & Sekolah Baru
const createTenant = async (req, res) => {
  const { name, domain, school_name, school_code } = req.body;

  try {
    const tenantResult = await db.query(
      'INSERT INTO tenants (name, domain) VALUES ($1, $2) RETURNING id, name, domain',
      [name, domain]
    );
    const tenant = tenantResult.rows[0];

    const schoolResult = await db.query(
      'INSERT INTO schools (tenant_id, name, code) VALUES ($1, $2, $3) RETURNING id, name, code',
      [tenant.id, school_name, school_code]
    );
    const school = schoolResult.rows[0];

    res.status(201).json({
      message: 'Tenant dan Sekolah berhasil dibuat',
      tenant,
      school
    });
  } catch (error) {
    console.error('Error createTenant:', error);
    res.status(500).json({ error: 'Gagal membuat tenant: ' + error.message });
  }
};

// 2. Fungsi Mengambil Seluruh Data Tenant
const getAllTenants = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tenants ORDER BY created_at DESC');
    res.status(200).json({ tenants: result.rows });
  } catch (error) {
    console.error('Error getAllTenants:', error);
    res.status(500).json({ error: 'Gagal mengambil data tenant: ' + error.message });
  }
};

// Pastikan KEDUA fungsi diekspor di sini
module.exports = { 
  createTenant, 
  getAllTenants 
};