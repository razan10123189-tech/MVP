const assert = require('node:assert/strict');
const { sortTenants } = require('./public/js/dashboard');

const tenants = [
  { id: 'old', name: 'Alpha', created_at: '2025-01-01T00:00:00Z' },
  { id: 'new', name: 'Zeta', created_at: '2025-10-01T00:00:00Z' },
];

assert.deepEqual(sortTenants(tenants, 'newest').map(tenant => tenant.id), ['new', 'old']);
assert.deepEqual(sortTenants(tenants, 'name').map(tenant => tenant.id), ['old', 'new']);
assert.deepEqual(tenants.map(tenant => tenant.id), ['old', 'new']);
