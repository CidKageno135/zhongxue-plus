import "dotenv/config";
import { seedIfEmpty } from "../src/db/seed";

async function main() {
  const seeded = await seedIfEmpty();
  if (seeded) {
    console.log("✓ Demo data seeded. Log in with demo@hanzi.app / demo1234");
  } else {
    console.log("Database already contains data — nothing to seed.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
