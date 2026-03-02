import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ─── Demo user (seeded via Better Auth API) ───
const DEMO_USER = {
  name: process.env.SEED_USER_NAME || "Mimi",
  email: process.env.SEED_USER_EMAIL || "mimi@kopikita.com",
  password: process.env.SEED_USER_PASSWORD || "KopiKita2026!",
};

const CUSTOMERS = [
  { name: "Rina Maharani", contact: "rina@email.com", favoriteDrink: "Caramel Latte", interestTags: ["sweet drinks", "caramel", "morning coffee"] },
  { name: "Budi Santoso", contact: "081234567890", favoriteDrink: "Espresso Doppio", interestTags: ["black coffee", "morning coffee"] },
  { name: "Sari Dewi", contact: "sari.dewi@email.com", favoriteDrink: "Oat Milk Latte", interestTags: ["oat milk", "latte art"] },
  { name: "Arief Pratama", contact: null, favoriteDrink: "Ice Americano", interestTags: ["black coffee", "cold drinks"] },
  { name: "Dewi Lestari", contact: "dewi@email.com", favoriteDrink: "Matcha Latte", interestTags: ["matcha", "oat milk"] },
  { name: "Fajar Nugroho", contact: "081345678901", favoriteDrink: "Caramel Macchiato", interestTags: ["sweet drinks", "caramel"] },
  { name: "Gita Permata", contact: null, favoriteDrink: "Croissant + Latte", interestTags: ["pastry lover", "morning coffee"] },
  { name: "Hendra Wijaya", contact: "hendra@email.com", favoriteDrink: "Cold Brew", interestTags: ["black coffee", "cold drinks"] },
  { name: "Indah Cahyani", contact: "081456789012", favoriteDrink: "Vanilla Latte", interestTags: ["sweet drinks", "latte art"] },
  { name: "Joko Susilo", contact: null, favoriteDrink: "Espresso", interestTags: ["black coffee", "workshop"] },
  { name: "Kartika Sari", contact: "kartika@email.com", favoriteDrink: "Caramel Cold Brew", interestTags: ["caramel", "cold drinks", "sweet drinks"] },
  { name: "Lukman Hakim", contact: "081567890123", favoriteDrink: "Oat Cappuccino", interestTags: ["oat milk", "morning coffee"] },
  { name: "Maya Putri", contact: "maya@email.com", favoriteDrink: "Matcha Oat", interestTags: ["matcha", "oat milk", "cold drinks"] },
  { name: "Nanda Prasetyo", contact: null, favoriteDrink: "Americano", interestTags: ["black coffee"] },
  { name: "Olivia Tan", contact: "olivia@email.com", favoriteDrink: "Strawberry Smoothie", interestTags: ["sweet drinks", "cold drinks"] },
  { name: "Putu Adnyana", contact: "081678901234", favoriteDrink: "Bali Coffee", interestTags: ["black coffee", "workshop"] },
  { name: "Qori Ramadhani", contact: null, favoriteDrink: "Croissant Butter", interestTags: ["pastry lover"] },
  { name: "Rizki Ananda", contact: "rizki@email.com", favoriteDrink: "Caramel Frappuccino", interestTags: ["caramel", "sweet drinks", "cold drinks"] },
  { name: "Sinta Wulandari", contact: "081789012345", favoriteDrink: "Chai Latte", interestTags: ["sweet drinks", "morning coffee"] },
  { name: "Tono Hartono", contact: null, favoriteDrink: "Double Espresso", interestTags: ["black coffee", "morning coffee"] },
  { name: "Umi Kulsum", contact: "umi@email.com", favoriteDrink: "Oat Milk Mocha", interestTags: ["oat milk", "sweet drinks"] },
  { name: "Vina Anggraini", contact: "081890123456", favoriteDrink: "Almond Latte", interestTags: ["oat milk", "latte art"] },
  { name: "Wahyu Setiawan", contact: null, favoriteDrink: "Long Black", interestTags: ["black coffee", "morning coffee"] },
  { name: "Xena Larasati", contact: "xena@email.com", favoriteDrink: "Mango Smoothie", interestTags: ["sweet drinks", "cold drinks"] },
  { name: "Yusuf Maulana", contact: "081901234567", favoriteDrink: "Pain au Chocolat + Coffee", interestTags: ["pastry lover", "morning coffee", "sweet drinks"] },
  { name: "Zahra Fitri", contact: "zahra@email.com", favoriteDrink: "Iced Matcha Latte", interestTags: ["matcha", "cold drinks"] },
  { name: "Adi Firmansyah", contact: null, favoriteDrink: "Vietnamese Coffee", interestTags: ["sweet drinks", "black coffee"] },
  { name: "Bella Octavia", contact: "bella@email.com", favoriteDrink: "Rose Latte", interestTags: ["sweet drinks", "latte art"] },
  { name: "Candra Kusuma", contact: "082012345678", favoriteDrink: "Flat White", interestTags: ["morning coffee", "latte art"] },
  { name: "Dina Amelia", contact: null, favoriteDrink: "Danish Pastry + Cappuccino", interestTags: ["pastry lover", "morning coffee"] },
  { name: "Eka Saputra", contact: "eka@email.com", favoriteDrink: "Iced Caramel Macchiato", interestTags: ["caramel", "cold drinks", "sweet drinks"] },
  { name: "Fani Rahayu", contact: "082123456789", favoriteDrink: "Oat Flat White", interestTags: ["oat milk", "morning coffee"] },
  { name: "Gilang Ramadhan", contact: null, favoriteDrink: "Espresso Tonic", interestTags: ["black coffee", "cold drinks"] },
  { name: "Hani Mulyani", contact: "hani@email.com", favoriteDrink: "Taro Latte", interestTags: ["sweet drinks"] },
  { name: "Irfan Hidayat", contact: "082234567890", favoriteDrink: "Cappuccino", interestTags: ["morning coffee", "latte art"] },
  { name: "Jasmine Putri", contact: "jasmine@email.com", favoriteDrink: "Matcha Croissant Combo", interestTags: ["matcha", "pastry lover"] },
  { name: "Kevin Aditya", contact: null, favoriteDrink: "Cold Brew Tonic", interestTags: ["black coffee", "cold drinks"] },
  { name: "Lina Marlina", contact: "082345678901", favoriteDrink: "Butterscotch Latte", interestTags: ["sweet drinks", "caramel"] },
  { name: "Muhamad Ilham", contact: "ilham@email.com", favoriteDrink: "Pour Over V60", interestTags: ["black coffee", "workshop"] },
  { name: "Novi Handayani", contact: null, favoriteDrink: "Cheese Danish + Mocha", interestTags: ["pastry lover", "sweet drinks"] },
  { name: "Oscar Tan", contact: "082456789012", favoriteDrink: "Iced Oat Latte", interestTags: ["oat milk", "cold drinks"] },
  { name: "Putri Ramadhani", contact: "putri@email.com", favoriteDrink: "Caramel Latte Art", interestTags: ["caramel", "latte art", "sweet drinks"] },
  { name: "Reza Arifin", contact: null, favoriteDrink: "Single Origin Filter", interestTags: ["black coffee", "workshop"] },
  { name: "Selvi Anggraini", contact: "082567890123", favoriteDrink: "Lavender Latte", interestTags: ["sweet drinks", "latte art"] },
  { name: "Teguh Prasetya", contact: "teguh@email.com", favoriteDrink: "Americano Iced", interestTags: ["black coffee", "cold drinks", "morning coffee"] },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Clear existing data
  await db.promoCampaign.deleteMany();
  await db.promoBatch.deleteMany();
  await db.customer.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verification.deleteMany();
  await db.user.deleteMany();

  // Seed demo user via Better Auth sign-up API
  const authUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${authUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_USER),
    });
    if (res.ok) {
      console.log(`✅ Demo user created: ${DEMO_USER.email} / ${DEMO_USER.password}`);
    } else {
      const text = await res.text();
      console.log(`⚠️  Demo user creation via API failed (${res.status}): ${text}`);
      console.log("   → User will be created on first sign-up in the app");
    }
  } catch {
    console.log("⚠️  Auth server not running — demo user will be created on first sign-up");
  }

  // Seed customers
  const result = await db.customer.createMany({ data: CUSTOMERS });
  console.log(`✅ Created ${result.count} customers`);

  // Print tag summary
  const allTags = CUSTOMERS.flatMap((c) => c.interestTags);
  const tagCounts = allTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  console.log("\n📊 Tag distribution:");
  Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([tag, count]) => console.log(`   ${tag}: ${count}`));

  console.log("\n🎉 Seed complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
