// Simpan token setelah login berhasil.
function saveToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

function getToken() {
  return localStorage.getItem('token');
}

// Login: kirim kredensial, simpan token, lanjutkan ke profil.
async function login(email, password) {
  const res = await window.api.fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Login gagal');

  saveToken(data.token);
  return data.token;
}

// Logout: hapus token dan arahkan ke halaman login.
function logout() {
  clearToken();
  window.location.href = '/index.html';
}

window.auth = { login, logout, getToken, clearToken };
