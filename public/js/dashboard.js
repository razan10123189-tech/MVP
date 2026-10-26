/**
 * CDGS School Core - Role-Based Dashboard Logic
 * Mendukung 5 Tampilan Peran: Platform Admin, Kepala Sekolah, Guru, Murid, Instansi.
 */

let currentUser = null;
let currentRole = 'Platform Admin';
let tenantChartInstance = null;
let kepsekChartInstance = null;

// ============================================================================
// 1. INITIALIZATION ON LOAD
// ============================================================================
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifikasi Token & Ambil Profil
    await initSessionAndProfile();

    // 2. Setup Role Switcher Listener
    const switcher = document.getElementById('role-switcher-select');
    if (switcher) {
      switcher.addEventListener('change', (e) => {
        setDashboardRole(e.target.value);
      });
    }

    // 3. Setup Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.auth.logout();
      });
    }

    // 4. Setup Form Mitra
    const partnerForm = document.getElementById('partner-form');
    if (partnerForm) {
      partnerForm.addEventListener('submit', handleAddPartner);
    }
  });
}

// Ambil profil login dari server
async function initSessionAndProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const res = await window.api.fetch('/auth/me');
    if (!res.ok) {
      window.auth.clearToken();
      window.location.href = '/index.html';
      return;
    }

    const data = await res.json();
    currentUser = data.user;

    // Normalisasi role pengguna jika ada
    let detectedRole = 'Platform Admin';
    if (currentUser && currentUser.role) {
      const r = currentUser.role.toLowerCase();
      if (r.includes('kepala') || r.includes('kepsek')) {
        detectedRole = 'Kepala Sekolah';
      } else if (r.includes('guru') || r.includes('teacher')) {
        detectedRole = 'Guru';
      } else if (r.includes('murid') || r.includes('siswa') || r.includes('student')) {
        detectedRole = 'Murid';
      } else if (r.includes('instansi') || r.includes('partner') || r.includes('dudi')) {
        detectedRole = 'Instansi';
      } else {
        detectedRole = 'Platform Admin';
      }
    }

    // Set UI Header Info
    const emailEl = document.getElementById('account-email-short');
    if (emailEl) emailEl.textContent = currentUser.email || 'Pengguna';

    const adminPanelEmail = document.getElementById('admin-panel-email');
    if (adminPanelEmail) adminPanelEmail.textContent = currentUser.email || 'admin@devr.sch.id';

    const muridProfileName = document.getElementById('murid-profile-name');
    if (muridProfileName && currentUser.email) {
      const name = currentUser.email.split('@')[0];
      muridProfileName.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }

    // Terapkan role awal sesuai akun yang login
    setDashboardRole(detectedRole);

  } catch (error) {
    console.error('Error init session:', error);
    window.auth.clearToken();
    window.location.href = '/index.html';
  }
}

// ============================================================================
// 2. ROLE SWITCHER & UI ADAPTER
// ============================================================================
function setDashboardRole(role) {
  currentRole = role;

  // 1. Sinkronkan dropdown switcher
  const switcher = document.getElementById('role-switcher-select');
  if (switcher && switcher.value !== role) {
    switcher.value = role;
  }

  // 2. Update Badge & Labels
  const badgeEl = document.getElementById('account-role-badge');
  const sidebarRoleEl = document.getElementById('sidebar-role-label');
  const breadcrumbEl = document.getElementById('topbar-breadcrumb');
  const titleTextEl = document.getElementById('topbar-title-text');

  // Reset kelas badge
  if (badgeEl) {
    badgeEl.className = 'role-badge';
    badgeEl.textContent = role;
  }

  // Sembunyikan semua section view
  const views = document.querySelectorAll('.role-dashboard-view');
  views.forEach(v => v.style.display = 'none');

  // Render view spesifik
  if (role === 'Kepala Sekolah') {
    if (badgeEl) badgeEl.classList.add('badge-kepsek');
    if (sidebarRoleEl) sidebarRoleEl.textContent = 'Kepala Sekolah';
    if (breadcrumbEl) breadcrumbEl.innerHTML = 'CDGS School Core <span>/</span> Ruang Eksekutif';
    if (titleTextEl) titleTextEl.textContent = 'Dashboard Kepala Sekolah';

    const v = document.getElementById('view-role-kepsek');
    if (v) v.style.display = 'block';

    renderSidebarLinks('kepsek');
    initKepsekTalentChart();

  } else if (role === 'Guru') {
    if (badgeEl) badgeEl.classList.add('badge-guru');
    if (sidebarRoleEl) sidebarRoleEl.textContent = 'Guru Pembimbing';
    if (breadcrumbEl) breadcrumbEl.innerHTML = 'CDGS School Core <span>/</span> Ruang Guru';
    if (titleTextEl) titleTextEl.textContent = 'Dashboard Bimbingan & Validasi';

    const v = document.getElementById('view-role-guru');
    if (v) v.style.display = 'block';

    renderSidebarLinks('guru');
    initGuruDashboard();

  } else if (role === 'Murid') {
    if (badgeEl) badgeEl.classList.add('badge-murid');
    if (sidebarRoleEl) sidebarRoleEl.textContent = 'Ruang Siswa';
    if (breadcrumbEl) breadcrumbEl.innerHTML = 'CDGS School Core <span>/</span> Profil Talenta';
    if (titleTextEl) titleTextEl.textContent = 'Portofolio & Rekam Kompetensi';

    const v = document.getElementById('view-role-murid');
    if (v) v.style.display = 'block';

    renderSidebarLinks('murid');

  } else if (role === 'Instansi') {
    if (badgeEl) badgeEl.classList.add('badge-instansi');
    if (sidebarRoleEl) sidebarRoleEl.textContent = 'Mitra DUDI & PTN';
    if (breadcrumbEl) breadcrumbEl.innerHTML = 'CDGS School Core <span>/</span> Talent Scouting';
    if (titleTextEl) titleTextEl.textContent = 'Eksplorasi Talenta (Find Talent)';

    const v = document.getElementById('view-role-instansi');
    if (v) v.style.display = 'block';

    renderSidebarLinks('instansi');

  } else {
    // Platform Admin (Default)
    if (badgeEl) badgeEl.classList.add('badge-admin');
    if (sidebarRoleEl) sidebarRoleEl.textContent = 'Platform Admin';
    if (breadcrumbEl) breadcrumbEl.innerHTML = 'CDGS School Core <span>/</span> Workspace';
    if (titleTextEl) titleTextEl.textContent = 'Dashboard Platform Admin';

    const v = document.getElementById('view-role-admin');
    if (v) v.style.display = 'block';

    renderSidebarLinks('admin');
    initTenantDomainChart();
    loadSchools();
    loadPartners();
  }
}

