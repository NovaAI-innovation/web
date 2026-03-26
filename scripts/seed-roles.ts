/**
 * Seed required roles and create the initial admin user.
 *
 * Run: npm run db:seed
 *
 * Requires:
 *   DATABASE_URL  — Postgres connection string
 *   ADMIN_EMAIL   — Email for the initial admin account
 *   ADMIN_PASSWORD — Temporary password for the initial admin (will be bcrypt-hashed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding roles…");

  // Create roles if they don't exist
  const roles = [
    { name: "client",    description: "End customer with active project" },
    { name: "admin",     description: "Chimera staff with full CRM access" },
    { name: "developer", description: "Internal engineering access" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    console.log(`  ✓ Role: ${role.name}`);
  }

  // Create initial admin user if ADMIN_EMAIL and ADMIN_PASSWORD are set
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 14);
      await prisma.user.create({
        data: {
          name: "Chimera Admin",
          email: adminEmail,
          passwordHash,
          roleId: adminRole.id,
          emailVerifiedAt: new Date(), // admin created by system — pre-verified
        },
      });
      console.log(`  ✓ Admin user created: ${adminEmail}`);
    } else {
      console.log(`  ℹ Admin user already exists: ${adminEmail}`);
    }
  } else {
    console.log("  ℹ ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin user creation");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
