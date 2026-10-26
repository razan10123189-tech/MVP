const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const tenantRoutes = require('./modules/tenant/tenant.routes');
const authRoutes = require('./modules/identity/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const partnerRoutes = require('./modules/partners/partner.routes');
const schoolRouter = require('./routes/school.router');
const roleRoutes = require('./modules/identity/role.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Pendaftaran Rute API Modul
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/partners', partnerRoutes);
app.use('/api/v1/schools', schoolRouter);
app.use('/api/v1/roles', roleRoutes);

app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'OK', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server CDGS School Core berjalan di port ${PORT}`);
});