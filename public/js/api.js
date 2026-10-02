const BASE_URL = '/api/v1';

async function apiFetch(path, options = {}) {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const token = localStorage.getItem('token');

  const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  // 401 saat login menunjukkan kredensial salah, bukan sesi yang kedaluwarsa.
  if (res.status === 401 && !skipAuthRedirect) {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
    throw new Error('401');
  }

  return res;
}

window.api = { fetch: apiFetch, BASE_URL };
