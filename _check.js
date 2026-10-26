const db = require('./src/config/database');

async function check() {
  try {
    const schema = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('=== USERS TABLE SCHEMA ===');
    console.table(schema.rows);

    const users = await db.query('SELECT id, email, tenant_id, school_id FROM users');
    console.log('=== EXISTING USERS ===');
    console.table(users.rows);

    const tenants = await db.query('SELECT id, name, domain FROM tenants');
    console.log('=== TENANTS ===');
    console.table(tenants.rows);

    const roles = await db.query('SELECT id, name FROM roles');
    console.log('=== ROLES ===');
    console.table(roles.rows);

    const userRoles = await db.query(
      `SELECT u.email, r.name as role FROM user_roles ur 
       JOIN users u ON u.id = ur.user_id 
       JOIN roles r ON r.id = ur.role_id`
    );
    console.log('=== USER ROLES ===');
    console.table(userRoles.rows);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
