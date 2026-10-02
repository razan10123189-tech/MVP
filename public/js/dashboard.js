const mainContent = typeof document === 'undefined' ? null : document.getElementById('main-content');
const tenantState = { all: [], loaded: false };

if (mainContent) loadDashboard();

async function loadDashboard() {
  if (!window.auth.getToken()) {
    window.location.href = '/index.html';
    return;
  }

  showLoading();

  try {
    const res = await window.api.fetch('/auth/me');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || data.message || 'Profil akun tidak dapat dimuat.');
      error.status = res.status;
      throw error;
    }

    const profile = data.user;
    if (!profile || !profile.email || !profile.role) {
      throw new Error('Data profil belum lengkap.');
    }

    updateAccountChip(profile);
    if (profile.role === 'Platform Admin') {
      renderAdminDashboard(profile);
      loadTenants();
    } else {
      renderRoleDashboard(profile);
    }
  } catch (error) {
    if (error.message === '401') return;
    if (error.status === 403) {
      window.auth.clearToken();
      showSessionError();
      return;
    }
    showProfileError(error);
  }
}

function showLoading() {
  mainContent.innerHTML = `
    <div class="dashboard-loading" role="status" aria-live="polite">
      <span class="loading-mark" aria-hidden="true"></span>
      <span>Memuat dashboard...</span>
    </div>`;
}

function showProfileError(error) {
  mainContent.innerHTML = `
    <section class="page-message" role="alert">
      <p class="page-message-title">Dashboard belum dapat dimuat</p>
      <p class="page-message-copy"></p>
      <button class="btn-secondary" id="retry-profile" type="button">Coba lagi</button>
    </section>`;
  mainContent.querySelector('.page-message-copy').textContent = error.message || 'Periksa koneksi Anda lalu coba lagi.';
  document.getElementById('retry-profile').addEventListener('click', loadDashboard);
}

function showSessionError() {
  mainContent.innerHTML = `
    <section class="page-message" role="alert">
      <p class="page-message-title">Sesi berakhir</p>
      <p class="page-message-copy">Masuk kembali untuk membuka dashboard.</p>
      <a class="btn-primary message-link" href="/index.html">Masuk kembali</a>
    </section>`;
}

function updateAccountChip(profile) {
  const email = profile.email;
  document.getElementById('account-email-short').textContent = email;
  document.getElementById('account-role-short').textContent = profile.role;
  document.querySelector('.admin-nav-link').hidden = profile.role !== 'Platform Admin';
  document.querySelector('.topbar-search').hidden = profile.role !== 'Platform Admin';
}

