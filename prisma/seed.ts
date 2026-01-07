import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed with raw SQL...");

  try {
    const hashedPassword = await bcrypt.hash("VDA_NASILEMAK@7", 10);
    const adminId = uuidv4();
    const userId = uuidv4();
    const testUserPassword = await bcrypt.hash("password123", 10);

    // Seed Admin with raw SQL
    await prisma.$executeRaw`
      INSERT INTO admin (id, name, email, password, createdAt, updatedAt) 
      VALUES (${adminId}, 'Super Admin', 'admin@vipey.co', ${hashedPassword}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        name = 'Super Admin',
        password = ${hashedPassword},
        updatedAt = NOW()
    `;
    console.log("✅ Admin seeded");

    // Seed WebSettings with raw SQL
    await prisma.$executeRaw`
      INSERT INTO websettings (id, cpm, createdAt, updatedAt) 
      VALUES (1, 2.0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        cpm = 2.0,
        updatedAt = NOW()
    `;
    console.log("✅ WebSettings seeded");

    // Seed Test User with raw SQL
    await prisma.$executeRaw`
      INSERT INTO user (id, fullName, username, email, password, whatsapp, isEmailVerified, totalEarnings, isSuspended, createdAt, updatedAt) 
      VALUES (${userId}, 'Test User', 'testuser', 'user@test.com', ${testUserPassword}, '+6281234567890', true, 0, false, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        fullName = 'Test User',
        password = ${testUserPassword},
        updatedAt = NOW()
    `;
    console.log("✅ Test User seeded");

    console.log("🎉 Seeding completed successfully!");

    // Verify results
    const adminCount = await prisma.admin.count();
    const userCount = await prisma.user.count();
    const settingsCount = await prisma.webSettings.count();

    console.log(`📊 Database stats:`);
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Settings: ${settingsCount}`);

  } catch (error: any) {
    console.error("❌ Error during seeding:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });