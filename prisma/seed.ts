import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const prisma = new PrismaClient({ adapter });

const genres = [
  { name: "Action", nameMm: "အက်ရှင်" },
  { name: "Adventure", nameMm: "စွန့်စားခန်း" },
  { name: "Comedy", nameMm: "ဟာသ" },
  { name: "Drama", nameMm: "ဒရာမာ" },
  { name: "Fantasy", nameMm: "ဖန်တစီ" },
  { name: "Horror", nameMm: "ထိတ်လန့်စရာ" },
  { name: "Mystery", nameMm: "လျှို့ဝှက်ဆန်းကြယ်" },
  { name: "Romance", nameMm: "အချစ်" },
  { name: "Sci-Fi", nameMm: "သိပ္ပံစိတ်ကူးယဉ်" },
  { name: "Slice of Life", nameMm: "နေ့စဉ်ဘဝ" },
  { name: "Thriller", nameMm: "သြိလာ" },
  { name: "Historical", nameMm: "သမိုင်းဝင်" },
  { name: "Martial Arts", nameMm: "ကျန်းကျီ" },
  { name: "Harem", nameMm: "ဟာရင်" },
  { name: "Supernatural", nameMm: "သဘာဝလွန်" },
  { name: "Psychological", nameMm: "စိတ်ပိုင်းဆိုင်ရာ" },
  { name: "Tragedy", nameMm: "ဝမ်းနည်းစရာ" },
  { name: "Xuanhuan", nameMm: "ရှွမ်ဟွမ်" },
  { name: "Xianxia", nameMm: "ရှန်းရှ" },
  { name: "Wuxia", nameMm: "ဝူရှ" },
];

async function main() {
  console.log("Seeding genres...");

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { name: genre.name },
      update: { nameMm: genre.nameMm },
      create: genre,
    });
  }

  console.log(`Seeded ${genres.length} genres.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
