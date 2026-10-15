export async function register() {
 if (process.env.NEXT_RUNTIME==="nodejs") {
  const {seedIfEmpty}=await import("./db/seed");
  await seedIfEmpty();
 }
}
