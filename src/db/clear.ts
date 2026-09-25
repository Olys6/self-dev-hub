import { db } from "./index";
import { items, projects } from "./schema";

async function main() {
  await db.delete(items);
  await db.delete(projects);
  console.log("Cleared all items and projects.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