function renderAdminDashboard(profile) {
  mainContent.innerHTML = `
    <section class="dashboard-intro" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">CDGS SCHOOL CORE</p>
        <h1 id="page-title">Dashboard Platform</h1>
        <p class="intro-copy">Ringkasan tenant, domain, dan akses administrasi sekolah.</p>
      </div>
      <p class="scope-chip">Seluruh platform</p>
    </section>

    <section class="summary-grid" aria-label="Ringkasan platform">
      <article class="summary-card summary-card-primary">
        <p class="summary-label">TENANT TERDAFTAR</p>
        <p class="summary-value" id="tenant-count" aria-live="polite">–</p>
        <p class="summary-caption">Data tenant di CDGS</p>
      </article>
      <article class="summary-card">
        <p class="summary-label">DOMAIN TERCATAT</p>
        <p class="summary-value" id="domains-count" aria-live="polite">–</p>
        <p class="summary-caption">Tenant dengan domain</p>
      </article>
      <article class="summary-card">
        <p class="summary-label">DOMAIN BELUM DIISI</p>
        <p class="summary-value" id="missing-domains-count" aria-live="polite">–</p>
        <p class="summary-caption">Perlu dilengkapi pada data tenant</p>
      </article>
      <article class="summary-card">
        <p class="summary-label">PERAN AKUN</p>
        <p class="summary-value summary-value-text" id="summary-role"></p>
        <p class="summary-caption">Hak akses saat ini</p>
      </article>
      <article class="summary-card">
        <p class="summary-label">CAKUPAN AKUN</p>
        <p class="summary-value summary-value-text">Platform</p>
        <p class="summary-caption">Administrasi lintas tenant</p>
      </article>
    </section>

    <div class="dashboard-columns">
      <section class="panel domain-panel" id="domain-section" aria-labelledby="domain-title">
        <div class="panel-heading">
          <div><h2 id="domain-title">Kelengkapan domain tenant</h2><p class="panel-copy">Status berdasarkan data tenant yang terdaftar.</p></div>
        </div>
        <div class="domain-chart" role="img" aria-label="Ringkasan domain tenant">
          <div class="domain-chart-bars">
            <div class="domain-bar-item"><strong id="domain-chart-count">–</strong><div class="domain-bar-track"><span class="domain-bar-present" id="domain-chart-filled"></span></div><span class="domain-bar-label">Domain tercatat</span></div>
            <div class="domain-bar-item"><strong id="missing-chart-count">–</strong><div class="domain-bar-track"><span class="domain-bar-missing" id="domain-chart-missing"></span></div><span class="domain-bar-label">Belum ada domain</span></div>
          </div>
        </div>
      </section>

      <aside class="panel account-panel" id="profile-section" aria-labelledby="account-title">
        <div class="panel-heading panel-heading-compact">
          <div>
            <p class="eyebrow">ADMIN PLATFORM</p>
            <h2 id="account-title">Akun aktif</h2>
          </div>
        </div>
        <dl class="account-details">
          <div><dt>Email</dt><dd id="profile-email"></dd></div>
          <div><dt>Peran</dt><dd id="profile-role"></dd></div>
          <div><dt>Tenant ID</dt><dd id="profile-tenant" class="identifier"></dd></div>
          <div><dt>School ID</dt><dd id="profile-school" class="identifier"></dd></div>
        </dl>
        <p class="account-note">Informasi mengikuti akun yang sedang masuk.</p>
      </aside>
    </div>`;

  mainContent.insertAdjacentHTML('beforeend', `
    <nav class="dashboard-tabs" aria-label="Bagian dashboard">
      <a href="#tenant-section" class="dashboard-tab active" aria-current="location">Daftar tenant</a>
      <a href="#domain-section" class="dashboard-tab">Status domain</a>
      <a href="#profile-section" class="dashboard-tab">Akun aktif</a>
    </nav>
    <section class="panel tenant-panel" id="tenant-section" aria-labelledby="tenant-title">
      <div class="tenant-toolbar">
        <div><p class="eyebrow">DATA PLATFORM</p><h2 id="tenant-title">Tenant terdaftar</h2></div>
        <div class="tenant-tools">
          <div class="tenant-filters" role="group" aria-label="Filter tenant">
            <button type="button" class="tenant-filter active" data-domain-filter="all" aria-pressed="true">Semua</button>
            <button type="button" class="tenant-filter" data-domain-filter="present" aria-pressed="false">Ada domain</button>
            <button type="button" class="tenant-filter" data-domain-filter="missing" aria-pressed="false">Belum ada</button>
          </div>
          <label class="tenant-sort-field"><span class="visually-hidden">Urutkan tenant</span>
            <select id="tenant-sort"><option value="newest">Terbaru</option><option value="name">Nama A–Z</option></select>
          </label>
        </div>
      </div>
      <div id="tenant-state" role="status" aria-live="polite" aria-atomic="true">
        <div class="table-loading"><span class="loading-mark" aria-hidden="true"></span>Memuat tenant...</div>
      </div>
    </section>`);

  document.getElementById('summary-role').textContent = profile.role;
  document.getElementById('profile-email').textContent = profile.email;
  document.getElementById('profile-role').textContent = profile.role;
  document.getElementById('profile-tenant').textContent = profile.tenant_id || 'Tidak ada';
  document.getElementById('profile-school').textContent = profile.school_id || 'Tidak ada';

  document.getElementById('tenant-search').addEventListener('input', refreshTenantRows);
  document.getElementById('tenant-sort').addEventListener('change', refreshTenantRows);
  document.querySelectorAll('.tenant-filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.tenant-filter').forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    refreshTenantRows();
  }));
}

function renderRoleDashboard(profile) {
  mainContent.innerHTML = `
    <section class="dashboard-intro" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">CDGS SCHOOL CORE</p>
        <h1 id="page-title">Dashboard</h1>
        <p class="intro-copy">Ruang kerja Anda di platform sekolah.</p>
      </div>
      <p class="welcome-note">Masuk sebagai <strong id="welcome-email"></strong></p>
    </section>
    <div class="role-dashboard-grid">
      <section class="panel role-panel" aria-labelledby="role-panel-title">
        <p class="eyebrow">PERAN AKUN</p>
        <h2 id="role-panel-title" class="role-heading"></h2>
        <p class="panel-copy">Modul untuk peran ini belum tersedia di dashboard saat ini.</p>
      </section>
      <section class="panel account-panel" aria-labelledby="account-title">
        <div class="panel-heading panel-heading-compact">
          <div><p class="eyebrow">AKUN</p><h2 id="account-title">Profil Anda</h2></div>
        </div>
        <dl class="account-details">
          <div><dt>Email</dt><dd id="profile-email"></dd></div>
          <div><dt>Peran</dt><dd id="profile-role"></dd></div>
          <div><dt>Tenant ID</dt><dd id="profile-tenant" class="identifier"></dd></div>
          <div><dt>School ID</dt><dd id="profile-school" class="identifier"></dd></div>
        </dl>
      </section>
    </div>`;

  document.getElementById('welcome-email').textContent = profile.email;
  document.querySelector('.role-heading').textContent = profile.role;
  fillProfileDetails(profile);
}

