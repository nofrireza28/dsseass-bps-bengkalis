import { db } from '../index';
import { roles } from '../schema';
import { eq } from 'drizzle-orm';

const ROLES_DATA = [
  {
    name: 'PEGAWAI',
    description: 'Pegawai biasa yang memberikan dan menerima penilaian dari rekan kerja',
  },
  {
    name: 'ADMIN',
    description: 'Pengelola sistem dan panitia pelaksana penilaian pegawai terbaik',
  },
  {
    name: 'PIMPINAN',
    description: 'Kepala Instansi',
  },
];

export async function seedRoles() {
  console.log('📌 Seeding roles...');

  for (const roleData of ROLES_DATA) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.name, roleData.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values(roleData);
      console.log(`  ✓ Created role: ${roleData.name}`);
    } else {
      console.log(`  ⏭  Role already exists: ${roleData.name}`);
    }
  }
}