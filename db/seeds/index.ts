import { seedRoles } from "./seed-roles";
import { seedCriteria } from "./seed-criteria";
import { seedAdmin } from "./seed-admin";

async function main() {
  console.log("🌱 Starting database seed...\n");

  try {
    await seedRoles();
    await seedCriteria();
    await seedAdmin();

    console.log("\n✅ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