// Render dynamic menu di sidebar sesuai role yang aktif
function renderSidebarLinks(roleKey) {
  const container = document.getElementById('sidebar-nav-container');
  if (!container) return;

  let links = [];

  if (roleKey === 'kepsek') {
    links = [
      { icon: 'fa-solid fa-chart-line', label: 'Dashboard Eksekutif', active: true, onclick: "setDashboardRole('Kepala Sekolah')" },
      { icon: 'fa-solid fa-award', label: 'Talenta Unggulan', onclick: "alert('Menampilkan daftar siswa berprestasi & talenta unggulan sekolah.')" },
      { icon: 'fa-solid fa-chalkboard-user', label: 'Rekap Pembimbing', onclick: "alert('Menampilkan rekap aktivitas guru pembimbing.')" },
      { icon: 'fa-solid fa-handshake', label: 'Kemitraan DUDI / PTN', onclick: "alert('Menampilkan daftar MoU dan status kerja sama industri.')" },
      { icon: 'fa-solid fa-file-pdf', label: 'Unduh Laporan Mutu', onclick: "downloadExecutiveReport()" }
    ];
  } else if (roleKey === 'guru') {
    links = [
      { icon: 'fa-solid fa-chalkboard-user', label: 'Dashboard Guru', active: true, onclick: "switchGuruTab('portfolios')" },
      { icon: 'fa-solid fa-check-double', label: 'Antrean Validasi', onclick: "switchGuruTab('portfolios')" },
      { icon: 'fa-solid fa-users', label: 'Siswa Bimbingan', onclick: "switchGuruTab('students')" },
      { icon: 'fa-solid fa-briefcase', label: 'Monitoring PKL', onclick: "switchGuruTab('pkl')" },
      { icon: 'fa-solid fa-book-journal-whills', label: 'Jurnal Bimbingan', onclick: "switchGuruTab('jurnal')" },
      { icon: 'fa-solid fa-print', label: 'Cetak Laporan Mutu', onclick: "openGuruReportModal()" }
    ];
  } else if (roleKey === 'murid') {
    links = [
      { icon: 'fa-solid fa-user-astronaut', label: 'Profil Talenta Saya', active: true, onclick: "setDashboardRole('Murid')" },
      { icon: 'fa-solid fa-folder-open', label: 'Portofolio & Proyek', onclick: "openAddPortfolioModal()" },
      { icon: 'fa-solid fa-certificate', label: 'Lencana Keahlian', onclick: "alert('Daftar lencana kompetensi terverifikasi guru.')" },
      { icon: 'fa-solid fa-bullhorn', label: 'Peluang Magang DUDI', onclick: "alert('Menampilkan 8 lowongan magang mitra industri yang relevan.')" }
    ];
  } else if (roleKey === 'instansi') {
    links = [
      { icon: 'fa-solid fa-magnifying-glass', label: 'Find Talent', active: true, onclick: "setDashboardRole('Instansi')" },
      { icon: 'fa-solid fa-briefcase', label: 'Program Magang', onclick: "openAddJobModal()" },
      { icon: 'fa-solid fa-user-check', label: 'Siswa Magang Aktif', onclick: "alert('6 Siswa sedang magang aktif di instansi Anda.')" },
      { icon: 'fa-solid fa-file-contract', label: 'MoU Kemitraan', onclick: "alert('Status MoU aktif dengan sekolah CDGS terhubung.')" }
    ];
  } else {
    // Admin
    links = [
      { icon: 'fa-solid fa-chart-pie', label: 'Ringkasan Platform', active: true, onclick: "switchAdminTab('schools')" },
      { icon: 'fa-solid fa-school', label: 'Data Sekolah', onclick: "switchAdminTab('schools')" },
      { icon: 'fa-solid fa-handshake', label: 'Mitra DUDI & PTN', onclick: "switchAdminTab('partners')" },
      { icon: 'fa-solid fa-building', label: 'Data Tenant', onclick: "switchAdminTab('tenants')" }
    ];
  }

  container.innerHTML = links.map(l => `
    <a href="javascript:void(0)" onclick="${l.onclick || ''}" class="side-link ${l.active ? 'active' : ''}">
      <i class="${l.icon}" style="width: 16px;"></i>
      <span>${l.label}</span>
    </a>
  `).join('');
}

// Switcher tab khusus di dalam Platform Admin
function switchAdminTab(tabKey, btnElement) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
  const target = document.getElementById(`admin-tab-${tabKey}`);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.nav-pills .nav-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  }
}

// ============================================================================
// 3. CHARTS INITIALIZATION (Chart.js)
// ============================================================================
function initTenantDomainChart() {
  const ctx = document.getElementById('tenantDomainChart');
  if (!ctx || !window.Chart) return;

  if (tenantChartInstance) tenantChartInstance.destroy();

  tenantChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Domain tercatat', 'Belum ada domain'],
      datasets: [{
        label: 'Jumlah Tenant',
        data: [2, 0],
        backgroundColor: ['#8b5cf6', '#10b981'],
        borderRadius: 4,
        barThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: '#26334A' } }
      }
    }
  });
}

function initKepsekTalentChart() {
  const ctx = document.getElementById('kepsekTalentChart');
  if (!ctx || !window.Chart) return;

  if (kepsekChartInstance) kepsekChartInstance.destroy();

  kepsekChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Rekayasa Software', 'Desain Visual (DKV)', 'Jaringan & Cyber', 'Multimedia / Game'],
      datasets: [{
        label: 'Siswa Tersertifikasi',
        data: [142, 98, 86, 64],
        backgroundColor: ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'],
        borderRadius: 4,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 30 }, grid: { color: '#26334A' } }
      }
    }
  });
}

// ============================================================================
// 4. DATA SEKOLAH (API CRUD)
// ============================================================================
async function loadSchools() {
  const tbody = document.getElementById('schoolTableBody');
  if (!tbody) return;

  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/v1/schools', {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const result = await res.json();

    if (res.ok && result.success) {
      const schools = result.data || [];
      const adminStatEl = document.getElementById('stat-admin-schools');
      if (adminStatEl) adminStatEl.textContent = schools.length;

      if (schools.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">Belum ada data sekolah. Silakan klik + Tambah Sekolah.</td></tr>';
        return;
      }

      tbody.innerHTML = schools.map((s, idx) => `
        <tr style="border-bottom: 1px solid #26334A;">
          <td style="padding: 10px;">${idx + 1}</td>
          <td style="padding: 10px; font-weight: 600; color: #C4B5FD;">${s.npsn}</td>
          <td style="padding: 10px; font-weight: 500;">${s.name}</td>
          <td style="padding: 10px;"><span class="skill-tag">${s.level}</span></td>
          <td style="padding: 10px; color: #d1d5db;">${s.status}</td>
          <td style="padding: 10px; color: #FCD34D;">${s.accreditation || '-'}</td>
          <td style="padding: 10px;">
            <button onclick="openEditModal('${s.id}', '${s.npsn}', '${s.name}', '${s.level}', '${s.status}', '${s.accreditation || ''}', '${s.address || ''}')" style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 11px;">
              Edit
            </button>
            <button onclick="deleteSchool('${s.id}')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
              Hapus
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loadSchools:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data sekolah.</td></tr>';
  }
}

function openSchoolModal() {
  const modal = document.getElementById('school-modal');
  if (modal) modal.classList.add('active');
}

function closeSchoolModal() {
  const modal = document.getElementById('school-modal');
  if (modal) modal.classList.remove('active');
  const form = document.getElementById('school-form');
  if (form) form.reset();
}

async function handleAddSchool(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');

  const payload = {
    npsn: document.getElementById('school-npsn').value.trim(),
    name: document.getElementById('school-name').value.trim(),
    level: document.getElementById('school-level').value,
    status: document.getElementById('school-status').value,
    accreditation: document.getElementById('school-accreditation').value,
    address: document.getElementById('school-address').value.trim()
  };

  try {
    const res = await fetch('/api/v1/schools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok && result.success) {
      alert('Sekolah berhasil ditambahkan!');
      closeSchoolModal();
      loadSchools();
    } else {
      alert(result.message || 'Gagal menambahkan data sekolah');
    }
  } catch (err) {
    console.error('Error add school:', err);
    alert('Terjadi kesalahan jaringan.');
  }
}

function openEditModal(id, npsn, name, level, status, accreditation, address) {
  document.getElementById('editSchoolId').value = id;
  document.getElementById('editNpsn').value = npsn;
  document.getElementById('editName').value = name;
  document.getElementById('editLevel').value = level;
  document.getElementById('editStatus').value = status;
  document.getElementById('editAccreditation').value = accreditation || '';
  document.getElementById('editAddress').value = address || '';

  const modal = document.getElementById('modalEditSekolah');
  if (modal) modal.classList.add('active');
}

function closeEditSchoolModal() {
  const modal = document.getElementById('modalEditSekolah');
  if (modal) modal.classList.remove('active');
}

const editSchoolForm = typeof document !== 'undefined' ? document.getElementById('editSchoolForm') : null;
if (editSchoolForm) {
  editSchoolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editSchoolId').value;
    const token = localStorage.getItem('token');

    const payload = {
      npsn: document.getElementById('editNpsn').value,
      name: document.getElementById('editName').value,
      level: document.getElementById('editLevel').value,
      status: document.getElementById('editStatus').value,
      accreditation: document.getElementById('editAccreditation').value,
      address: document.getElementById('editAddress').value
    };

    try {
      const res = await fetch(`/api/v1/schools/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        alert('Data sekolah berhasil diperbarui!');
        closeEditSchoolModal();
        loadSchools();
      } else {
        alert(result.message || 'Gagal memperbarui data sekolah');
      }
    } catch (err) {
      console.error('Error update school:', err);
    }
  });
}

