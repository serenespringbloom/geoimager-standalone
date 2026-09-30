import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? join(__dirname, "../../data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "cvedm.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cvedm_presets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    data            TEXT NOT NULL,
    created_by_name TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS cvedm_presets_type_idx ON cvedm_presets(type);
  CREATE INDEX IF NOT EXISTS cvedm_presets_created_at_idx ON cvedm_presets(created_at DESC);
`);
