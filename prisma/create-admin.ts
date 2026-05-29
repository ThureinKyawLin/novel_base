import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Override via env vars for production: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@novelbase.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.env.ADMIN_DISPLAY_NAME || "Admin";

if (ADMIN_PASSWORD === "admin123") {
  console.warn("⚠️  Using default password 'admin123'. Set ADMIN_PASSWORD env var for production!");
}

async function main() {
  const passwordHash = await hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  await prisma.profile.upsert({
    where: { id: user.id },
    update: { role: "admin", displayName: ADMIN_NAME },
    create: {
      id: user.id,
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: "admin",
    },
  });

  console.log(`✅ Admin user created/updated:`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
