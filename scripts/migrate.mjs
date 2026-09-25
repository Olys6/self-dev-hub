// Deliberately avoids drizzle-orm/drizzle-kit: Next's standalone output only
// keeps node_modules entries for packages it can't bundle (native addons
// like better-sqlite3); pure-JS deps like drizzle-orm get inlined into the
// server bundle instead and aren't resolvable from a plain standalone script.
// So this applies the generated SQL migrations directly.
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "hub.db"));
sqlite.pragma("journal_mode = WAL");

sqlite.exec(
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (current_timestamp))"
);
const applied = new Set(sqlite.prepare("SELECT name FROM _migrations").all().map((r) => r.name));

const dir = path.join(process.cwd(), "drizzle");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f)) // drizzle-kit's naming convention only
  .sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs
    .readFileSync(path.join(dir, file), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "--> statement-breakpoint")
    .join("\n");
  const run = sqlite.transaction(() => {
    sqlite.exec(sql);
    sqlite.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
  });
  run();
  console.log(`Applied ${file}`);
}

console.log("Migrations up to date.");
sqlite.close();