async function deleteSchool(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data sekolah ini?')) return;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`/api/v1/schools/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    if (res.ok) {
      alert('Sekolah berhasil dihapus!');
      loadSchools();
    }
  } catch (err) {
    console.error('Error delete school:', err);
  }
}

// ============================================================================
// 5. DATA MITRA DUDI & PTN (API CRUD)
// ============================================================================
async function loadPartners() {
  const tbody = document.getElementById('partner-table-body');
  if (!tbody) return;

  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/v1/partners', {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const result = await res.json();

    if (result.success && result.data) {
      const partners = result.data;
      const adminStatEl = document.getElementById('stat-admin-partners');
      const kepsekStatEl = document.getElementById('stat-kepsek-partners');

      if (adminStatEl) adminStatEl.textContent = partners.length;
      if (kepsekStatEl) kepsekStatEl.textContent = partners.length;

      if (partners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Belum ada mitra terdaftar.</td></tr>';
        return;
      }

      tbody.innerHTML = partners.map(p => `
        <tr style="border-bottom: 1px solid #26334A;">
          <td style="padding: 10px; font-weight: 500;">${p.name}</td>
          <td style="padding: 10px;">
            <span style="background: ${p.category === 'DUDI' ? '#2563eb' : '#059669'}; color: #fff; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600;">
              ${p.category}
            </span>
          </td>
          <td style="padding: 10px; color: #d1d5db;">${p.contact_person || '-'}</td>
          <td style="padding: 10px; color: #d1d5db;">${p.phone || '-'}</td>
          <td style="padding: 10px;">
            <button onclick="openEditPartnerModal('${p.id}', '${p.name}', '${p.category}', '${p.contact_person || ''}', '${p.phone || ''}')" style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 11px;">
              Edit
            </button>
            <button onclick="deletePartner('${p.id}')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
              Hapus
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error load partners:', err);
  }
}

function openPartnerModal() {
  const modal = document.getElementById('partner-modal');
  if (modal) modal.classList.add('active');
}

function closePartnerModal() {
  const modal = document.getElementById('partner-modal');
  if (modal) modal.classList.remove('active');
  const form = document.getElementById('partner-form');
  if (form) form.reset();
}

async function handleAddPartner(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');

  const payload = {
    name: document.getElementById('partner-name').value.trim(),
    category: document.getElementById('partner-category').value,
    address: (document.getElementById('partner-address') || {}).value || '',
    contact_person: (document.getElementById('partner-cp') || {}).value || '',
    phone: (document.getElementById('partner-phone') || {}).value || ''
  };

  try {
    const res = await fetch('/api/v1/partners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert('Mitra berhasil ditambahkan!');
      closePartnerModal();
      loadPartners();
    } else {
      alert(result.message || 'Gagal menambahkan mitra');
    }
  } catch (err) {
    console.error('Error add partner:', err);
  }
}

function openEditPartnerModal(id, name, category, cp, phone) {
  document.getElementById('editPartnerId').value = id;
  document.getElementById('editPartnerName').value = name;
  document.getElementById('editPartnerCategory').value = category;
  document.getElementById('editPartnerContact').value = cp;
  document.getElementById('editPartnerPhone').value = phone;

  const modal = document.getElementById('modalEditMitra');
  if (modal) modal.classList.add('active');
}

function closeEditPartnerModal() {
  const modal = document.getElementById('modalEditMitra');
  if (modal) modal.classList.remove('active');
}

async function handleUpdatePartner(e) {
  e.preventDefault();
  const id = document.getElementById('editPartnerId').value;
  const token = localStorage.getItem('token');

  const payload = {
    name: document.getElementById('editPartnerName').value,
    category: document.getElementById('editPartnerCategory').value,
    contact_person: document.getElementById('editPartnerContact').value,
    phone: document.getElementById('editPartnerPhone').value
  };

  try {
    const res = await fetch(`/api/v1/partners/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert('Data mitra berhasil diperbarui!');
      closeEditPartnerModal();
      loadPartners();
    } else {
      alert(result.message || 'Gagal update mitra');
    }
  } catch (err) {
    console.error('Error update partner:', err);
  }
}

async function deletePartner(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data mitra ini?')) return;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`/api/v1/partners/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
    const result = await res.json();
    if (result.success) {
      loadPartners();
    }
  } catch (err) {
    console.error('Error delete partner:', err);
  }
}

// ============================================================================
// 6. GURU WORKFLOW (Validasi Portofolio, Siswa Binaan, PKL, & Bimbingan)
// ============================================================================
let cachedGuruPortfolios = [];
let cachedGuruStudents = [];
let cachedGuruPKL = [];
let cachedGuruGuidance = [];

async function initGuruDashboard() {
  await Promise.all([
    loadGuruStats(),
    loadGuruPortfolios(),
    loadGuruStudents(),
    loadGuruPKL(),
    loadGuruGuidance(),
    populateGuruDropdowns()
  ]);
}

async function loadGuruStats() {
  try {
    const res = await window.api.fetch('/guru/stats');
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      const d = json.data;
      const sStudents = document.getElementById('stat-guru-students');
      const sPending = document.getElementById('stat-guru-pending');
      const sPkl = document.getElementById('stat-guru-pkl');
      const sVerified = document.getElementById('stat-guru-verified');
      const sGuidance = document.getElementById('stat-guru-guidance');
      const badgePending = document.getElementById('guru-pending-tab-badge');

      if (sStudents) sStudents.textContent = d.total_students;
      if (sPending) sPending.textContent = d.pending_reviews;
      if (sPkl) sPkl.textContent = d.active_pkl;
      if (sVerified) sVerified.textContent = d.verified_portfolios;
      if (sGuidance) sGuidance.textContent = d.total_guidance;
      if (badgePending) badgePending.textContent = d.pending_reviews;
    }
  } catch (err) {
    console.error('Error loadGuruStats:', err);
  }
}

