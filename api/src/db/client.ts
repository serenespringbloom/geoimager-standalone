import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://geoimager:geoimager@localhost:5432/geoimager",
});
