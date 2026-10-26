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
      { icon: 'fa-solid fa-chalkboard-user', label: 'Dashboard Guru', active: true, onclick: "setDashboardRole('Guru')" },
      { icon: 'fa-solid fa-check-double', label: 'Antrean Validasi (3)', onclick: "scrollToReviewQueue()" },
      { icon: 'fa-solid fa-users', label: 'Siswa Bimbingan', onclick: "alert('Daftar siswa bimbingan aktif semester ini.')" },
      { icon: 'fa-solid fa-briefcase', label: 'Monitoring PKL', onclick: "alert('Status absensi dan jurnal magang siswa di DUDI.')" }
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

const editSchoolForm = document.getElementById('editSchoolForm');
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
// 6. GURU WORKFLOW (Validasi Portofolio)
// ============================================================================
function scrollToReviewQueue() {
  const el = document.getElementById('section-review-queue');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function guruApprovePortfolio(id, studentName, title) {
  const item = document.getElementById(`review-item-${id}`);
  if (item) {
    item.style.transition = 'all 0.3s ease';
    item.style.opacity = '0.4';
    item.style.background = '#092B24';
    setTimeout(() => {
      item.remove();
      const countEl = document.getElementById('stat-guru-pending');
      const verifiedEl = document.getElementById('stat-guru-verified');
      if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent || '3') - 1);
      if (verifiedEl) verifiedEl.textContent = parseInt(verifiedEl.textContent || '58') + 1;

      alert(`✅ Berhasil! Portofolio "${title}" milik ${studentName} telah divalidasi dan lencana keahlian industri telah disematkan.`);
    }, 300);
  }
}

function guruRevisePortfolio(id, studentName) {
  const note = prompt(`Masukkan catatan revisi untuk ${studentName}:`, 'Harap lengkapi tautan repository GitHub dan dokumentasi deployment.');
  if (note) {
    alert(`💬 Catatan revisi telah dikirimkan ke akun ${studentName}.`);
  }
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

function handleCreatePortfolio(e) {
  e.preventDefault();
  const title = document.getElementById('portfolio-title').value;
  const category = document.getElementById('portfolio-category').value;
  const skills = document.getElementById('portfolio-skills').value;
  const desc = document.getElementById('portfolio-desc').value;

  const grid = document.getElementById('murid-portfolio-grid');
  if (grid) {
    const card = document.createElement('div');
    card.className = 'portfolio-card';
    card.style.borderColor = '#d97706';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <span class="portfolio-badge-pending"><i class="fa-solid fa-clock"></i> Menunggu Guru</span>
        <span style="font-size: 11px; color: #8F9DB4;">${category}</span>
      </div>
      <h4 style="margin: 0 0 6px 0; color: #F3F5FA; font-size: 15px;">${title}</h4>
      <p style="margin: 0 0 10px 0; color: #8F9DB4; font-size: 12px; line-height: 1.4;">${desc}</p>
      <div class="skill-tags">
        ${skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}
      </div>
      <div style="margin-top: auto; border-top: 1px solid #26334A; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #FCD34D;">
        <span>Status: Pengajuan Baru</span>
        <span style="color: #9ca3af;">Baru saja</span>
      </div>
    `;
    grid.prepend(card);
  }

  closeAddPortfolioModal();
  alert(`🎉 Portofolio "${title}" berhasil dikirim ke antrean review guru pembimbing!`);
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