function fillProfileDetails(profile) {
  document.getElementById('profile-email').textContent = profile.email;
  document.getElementById('profile-role').textContent = profile.role;
  document.getElementById('profile-tenant').textContent = profile.tenant_id || 'Tidak ada';
  document.getElementById('profile-school').textContent = profile.school_id || 'Tidak ada';
}

async function loadTenants() {
  const state = document.getElementById('tenant-state');

  try {
    const res = await window.api.fetch('/tenants');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Daftar tenant tidak dapat dimuat.');

    tenantState.all = Array.isArray(data.tenants) ? data.tenants : [];
    tenantState.loaded = true;
    const withDomain = tenantState.all.filter(tenant => Boolean(tenant.domain)).length;
    const withoutDomain = tenantState.all.length - withDomain;
    document.getElementById('tenant-count').textContent = tenantState.all.length.toLocaleString('id-ID');
    document.getElementById('domains-count').textContent = withDomain.toLocaleString('id-ID');
    document.getElementById('missing-domains-count').textContent = withoutDomain.toLocaleString('id-ID');
    document.getElementById('domain-chart-count').textContent = withDomain.toLocaleString('id-ID');
    document.getElementById('missing-chart-count').textContent = withoutDomain.toLocaleString('id-ID');
    const chartMax = Math.max(withDomain, withoutDomain, 1);
    document.getElementById('domain-chart-filled').style.height = `${(withDomain / chartMax) * 100}%`;
    document.getElementById('domain-chart-missing').style.height = `${(withoutDomain / chartMax) * 100}%`;
    document.querySelector('.domain-chart').setAttribute('aria-label', `${withDomain} tenant memiliki domain; ${withoutDomain} belum memiliki domain.`);
    refreshTenantRows();
  } catch (error) {
    if (error.message === '401') return;
    state.innerHTML = `
      <div class="state-message" role="alert">
        <p class="state-title">Daftar tenant tidak dapat dimuat</p>
        <p class="state-copy"></p>
        <button class="btn-secondary" id="retry-tenants" type="button">Coba lagi</button>
      </div>`;
    state.querySelector('.state-copy').textContent = error.message || 'Periksa koneksi Anda lalu coba lagi.';
    document.getElementById('retry-tenants').addEventListener('click', loadTenants);
  }
}

function filterTenants(query) {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  if (!normalizedQuery) return tenantState.all;
  return tenantState.all.filter(tenant =>
    [tenant.name, tenant.domain, tenant.id]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase('id-ID').includes(normalizedQuery))
  );
}

function refreshTenantRows() {
  const query = document.getElementById('tenant-search').value;
  const sort = document.getElementById('tenant-sort').value;
  const domainFilter = document.querySelector('.tenant-filter.active')?.dataset.domainFilter || 'all';
  const filtered = filterTenants(query).filter(tenant => domainFilter === 'all' || Boolean(tenant.domain) === (domainFilter === 'present'));
  renderTenantRows(sortTenants(filtered, sort));
}

function sortTenants(tenants, sort) {
  const sorted = [...tenants];
  if (sort === 'name') {
    return sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' }));
  }
  return sorted.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
}

function renderTenantRows(tenants) {
  if (!tenantState.loaded) return;
  const state = document.getElementById('tenant-state');
  state.replaceChildren();

  if (tenantState.all.length === 0) {
    state.innerHTML = '<div class="empty-state"><span class="empty-mark" aria-hidden="true"></span><p class="state-title">Belum ada tenant</p><p class="state-copy">Tenant yang terdaftar akan muncul di sini.</p></div>';
    return;
  }

  if (tenants.length === 0) {
    state.innerHTML = '<p class="no-results" role="status">Tidak ada tenant yang cocok dengan filter saat ini.</p>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';
  const table = document.createElement('table');
  table.className = 'tenant-table';
  table.innerHTML = `
    <thead><tr>
      <th scope="col">Nama tenant</th>
      <th scope="col">Domain</th>
      <th scope="col">Tanggal dibuat</th>
    </tr></thead>
    <tbody></tbody>`;

  const tbody = table.querySelector('tbody');
  tenants.forEach(tenant => {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    name.className = 'tenant-name-cell';
    name.textContent = tenant.name || 'Tanpa nama';

    const domain = document.createElement('td');
    domain.className = 'tenant-domain-cell';
    domain.textContent = tenant.domain || 'Tidak ada domain';

    const createdAt = document.createElement('td');
    createdAt.textContent = tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : '–';

    row.append(name, domain, createdAt);
    tbody.appendChild(row);
  });

  wrapper.appendChild(table);
  state.appendChild(wrapper);
}

if (typeof module !== 'undefined') module.exports = { sortTenants };