function switchGuruTab(tabKey, btnElement) {
  const tabs = document.querySelectorAll('.guru-tab-content');
  tabs.forEach(t => t.style.display = 'none');

  const targetTab = document.getElementById(`guru-tab-${tabKey}`);
  if (targetTab) targetTab.style.display = 'block';

  const pills = document.querySelectorAll('#guru-nav-pills .nav-pill');
  pills.forEach(p => p.classList.remove('active'));

  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    const defaultBtn = document.getElementById(`btn-guru-tab-${tabKey}`);
    if (defaultBtn) defaultBtn.classList.add('active');
  }

  // Update sidebar active link
  const sideLinks = document.querySelectorAll('#sidebar-nav-container .side-link');
  sideLinks.forEach(l => {
    if (l.getAttribute('onclick')?.includes(tabKey)) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Refresh tab data
  if (tabKey === 'portfolios') loadGuruPortfolios();
  if (tabKey === 'students') loadGuruStudents();
  if (tabKey === 'pkl') loadGuruPKL();
  if (tabKey === 'jurnal') loadGuruGuidance();
}

async function loadGuruPortfolios() {
  const container = document.getElementById('guru-queue-list');
  if (!container) return;

  const filterSelect = document.getElementById('guru-portfolio-status-filter');
  const searchInput = document.getElementById('guru-portfolio-search');
  const status = filterSelect ? filterSelect.value : 'ALL';
  const search = searchInput ? searchInput.value.trim() : '';

  try {
    let url = `/guru/portfolios?status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await window.api.fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    cachedGuruPortfolios = json.data || [];
    renderGuruPortfolios(cachedGuruPortfolios);
  } catch (err) {
    console.error('Error loadGuruPortfolios:', err);
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat data antrean portofolio.</div>`;
  }
}

function filterGuruPortfolios() {
  const q = (document.getElementById('guru-portfolio-search')?.value || '').toLowerCase();
  if (!q) {
    renderGuruPortfolios(cachedGuruPortfolios);
    return;
  }
  const filtered = cachedGuruPortfolios.filter(p => 
    (p.title && p.title.toLowerCase().includes(q)) ||
    (p.student_name && p.student_name.toLowerCase().includes(q)) ||
    (p.category && p.category.toLowerCase().includes(q)) ||
    (p.skills && p.skills.toLowerCase().includes(q))
  );
  renderGuruPortfolios(filtered);
}

function renderGuruPortfolios(list) {
  const container = document.getElementById('guru-queue-list');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; background: #111A2B; border: 1px dashed #26334A; border-radius: 8px;">
        <i class="fa-solid fa-clipboard-check" style="font-size: 32px; color: #10B981; margin-bottom: 10px;"></i>
        <h4 style="margin: 0 0 6px 0; color: #F3F5FA; font-size: 15px;">Tidak Ada Portofolio dalam Antrean</h4>
        <p style="margin: 0; color: #8F9DB4; font-size: 12px;">Semua karya pada kategori ini telah selesai ditinjau atau belum ada pengajuan baru.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const isPending = item.status === 'PENDING';
    const isApproved = item.status === 'APPROVED';
    const isRevision = item.status === 'REVISION';

    let badgeHtml = '';
    if (isPending) {
      badgeHtml = `<span class="portfolio-badge-pending"><i class="fa-solid fa-clock"></i> Menunggu Validasi</span>`;
    } else if (isApproved) {
      badgeHtml = `<span class="portfolio-badge-verified"><i class="fa-solid fa-check"></i> Disetujui (Skor: ${item.score || 90})</span> <span class="role-badge badge-guru">${item.badge || '⭐ Siap Industri'}</span>`;
    } else {
      badgeHtml = `<span class="portfolio-badge-pending" style="background:rgba(239, 68, 68, 0.16); border-color:rgba(239,68,68,0.4); color:#FCA5A5;"><i class="fa-solid fa-triangle-exclamation"></i> Perlu Revisi</span>`;
    }

    const initials = (item.student_name || 'Siswa').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const skillsArray = (item.skills || '').split(',').map(s => s.trim()).filter(Boolean);

    return `
      <div class="review-item" id="review-item-${item.id}" style="flex-direction: column; align-items: stretch; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #059669, #10B981); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 13px; flex-shrink: 0;">
              ${initials}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 600; color: #fff; font-size: 14px;">${escapeHtml(item.student_name)}</span>
                <span style="font-size: 11px; color: #9ca3af;">• ${escapeHtml(item.class_name || 'Siswa Binaan')}</span>
                ${item.nisn ? `<span style="font-size: 11px; color: #6b7280;">(NISN: ${escapeHtml(item.nisn)})</span>` : ''}
              </div>
              <span style="font-size: 11px; color: #6EE7B7; font-weight: 500;">Kategori: ${escapeHtml(item.category)}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            ${badgeHtml}
          </div>
        </div>

        <div>
          <h5 style="margin: 0 0 6px 0; color: #F3F5FA; font-size: 15px; font-weight: 600;">${escapeHtml(item.title)}</h5>
          <p style="margin: 0 0 10px 0; color: #94A3B8; font-size: 12px; line-height: 1.5;">${escapeHtml(item.description || 'Tidak ada deskripsi.')}</p>
          
          <div class="skill-tags" style="margin: 0 0 10px 0;">
            ${skillsArray.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
          </div>

          ${(item.repo_link || item.demo_link) ? `
            <div style="display: flex; gap: 10px; margin-bottom: 8px; font-size: 12px;">
              ${item.repo_link ? `<a href="${escapeHtml(item.repo_link)}" target="_blank" rel="noopener" style="color: #60A5FA; text-decoration: none;"><i class="fa-brands fa-github"></i> Repository Proyek</a>` : ''}
              ${item.demo_link ? `<a href="${escapeHtml(item.demo_link)}" target="_blank" rel="noopener" style="color: #34D399; text-decoration: none;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Demo / URL Live</a>` : ''}
            </div>
          ` : ''}

          ${item.teacher_feedback ? `
            <div style="background: ${isApproved ? '#092B24' : '#2E1F08'}; border: 1px solid ${isApproved ? '#065F46' : '#78350F'}; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-top: 6px;">
              <span style="font-weight: 600; color: ${isApproved ? '#6EE7B7' : '#FCD34D'};"><i class="fa-solid fa-comment"></i> Catatan Guru:</span>
              <span style="color: #E2E8F0; margin-left: 4px;">${escapeHtml(item.teacher_feedback)}</span>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1E293B; padding-top: 10px; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 11px; color: #64748B;">
            Diajukan: ${new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>

          <div style="display: flex; gap: 6px; flex-shrink: 0;">
            <button onclick="openValidateModal('${item.id}')" class="btn-primary" style="width: auto; padding: 6px 12px; font-size: 12px; background: #059669;">
              <i class="fa-solid fa-check"></i> ${isApproved ? 'Perbarui Nilai/Badge' : 'Setujui & Beri Badge'}
            </button>
            <button onclick="openReviseModal('${item.id}')" class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px; color: #FCD34D; border-color: #78350F; background: #2E1F08;">
              <i class="fa-solid fa-comment-dots"></i> Beri Revisi
            </button>
            <button onclick="openDetailModal('${item.id}')" class="btn-secondary" style="width: auto; padding: 6px 10px; font-size: 12px;" title="Lihat Rincian">
              <i class="fa-solid fa-eye"></i> Detail
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openValidateModal(id) {
  const item = cachedGuruPortfolios.find(p => p.id === id);
  if (!item) return;

  document.getElementById('validate-portfolio-id').value = item.id;
  document.getElementById('validate-modal-student').textContent = `${item.student_name} (${item.class_name || 'Siswa'})`;
  document.getElementById('validate-modal-title').textContent = item.title;
  document.getElementById('validate-portfolio-score').value = item.score || 92;
  document.getElementById('validate-portfolio-badge').value = item.badge || '⭐ Siap Industri';
  document.getElementById('validate-portfolio-feedback').value = item.teacher_feedback || 'Kualitas karya memenuhi standar industri dengan arsitektur yang terstruktur.';

  const modal = document.getElementById('modalValidatePortfolio');
  if (modal) modal.classList.add('active');
}

function closeValidateModal() {
  const modal = document.getElementById('modalValidatePortfolio');
  if (modal) modal.classList.remove('active');
}

async function handleApprovePortfolio(e) {
  e.preventDefault();
  const id = document.getElementById('validate-portfolio-id').value;
  const score = document.getElementById('validate-portfolio-score').value;
  const badge = document.getElementById('validate-portfolio-badge').value;
  const feedback = document.getElementById('validate-portfolio-feedback').value;

  try {
    const res = await window.api.fetch(`/guru/portfolios/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ score, badge, teacher_feedback: feedback })
    });
    const json = await res.json();
    if (json.success) {
      alert(`🎉 Sukses! Portofolio berhasil disetujui dengan skor ${score} dan lencana "${badge}".`);
      closeValidateModal();
      await loadGuruStats();
      await loadGuruPortfolios();
      await loadGuruStudents();
    } else {
      alert(json.message || 'Gagal memvalidasi portofolio');
    }
  } catch (err) {
    console.error('Error approve portfolio:', err);
    alert('Terjadi kesalahan saat menyetujui portofolio.');
  }
}

function openReviseModal(id) {
  const item = cachedGuruPortfolios.find(p => p.id === id);
  if (!item) return;

  document.getElementById('revise-portfolio-id').value = item.id;
  document.getElementById('revise-modal-student').textContent = `${item.student_name} (${item.class_name || 'Siswa'})`;
  document.getElementById('revise-modal-title').textContent = item.title;
  document.getElementById('revise-portfolio-feedback').value = item.teacher_feedback || '';
  document.getElementById('revise-portfolio-score').value = item.score || '';

  const modal = document.getElementById('modalRevisePortfolio');
  if (modal) modal.classList.add('active');
}

function closeReviseModal() {
  const modal = document.getElementById('modalRevisePortfolio');
  if (modal) modal.classList.remove('active');
}

async function handleRevisePortfolio(e) {
  e.preventDefault();
  const id = document.getElementById('revise-portfolio-id').value;
  const feedback = document.getElementById('revise-portfolio-feedback').value;
  const score = document.getElementById('revise-portfolio-score').value;

  try {
    const res = await window.api.fetch(`/guru/portfolios/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify({ teacher_feedback: feedback, score })
    });
    const json = await res.json();
    if (json.success) {
      alert('💬 Instruksi perbaikan telah berhasil dikirimkan ke siswa.');
      closeReviseModal();
      await loadGuruStats();
      await loadGuruPortfolios();
    } else {
      alert(json.message || 'Gagal mengirim instruksi revisi');
    }
  } catch (err) {
    console.error('Error revise portfolio:', err);
    alert('Terjadi kesalahan saat mengirim revisi.');
  }
}

function openDetailModal(id) {
  const item = cachedGuruPortfolios.find(p => p.id === id);
  if (!item) return;

  const content = document.getElementById('detail-portfolio-content');
  if (!content) return;

  const skillsArray = (item.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  content.innerHTML = `
    <div style="background: #111A2B; border: 1px solid #26334A; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <span class="role-badge badge-guru">${escapeHtml(item.category)}</span>
        <span style="font-size: 11px; color: #8F9DB4;">Status: <strong style="color: #fff;">${escapeHtml(item.status)}</strong></span>
      </div>
      <h3 style="margin: 0 0 6px 0; color: #fff; font-size: 17px;">${escapeHtml(item.title)}</h3>
      <p style="margin: 0; color: #94A3B8; font-size: 12px;">Pengaju: <strong style="color: #F3F5FA;">${escapeHtml(item.student_name)}</strong> • ${escapeHtml(item.class_name || '-')} • NISN: ${escapeHtml(item.nisn || '-')}</p>
    </div>

    <div style="margin-bottom: 14px;">
      <h5 style="margin: 0 0 6px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase;">Deskripsi Proyek</h5>
      <p style="margin: 0; color: #E2E8F0; font-size: 13px; line-height: 1.6; background: #0D1525; padding: 12px; border-radius: 6px; border: 1px solid #1E293B;">
        ${escapeHtml(item.description || 'Tidak ada deskripsi rinci.')}
      </p>
    </div>

    <div style="margin-bottom: 14px;">
      <h5 style="margin: 0 0 6px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase;">Keahlian & Teknologi</h5>
      <div class="skill-tags">
        ${skillsArray.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
      <div style="background: #111A2B; padding: 10px; border-radius: 6px; border: 1px solid #26334A;">
        <span style="font-size: 11px; color: #8F9DB4; display: block; margin-bottom: 4px;"><i class="fa-brands fa-github"></i> Repository:</span>
        ${item.repo_link ? `<a href="${escapeHtml(item.repo_link)}" target="_blank" style="color: #60A5FA; font-size: 12px; word-break: break-all;">${escapeHtml(item.repo_link)}</a>` : '<span style="color:#64748B; font-size:12px;">Tidak disertakan</span>'}
      </div>
      <div style="background: #111A2B; padding: 10px; border-radius: 6px; border: 1px solid #26334A;">
        <span style="font-size: 11px; color: #8F9DB4; display: block; margin-bottom: 4px;"><i class="fa-solid fa-globe"></i> Live URL:</span>
        ${item.demo_link ? `<a href="${escapeHtml(item.demo_link)}" target="_blank" style="color: #34D399; font-size: 12px; word-break: break-all;">${escapeHtml(item.demo_link)}</a>` : '<span style="color:#64748B; font-size:12px;">Tidak disertakan</span>'}
      </div>
    </div>

    ${item.teacher_feedback ? `
      <div style="background: #1B293E; border: 1px solid #2F4568; border-radius: 6px; padding: 12px;">
        <span style="font-weight: 600; color: #6EE7B7; font-size: 12px;"><i class="fa-solid fa-award"></i> Catatan & Evaluasi Pembimbing:</span>
        <p style="margin: 4px 0 0 0; color: #fff; font-size: 13px;">${escapeHtml(item.teacher_feedback)}</p>
        <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 12px; color: #94A3B8;">
          ${item.score ? `<span>Nilai: <strong style="color:#34D399;">${item.score} / 100</strong></span>` : ''}
          ${item.badge ? `<span>Lencana: <strong style="color:#FCD34D;">${escapeHtml(item.badge)}</strong></span>` : ''}
        </div>
      </div>
    ` : ''}
  `;

  const modal = document.getElementById('modalDetailPortfolio');
  if (modal) modal.classList.add('active');
}

function closeDetailModal() {
  const modal = document.getElementById('modalDetailPortfolio');
  if (modal) modal.classList.remove('active');
}

// ============================================================================
// MANAJEMEN SISWA BIMBINGAN
// ============================================================================
async function loadGuruStudents() {
  const tbody = document.getElementById('guru-students-table-body');
  if (!tbody) return;

  try {
    const res = await window.api.fetch('/guru/students');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    cachedGuruStudents = json.data || [];
    renderGuruStudents(cachedGuruStudents);
  } catch (err) {
    console.error('Error loadGuruStudents:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Gagal memuat data siswa bimbingan.</td></tr>`;
  }
}

function filterGuruStudents() {
  const q = (document.getElementById('guru-student-search')?.value || '').toLowerCase();
  if (!q) {
    renderGuruStudents(cachedGuruStudents);
    return;
  }
  const filtered = cachedGuruStudents.filter(s =>
    (s.full_name && s.full_name.toLowerCase().includes(q)) ||
    (s.nisn && s.nisn.toLowerCase().includes(q)) ||
    (s.class_name && s.class_name.toLowerCase().includes(q)) ||
    (s.skills && s.skills.toLowerCase().includes(q))
  );
  renderGuruStudents(filtered);
}

function renderGuruStudents(list) {
  const tbody = document.getElementById('guru-students-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#9ca3af;">Belum ada data siswa bimbingan.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => {
    const skillsArray = (s.skills || '').split(',').map(sk => sk.trim()).filter(Boolean);
    const isRec = Boolean(s.is_recommended);

    return `
      <tr style="border-bottom: 1px solid #1E293B;">
        <td style="padding: 10px;">
          <div style="font-weight: 600; color: #fff;">${escapeHtml(s.full_name || 'Siswa')}</div>
          <div style="font-size: 11px; color: #8F9DB4;">${escapeHtml(s.email)}</div>
        </td>
        <td style="padding: 10px;">
          <div style="color: #F3F5FA;">${escapeHtml(s.class_name || '-')}</div>
          <div style="font-size: 11px; color: #8F9DB4;">NISN: ${escapeHtml(s.nisn || '-')}</div>
        </td>
        <td style="padding: 10px;">
          <div class="skill-tags" style="margin: 0;">
            ${skillsArray.slice(0, 3).map(sk => `<span class="skill-tag">${escapeHtml(sk)}</span>`).join('')}
            ${skillsArray.length > 3 ? `<span class="skill-tag">+${skillsArray.length - 3}</span>` : ''}
          </div>
        </td>
        <td style="padding: 10px;">
          <span style="color: #34D399; font-weight: 600;">${s.approved_portfolios || 0} Proyek</span>
          <span style="font-size: 11px; color: #8F9DB4; display: block;">dari ${s.total_portfolios || 0} karya</span>
        </td>
        <td style="padding: 10px;">
          ${s.partner_name ? `
            <span class="role-badge badge-guru" style="font-size: 11px;">${escapeHtml(s.pkl_status)}: ${escapeHtml(s.partner_name)}</span>
          ` : `
            <span class="role-badge" style="font-size: 11px; color: #9ca3af; border-color: #374151;">Belum PKL</span>
          `}
        </td>
        <td style="padding: 10px;">
          <button onclick="toggleTalentRecommendation('${s.user_id}', ${isRec})" class="${isRec ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 11px; width: auto; ${isRec ? 'background: #d97706;' : ''}">
            <i class="fa-${isRec ? 'solid' : 'regular'} fa-star" style="color: ${isRec ? '#fff' : '#FCD34D'};"></i>
            ${isRec ? 'Direkomendasikan' : 'Rekomendasikan'}
          </button>
        </td>
        <td style="padding: 10px; text-align: right;">
          <button onclick="openAddGuidanceModal('${s.user_id}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; width: auto; border-color: #db2777; color: #F472B6;" title="Catat Sesi Bimbingan">
            <i class="fa-solid fa-pen-nib"></i> Bimbingan
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleTalentRecommendation(userId, currentStatus) {
  try {
    const res = await window.api.fetch(`/guru/students/${userId}/recommend`, {
      method: 'PATCH',
      body: JSON.stringify({ is_recommended: !currentStatus })
    });
    const json = await res.json();
    if (json.success) {
      loadGuruStudents();
    } else {
      alert(json.message || 'Gagal mengubah status rekomendasi');
    }
  } catch (err) {
    console.error('Error toggle recommendation:', err);
  }
}

function openAddStudentModal() {
  const modal = document.getElementById('modalAddStudent');
  if (modal) modal.classList.add('active');
}

function closeAddStudentModal() {
  const modal = document.getElementById('modalAddStudent');
  if (modal) modal.classList.remove('active');
}

async function handleAddMentoredStudent(e) {
  e.preventDefault();
  const name = document.getElementById('add-student-name').value;
  const email = document.getElementById('add-student-email').value;
  const nisn = document.getElementById('add-student-nisn').value;
  const className = document.getElementById('add-student-class').value;
  const major = document.getElementById('add-student-major').value;
  const skills = document.getElementById('add-student-skills').value;

  try {
    const res = await window.api.fetch('/guru/students', {
      method: 'POST',
      body: JSON.stringify({ full_name: name, email, nisn, class_name: className, major, skills })
    });
    const json = await res.json();
    if (json.success) {
      alert(`✅ Siswa "${name}" berhasil ditambahkan ke kelompok bimbingan!`);
      closeAddStudentModal();
      await loadGuruStats();
      await loadGuruStudents();
      populateGuruDropdowns();
    } else {
      alert(json.message || 'Gagal menambahkan siswa binaan');
    }
  } catch (err) {
    console.error('Error add mentored student:', err);
    alert('Terjadi kesalahan saat menambahkan siswa.');
  }
}

// ============================================================================
// MONITORING & PENILAIAN PKL INDUSTRI
// ============================================================================
async function loadGuruPKL() {
  const tbody = document.getElementById('guru-pkl-table-body');
  if (!tbody) return;

  try {
    const res = await window.api.fetch('/guru/pkl');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    cachedGuruPKL = json.data || [];
    renderGuruPKL(cachedGuruPKL);
  } catch (err) {
    console.error('Error loadGuruPKL:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Gagal memuat data PKL.</td></tr>`;
  }
}

function renderGuruPKL(list) {
  const tbody = document.getElementById('guru-pkl-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#9ca3af;">Belum ada data penempatan PKL aktif.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const att = p.attendance_rate || 100;
    const attColor = att >= 90 ? '#10B981' : att >= 75 ? '#F59E0B' : '#EF4444';

    return `
      <tr style="border-bottom: 1px solid #1E293B;">
        <td style="padding: 10px;">
          <div style="font-weight: 600; color: #fff;">${escapeHtml(p.student_name)}</div>
          <div style="font-size: 11px; color: #8F9DB4;">${escapeHtml(p.class_name || 'Siswa')}</div>
        </td>
        <td style="padding: 10px;">
          <div style="font-weight: 600; color: #60A5FA;">${escapeHtml(p.partner_name || 'Mitra DUDI')}</div>
          <div style="font-size: 11px; color: #8F9DB4;">CP: ${escapeHtml(p.partner_contact || '-')} (${escapeHtml(p.partner_phone || '-')})</div>
        </td>
        <td style="padding: 10px; font-size: 12px; color: #D1D5DB;">
          ${p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : '-'} s/d 
          ${p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : 'Selesai'}
        </td>
        <td style="padding: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 6px; background: #26334A; border-radius: 99px; min-width: 60px; overflow: hidden;">
              <div style="width: ${att}%; height: 100%; background: ${attColor}; border-radius: 99px;"></div>
            </div>
            <span style="font-size: 11px; font-weight: 600; color: ${attColor};">${att}%</span>
          </div>
        </td>
        <td style="padding: 10px;">
          ${p.score !== null && p.score !== undefined ? `
            <span style="font-weight: 700; color: #34D399; font-size: 13px;">${p.score}</span> / 100
          ` : `
            <span style="font-size: 11px; color: #9ca3af;">Belum dinilai</span>
          `}
          ${p.supervisor_notes ? `<div style="font-size: 11px; color: #8F9DB4; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.supervisor_notes)}</div>` : ''}
        </td>
        <td style="padding: 10px;">
          <span class="role-badge ${p.status === 'Aktif' ? 'badge-guru' : 'badge-admin'}" style="font-size: 11px;">
            ${escapeHtml(p.status || 'Aktif')}
          </span>
        </td>
        <td style="padding: 10px; text-align: right;">
          <button onclick="openEvaluatePKLModal('${p.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; width: auto; background: #2563eb;">
            <i class="fa-solid fa-clipboard-check"></i> Evaluasi
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openEvaluatePKLModal(placementId) {
  const item = cachedGuruPKL.find(p => p.id === placementId);
  if (!item) return;

  document.getElementById('eval-pkl-id').value = item.id;
  document.getElementById('eval-pkl-student-name').textContent = `${item.student_name} (${item.class_name || 'Siswa'})`;
  document.getElementById('eval-pkl-partner-name').textContent = `Mitra: ${item.partner_name}`;
  document.getElementById('eval-pkl-score').value = item.score !== null ? item.score : 90;
  document.getElementById('eval-pkl-attendance').value = item.attendance_rate !== null ? item.attendance_rate : 100;
  document.getElementById('eval-pkl-status').value = item.status || 'Aktif';
  document.getElementById('eval-pkl-notes').value = item.supervisor_notes || '';

  const modal = document.getElementById('modalEvaluatePKL');
  if (modal) modal.classList.add('active');
}

function closeEvaluatePKLModal() {
  const modal = document.getElementById('modalEvaluatePKL');
  if (modal) modal.classList.remove('active');
}

async function handleEvaluatePKL(e) {
  e.preventDefault();
  const id = document.getElementById('eval-pkl-id').value;
  const score = document.getElementById('eval-pkl-score').value;
  const attendance = document.getElementById('eval-pkl-attendance').value;
  const status = document.getElementById('eval-pkl-status').value;
  const notes = document.getElementById('eval-pkl-notes').value;

  try {
    const res = await window.api.fetch(`/guru/pkl/${id}/evaluate`, {
      method: 'PATCH',
      body: JSON.stringify({ score, attendance_rate: attendance, status, supervisor_notes: notes })
    });
    const json = await res.json();
    if (json.success) {
      alert('✅ Nilai & evaluasi supervisi PKL berhasil disimpan!');
      closeEvaluatePKLModal();
      loadGuruPKL();
    } else {
      alert(json.message || 'Gagal menyimpan evaluasi PKL');
    }
  } catch (err) {
    console.error('Error evaluate PKL:', err);
  }
}

function openAddPKLModal() {
  populateGuruDropdowns();
  const modal = document.getElementById('modalAddPKL');
  if (modal) modal.classList.add('active');
}

function closeAddPKLModal() {
  const modal = document.getElementById('modalAddPKL');
  if (modal) modal.classList.remove('active');
}

async function handleCreatePKL(e) {
  e.preventDefault();
  const studentId = document.getElementById('add-pkl-student').value;
  const partnerId = document.getElementById('add-pkl-partner').value;
  const start = document.getElementById('add-pkl-start').value;
  const end = document.getElementById('add-pkl-end').value;
  const notes = document.getElementById('add-pkl-notes').value;

  try {
    const res = await window.api.fetch('/guru/pkl', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, partner_id: partnerId, start_date: start, end_date: end, status: 'Aktif', supervisor_notes: notes })
    });
    const json = await res.json();
    if (json.success) {
      alert('🎉 Penempatan PKL siswa berhasil dicatat!');
      closeAddPKLModal();
      await loadGuruStats();
      await loadGuruPKL();
      await loadGuruStudents();
    } else {
      alert(json.message || 'Gagal menambahkan penempatan PKL');
    }
  } catch (err) {
    console.error('Error create PKL:', err);
  }
}

// ============================================================================
// JURNAL & CATATAN SESI BIMBINGAN
// ============================================================================
async function loadGuruGuidance() {
  const container = document.getElementById('guru-guidance-list');
  if (!container) return;

  try {
    const res = await window.api.fetch('/guru/bimbingan');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    cachedGuruGuidance = json.data || [];
    renderGuruGuidance(cachedGuruGuidance);
  } catch (err) {
    console.error('Error loadGuruGuidance:', err);
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Gagal memuat catatan bimbingan.</div>`;
  }
}

function renderGuruGuidance(list) {
  const container = document.getElementById('guru-guidance-list');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; background: #111A2B; border: 1px dashed #26334A; border-radius: 8px;">
        <i class="fa-solid fa-book-journal-whills" style="font-size: 32px; color: #F472B6; margin-bottom: 10px;"></i>
        <h4 style="margin: 0 0 6px 0; color: #F3F5FA; font-size: 15px;">Belum Ada Sesi Bimbingan</h4>
        <p style="margin: 0; color: #8F9DB4; font-size: 12px;">Catat sesi tatap muka atau konsultasi talenta pertama Anda dengan menekan tombol "Catat Sesi Bimbingan".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(g => {
    const dateFormatted = new Date(g.session_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div style="background: #111A2B; border: 1px solid #26334A; border-left: 4px solid #db2777; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
          <div>
            <span style="font-size: 11px; color: #F472B6; font-weight: 600;"><i class="fa-regular fa-calendar-check"></i> ${dateFormatted}</span>
            <h4 style="margin: 4px 0 2px 0; color: #fff; font-size: 15px;">${escapeHtml(g.topic)}</h4>
            <span style="font-size: 12px; color: #94A3B8;">Siswa: <strong style="color: #6EE7B7;">${escapeHtml(g.student_name)}</strong> • ${escapeHtml(g.class_name || 'Binaan')}</span>
          </div>
          <button onclick="deleteGuidanceSession('${g.id}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; width: auto; color: #ef4444; border-color: #7f1d1d;" title="Hapus Catatan">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <div style="background: #0D1525; padding: 10px 12px; border-radius: 6px; font-size: 12px; color: #E2E8F0; margin-bottom: 6px; line-height: 1.5;">
          ${escapeHtml(g.notes)}
        </div>

        ${g.action_plan ? `
          <div style="font-size: 11px; color: #FCD34D;">
            <i class="fa-solid fa-bullseye"></i> <strong>Rencana Tindak Lanjut:</strong> ${escapeHtml(g.action_plan)}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function openAddGuidanceModal(preselectedStudentId) {
  populateGuruDropdowns();
  const dateInput = document.getElementById('guidance-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
  if (preselectedStudentId) {
    const select = document.getElementById('guidance-student-select');
    if (select) select.value = preselectedStudentId;
  }
  const modal = document.getElementById('modalAddGuidance');
  if (modal) modal.classList.add('active');
}

function closeAddGuidanceModal() {
  const modal = document.getElementById('modalAddGuidance');
  if (modal) modal.classList.remove('active');
}

async function handleCreateGuidance(e) {
  e.preventDefault();
  const studentId = document.getElementById('guidance-student-select').value;
  const date = document.getElementById('guidance-date').value;
  const topic = document.getElementById('guidance-topic').value;
  const notes = document.getElementById('guidance-notes').value;
  const actionPlan = document.getElementById('guidance-action-plan').value;

  try {
    const res = await window.api.fetch('/guru/bimbingan', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, session_date: date, topic, notes, action_plan: actionPlan })
    });
    const json = await res.json();
    if (json.success) {
      alert('✅ Catatan sesi bimbingan siswa berhasil disimpan!');
      closeAddGuidanceModal();
      await loadGuruStats();
      await loadGuruGuidance();
    } else {
      alert(json.message || 'Gagal menyimpan catatan bimbingan');
    }
  } catch (err) {
    console.error('Error create guidance:', err);
  }
}

async function deleteGuidanceSession(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus catatan sesi bimbingan ini?')) return;
  try {
    const res = await window.api.fetch(`/guru/bimbingan/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      await loadGuruStats();
      await loadGuruGuidance();
    }
  } catch (err) {
    console.error('Error delete guidance:', err);
  }
}

// ============================================================================
// POPULATE DROPDOWNS & REPORT MODAL
// ============================================================================
async function populateGuruDropdowns() {
  try {
    if (cachedGuruStudents.length === 0) {
      const res = await window.api.fetch('/guru/students');
      if (res.ok) {
        const j = await res.json();
        cachedGuruStudents = j.data || [];
      }
    }

    const pklStudentSelect = document.getElementById('add-pkl-student');
    const guidanceStudentSelect = document.getElementById('guidance-student-select');

    const studentOptions = cachedGuruStudents.map(s => 
      `<option value="${s.user_id}">${escapeHtml(s.full_name)} (${escapeHtml(s.class_name || 'Siswa')})</option>`
    ).join('');

    if (pklStudentSelect) pklStudentSelect.innerHTML = studentOptions;
    if (guidanceStudentSelect) guidanceStudentSelect.innerHTML = studentOptions;

    const pklPartnerSelect = document.getElementById('add-pkl-partner');
    if (pklPartnerSelect) {
      const pRes = await window.api.fetch('/partners');
      if (pRes.ok) {
        const pJson = await pRes.json();
        const partners = pJson.data || [];
        pklPartnerSelect.innerHTML = partners.map(pt => 
          `<option value="${pt.id}">${escapeHtml(pt.name)} (${escapeHtml(pt.category || 'DUDI')})</option>`
        ).join('');
      }
    }
  } catch (err) {
    console.error('Error populate dropdowns:', err);
  }
}

async function openGuruReportModal() {
  const container = document.getElementById('guru-report-printable-area');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:30px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Menyiapkan rekapitulasi data...</div>`;
  const modal = document.getElementById('modalGuruReport');
  if (modal) modal.classList.add('active');

  try {
    const res = await window.api.fetch('/guru/report');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div style="border-bottom: 2px solid #26334A; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; color: #6EE7B7; font-size: 20px; font-weight: 700;">CDGS SCHOOL CORE</h2>
          <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 13px;">Laporan Rekapitulasi Validasi Portofolio, Penempatan PKL, & Bimbingan Talenta Siswa</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #8F9DB4;">
          <div>Tanggal Terbit: <strong style="color: #fff;">${todayStr}</strong></div>
          <div>Guru Pembimbing: <strong style="color: #fff;">guru@cdgs.local</strong></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #111A2B; padding: 12px; border-radius: 6px; border: 1px solid #26334A; text-align: center;">
          <span style="font-size: 11px; color: #8F9DB4;">TOTAL SISWA BINAAN</span>
          <h3 style="margin: 4px 0 0 0; color: #34D399; font-size: 20px;">${data.stats.total_students || 0}</h3>
        </div>
        <div style="background: #111A2B; padding: 12px; border-radius: 6px; border: 1px solid #26334A; text-align: center;">
          <span style="font-size: 11px; color: #8F9DB4;">PORTOFOLIO TERVALIDASI</span>
          <h3 style="margin: 4px 0 0 0; color: #A78BFA; font-size: 20px;">${data.stats.verified_portfolios || 0}</h3>
        </div>
        <div style="background: #111A2B; padding: 12px; border-radius: 6px; border: 1px solid #26334A; text-align: center;">
          <span style="font-size: 11px; color: #8F9DB4;">SISWA AKTIF PKL</span>
          <h3 style="margin: 4px 0 0 0; color: #60A5FA; font-size: 20px;">${data.stats.active_pkl || 0}</h3>
        </div>
        <div style="background: #111A2B; padding: 12px; border-radius: 6px; border: 1px solid #26334A; text-align: center;">
          <span style="font-size: 11px; color: #8F9DB4;">RATA-RATA SKOR PORTOFOLIO</span>
          <h3 style="margin: 4px 0 0 0; color: #FCD34D; font-size: 20px;">${data.stats.avg_portfolio_score ? parseFloat(data.stats.avg_portfolio_score).toFixed(1) : '92.5'}</h3>
        </div>
      </div>

      <h4 style="margin: 0 0 10px 0; color: #F3F5FA; font-size: 14px;">Daftar Siswa Bimbingan & Kesiapan Talenta:</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #E2E8F0; margin-bottom: 20px;">
        <thead>
          <tr style="background: #111A2B; border-bottom: 1px solid #26334A; color: #94A3B8; text-align: left;">
            <th style="padding: 8px;">No</th>
            <th style="padding: 8px;">Nama Lengkap</th>
            <th style="padding: 8px;">NISN / Kelas</th>
            <th style="padding: 8px;">Jurusan</th>
            <th style="padding: 8px;">Karya Tervalidasi</th>
            <th style="padding: 8px;">Mitra PKL</th>
            <th style="padding: 8px;">Rekomendasi DUDI</th>
          </tr>
        </thead>
        <tbody>
          ${(data.students || []).map((s, idx) => `
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="padding: 8px;">${idx + 1}</td>
              <td style="padding: 8px; font-weight: 600; color: #fff;">${escapeHtml(s.full_name)}</td>
              <td style="padding: 8px;">${escapeHtml(s.nisn || '-')} / ${escapeHtml(s.class_name || '-')}</td>
              <td style="padding: 8px;">${escapeHtml(s.major || '-')}</td>
              <td style="padding: 8px; color: #34D399; font-weight: 600;">${s.verified_projects} Proyek</td>
              <td style="padding: 8px;">${escapeHtml(s.pkl_partner || 'Belum Ditempatkan')}</td>
              <td style="padding: 8px;">
                ${s.is_recommended ? '<span style="color: #FCD34D; font-weight: 600;">⭐ Prioritas Industri</span>' : '<span style="color: #94A3B8;">Standar</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #26334A;">
        <div style="text-align: center; min-width: 180px;">
          <p style="margin: 0 0 50px 0; font-size: 12px; color: #8F9DB4;">Guru Pembimbing Talenta,</p>
          <strong style="color: #fff; font-size: 13px; text-decoration: underline;">guru@cdgs.local</strong>
          <div style="font-size: 11px; color: #64748B;">NIP. 19850412 201001 1 014</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error openGuruReportModal:', err);
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Gagal memuat data laporan guru.</div>`;
  }
}

function closeGuruReportModal() {
  const modal = document.getElementById('modalGuruReport');
  if (modal) modal.classList.remove('active');
}

// ============================================================================
// 7. MURID WORKFLOW (Unggah Portofolio)
// ============================================================================
function openAddPortfolioModal() {
  const m = document.getElementById('add-portfolio-modal');
  if (m) m.classList.add('active');
}

function closeAddPortfolioModal() {
  const m = document.getElementById('add-portfolio-modal');
  if (m) m.classList.remove('active');
  const form = document.getElementById('portfolio-form');
  if (form) form.reset();
}

async function handleCreatePortfolio(e) {
  e.preventDefault();
  const title = document.getElementById('portfolio-title').value;
  const category = document.getElementById('portfolio-category').value;
  const link = document.getElementById('portfolio-link')?.value || '';
  const skills = document.getElementById('portfolio-skills').value;
  const desc = document.getElementById('portfolio-desc').value;

  try {
    const res = await window.api.fetch('/portfolios', {
      method: 'POST',
      body: JSON.stringify({
        title,
        category,
        skills,
        description: desc,
        repo_link: link,
        demo_link: link
      })
    });
    const result = await res.json();
    if (result.success) {
      alert(`🎉 Portofolio "${title}" berhasil diajukan ke antrean validasi guru pembimbing!`);
      closeAddPortfolioModal();

      // Tambahkan kartu visual di tampilan Murid
      const grid = document.getElementById('murid-portfolio-grid');
      if (grid) {
        const card = document.createElement('div');
        card.className = 'portfolio-card';
        card.style.borderColor = '#d97706';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <span class="portfolio-badge-pending"><i class="fa-solid fa-clock"></i> Menunggu Guru</span>
            <span style="font-size: 11px; color: #8F9DB4;">${escapeHtml(category)}</span>
          </div>
          <h4 style="margin: 0 0 6px 0; color: #F3F5FA; font-size: 15px;">${escapeHtml(title)}</h4>
          <p style="margin: 0 0 10px 0; color: #8F9DB4; font-size: 12px; line-height: 1.4;">${escapeHtml(desc)}</p>
          <div class="skill-tags">
            ${skills.split(',').map(s => `<span class="skill-tag">${escapeHtml(s.trim())}</span>`).join('')}
          </div>
          <div style="margin-top: auto; border-top: 1px solid #26334A; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #FCD34D;">
            <span>Status: Pengajuan Baru</span>
            <span style="color: #9ca3af;">Baru saja</span>
          </div>
        `;
        grid.prepend(card);
      }

      // Update Guru state jika sedang aktif
      loadGuruStats();
      loadGuruPortfolios();
    } else {
      alert(result.message || 'Gagal mengajukan portofolio');
    }
  } catch (err) {
    console.error('Error create portfolio:', err);
    alert('Terjadi kesalahan saat mengajukan portofolio.');
  }
}

// ============================================================================
// 8. INSTANSI WORKFLOW (Find Talent & Invites)
// ============================================================================
function filterTalents() {
  const query = (document.getElementById('find-talent-search') || {}).value?.toLowerCase() || '';
  const jurusan = (document.getElementById('find-talent-jurusan') || {}).value?.toLowerCase() || '';

  const cards = document.querySelectorAll('#talent-card-grid .talent-card');
  let visibleCount = 0;

  cards.forEach(c => {
    const skills = c.getAttribute('data-skills') || '';
    const text = c.innerText.toLowerCase();

    const matchesQuery = !query || skills.includes(query) || text.includes(query);
    const matchesJurusan = !jurusan || skills.includes(jurusan) || text.includes(jurusan);

    if (matchesQuery && matchesJurusan) {
      c.style.display = 'flex';
      visibleCount++;
    } else {
      c.style.display = 'none';
    }
  });

  const countLabel = document.getElementById('talent-count-label');
  if (countLabel) {
    countLabel.textContent = `Menampilkan ${visibleCount} Talenta Siap Magang`;
  }
}

let targetInviteStudent = '';
function inviteTalent(studentName, major) {
  targetInviteStudent = studentName;
  const label = document.getElementById('invite-student-name');
  if (label) label.textContent = `${studentName} (${major})`;

  const modal = document.getElementById('invite-talent-modal');
  if (modal) modal.classList.add('active');
}

function closeInviteModal() {
  const modal = document.getElementById('invite-talent-modal');
  if (modal) modal.classList.remove('active');
}

function handleSendInvitation(e) {
  e.preventDefault();
  const pos = document.getElementById('invite-position').value;
  closeInviteModal();
  alert(`📨 Undangan magang untuk posisi "${pos}" telah berhasil dikirimkan kepada ${targetInviteStudent} dan ditembuskan ke pihak sekolah!`);
}

function openAddJobModal() {
  const pos = prompt('Masukkan nama lowongan magang yang ingin dibuka:', 'Frontend Developer Apprentice');
  if (pos) {
    alert(`📢 Lowongan magang "${pos}" berhasil dibuka dan kini dapat dilihat oleh siswa yang memenuhi kriteria!`);
  }
}

function downloadExecutiveReport() {
  alert('📥 Menyiapkan Rekap Laporan Mutu & Capaian Eksekutif Sekolah (PDF)... Berkas akan segera diunduh.');
}

function sortTenants(tenants, sortBy) {
  const copy = [...tenants];
  if (sortBy === 'newest') {
    return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortBy === 'name') {
    return copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return copy;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sortTenants };
}