document.addEventListener('DOMContentLoaded', async () => {
  // Render Chart Domain Tenant
  initTenantChart(2, 0);

  // Load Data Mitra DUDI & PTN
  await loadPartners();

  // Setup Listener Form Submit Mitra
  const partnerForm = document.getElementById('partner-form');
  if (partnerForm) {
    partnerForm.addEventListener('submit', handleAddPartner);
  }
});

// Render Chart Domain Tenant (Chart.js)
function initTenantChart(withDomain = 2, noDomain = 0) {
  const ctx = document.getElementById('tenantDomainChart');
  if (!ctx || !window.Chart) return;

  if (window.myTenantChart) {
    window.myTenantChart.destroy();
  }

  window.myTenantChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Domain tercatat', 'Belum ada domain'],
      datasets: [{
        label: 'Jumlah Tenant',
        data: [withDomain, noDomain],
        backgroundColor: ['#8b5cf6', '#10b981'],
        borderRadius: 4,
        barThickness: 35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#9ca3af', stepSize: 1 }, grid: { color: '#374151' } }
      }
    }
  });
}

// Fetch & Render Data Mitra
async function loadPartners() {
  const tableBody = document.getElementById('partner-table-body');
  if (!tableBody) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/v1/partners', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      tableBody.innerHTML = result.data.map(p => `
        <tr style="border-bottom: 1px solid #374151;">
          <td style="padding: 12px 10px; font-weight: 500;">${p.name}</td>
          <td style="padding: 12px 10px;">
            <span style="background: ${p.category === 'DUDI' ? '#3b82f6' : '#10b981'}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
              ${p.category}
            </span>
          </td>
          <td style="padding: 12px 10px; color: #d1d5db;">${p.contact_person || '-'}</td>
          <td style="padding: 12px 10px; color: #d1d5db;">${p.phone || '-'}</td>
          <td style="padding: 12px 10px;">
            <button onclick="deletePartner('${p.id}')" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Hapus</button>
          </td>
        </tr>
      `).join('');
    } else {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Belum ada data mitra.</td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Error loading partners:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Gagal memuat data mitra.</td>
      </tr>
    `;
  }
}

// Tambah Mitra
async function handleAddPartner(e) {
  e.preventDefault();

  const name = document.getElementById('partner-name').value;
  const category = document.getElementById('partner-category').value;
  const addressEl = document.getElementById('partner-address');
  const address = addressEl ? addressEl.value : '';
  const contact_person = document.getElementById('partner-cp').value;
  const phone = document.getElementById('partner-phone').value;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/v1/partners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, category, address, contact_person, phone })
    });

    const result = await response.json();

    if (result.success) {
      closePartnerModal();
      document.getElementById('partner-form').reset();
      loadPartners();
    } else {
      alert(result.message || 'Gagal menambahkan mitra');
    }
  } catch (error) {
    console.error('Error adding partner:', error);
    alert('Terjadi kesalahan server saat menambah mitra');
  }
}

// Hapus Mitra
async function deletePartner(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus mitra ini?')) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/v1/partners/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();

    if (result.success) {
      loadPartners();
    } else {
      alert(result.message || 'Gagal menghapus mitra');
    }
  } catch (error) {
    console.error('Error deleting partner:', error);
    alert('Terjadi kesalahan server saat menghapus mitra');
  }
}

// Control Modal
function openPartnerModal() {
  const modal = document.getElementById('partner-modal');
  if (modal) modal.style.display = 'flex';
}

function closePartnerModal() {
  const modal = document.getElementById('partner-modal');
  if (modal) modal.style.display = 'none';
}

// 1. Fungsi Buka & Tutup Modal Sekolah
function openSchoolModal() {
  document.getElementById('school-modal').style.display = 'block';
}

function closeSchoolModal() {
  document.getElementById('school-modal').style.display = 'none';
  document.getElementById('school-form').reset();
}

