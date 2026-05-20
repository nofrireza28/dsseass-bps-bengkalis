import { db } from '../index';
import { users, employees, roles, userRoles } from '../schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';


const ADMIN_DATA = {
  email: 'trinanda.yulia@bps.go.id',
  password: 'admin123',
  nip: '200007202023032001',
  fullName: 'Trinanda Yulia Putri',
  position: 'Administrator Sistem',
};

export async function seedAdmin() {
  console.log('📌 Seeding admin user...');

  // Check apakah admin sudah ada
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_DATA.email))
    .limit(1);

  if (existingUser.length > 0) {
    console.log(`  ⏭  Admin user already exists: ${ADMIN_DATA.email}`);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ADMIN_DATA.password, 10);

  // Create user
  const [newUser] = await db.insert(users).values({
    email: ADMIN_DATA.email,
    passwordHash,
    emailVerified: new Date(),
    isActive: true,
  }).returning({ id: users.id });

  console.log(`  ✓ Created user: ${ADMIN_DATA.email}`);

  // Create employee linked to user
  await db.insert(employees).values({
    userId: newUser.id,
    nip: ADMIN_DATA.nip,
    fullName: ADMIN_DATA.fullName,
    position: ADMIN_DATA.position,
    status: 'ACTIVE',
    joinedAt: new Date().toISOString().split('T')[0],
  }).returning({ id: employees.id });

  console.log(`  ✓ Created employee: ${ADMIN_DATA.fullName} (${ADMIN_DATA.nip})`);

  // Assign ADMIN role to user
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'ADMIN'))
    .limit(1);

  if (!adminRole) {
    throw new Error('ADMIN role not found. Pastikan seedRoles() dijalankan dulu.');
  }

  await db.insert(userRoles).values({
    userId: newUser.id,
    roleId: adminRole.id,
  });

  console.log(`  ✓ Assigned ADMIN role to user`);
  
  console.log('\n  📋 Admin login credentials:');
  console.log(`     Email: ${ADMIN_DATA.email}`);
  console.log(`     Password: ${ADMIN_DATA.password}`);
  console.log(`     ⚠️  Ganti password setelah login pertama!\n`);
}