// 2. Fungsi Submit Form Tambah Sekolah
async function handleAddSchool(event) {
  event.preventDefault();

  const payload = {
    npsn: document.getElementById('school-npsn').value,
    name: document.getElementById('school-name').value,
    level: document.getElementById('school-level').value,
    status: document.getElementById('school-status').value,
    accreditation: document.getElementById('school-accreditation').value,
    address: document.getElementById('school-address').value
  };

  try {
    const response = await fetch('/api/v1/schools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('Sekolah berhasil ditambahkan!');
      closeSchoolModal();
      // panggil fungsi loadSchools() di sini jika sudah ada tabel data sekolah
    } else {
      alert(result.message || 'Gagal menambahkan sekolah');
    }
  } catch (error) {
    console.error('Error handleAddSchool:', error);
    alert('Terjadi kesalahan koneksi ke server');
  }
}
// 2. FUNGSI UNTUK AMBIL DATA DAN RENDER KE TABEL
async function loadSchools() {
  console.log('Fungsi loadSchools() sedang berjalan...');

  try {
    const response = await fetch('/api/v1/schools');
    const result = await response.json();

    console.log('Hasil dari API:', result);

    if (result.success) {
      const tbody = document.getElementById('schoolTableBody');

      if (!tbody) {
        console.error('Element <tbody id="schoolTableBody"> tidak ditemukan!');
        return;
      }

      tbody.innerHTML = '';

      if (result.data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">Belum ada data sekolah.</td>
          </tr>
        `;
        return;
      }

      result.data.forEach((school, index) => {
        tbody.innerHTML += `
          <tr>
            <td>${index + 1}</td>
            <td>${school.npsn}</td>
            <td>${school.name}</td>
            <td>${school.level}</td>
            <td>${school.status}</td>
            <td>${school.accreditation || '-'}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="deleteSchool('${school.id}')">Hapus</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (error) {
    console.error('Gagal mengambil data:', error);
  }
}
const schoolForm = document.getElementById('schoolForm'); // Sesuaikan ID form modal
if (schoolForm) {
  schoolForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      npsn: document.getElementById('npsn').value,
      name: document.getElementById('name').value,
      level: document.getElementById('level').value,
      status: document.getElementById('status').value,
      accreditation: document.getElementById('accreditation').value,
      address: document.getElementById('address').value
    };

    const response = await fetch('/api/v1/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    if (response.ok) {
      alert('Sekolah berhasil ditambahkan!');
      schoolForm.reset();
      
      // Tutup modal (sesuaikan dengan mekanisme modal kamu)
      loadSchools(); // <-- Panggil di sini agar tabel otomatis terbarui
    } else {
      alert(result.message);
    }
  });
}

// 4. PANGGIL SETELAH BERHASIL HAPUS SEKOLAH
async function deleteSchool(id) {
  if (!confirm('Yakin ingin menghapus sekolah ini?')) return;

  try {
    const response = await fetch(`/api/v1/schools/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Sekolah berhasil dihapus!');
      loadSchools(); // <-- Panggil di sini juga
    }
  } catch (error) {
    console.error('Error deleteSchool:', error);
  }
}

async function loadSchools() {
  console.log('--- [DEBUG] Menjalankan loadSchools() ---');
  
  const token = localStorage.getItem('token'); // Ambil token simpanan login
  const tbody = document.getElementById('schoolTableBody');

  if (!tbody) {
    console.error('❌ Error: Elemen <tbody id="schoolTableBody"> TIDAK DITEMUKAN di HTML!');
    return;
  }

  try {
    const response = await fetch('/api/v1/schools', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    console.log('--- [DEBUG] Status HTTP API: ---', response.status);

    const result = await response.json();
    console.log('--- [DEBUG] Data dari Server: ---', result);

    if (response.ok && result.success) {
      tbody.innerHTML = '';

      if (!result.data || result.data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-3 text-muted">Belum ada data sekolah.</td>
          </tr>`;
        return;
      }

      result.data.forEach((school, index) => {
        tbody.innerHTML += `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${school.npsn}</strong></td>
            <td>${school.name}</td>
            <td><span class="badge bg-info">${school.level}</span></td>
            <td>${school.status}</td>
            <td>${school.accreditation || '-'}</td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteSchool('${school.id}')">
                Hapus
              </button>
            </td>
          </tr>
        `;
      });
    } else {
      console.error('❌ Gagal memuat data:', result.message);
    }
  } catch (error) {
    console.error('❌ Error Fetching API:', error);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  loadSchools();
});

const btnMenuSekolah = document.getElementById('btn-menu-sekolah'); 
if (btnMenuSekolah) {
  btnMenuSekolah.addEventListener('click', () => {
    loadSchools(); // Panggil ulang saat menu Sekolah diklik
  });
}