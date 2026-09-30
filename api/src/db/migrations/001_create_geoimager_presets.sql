CREATE TABLE IF NOT EXISTS geoimager_presets (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  data            JSONB NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geoimager_presets_type_idx ON geoimager_presets (type);
CREATE INDEX IF NOT EXISTS geoimager_presets_created_at_idx ON geoimager_presets (created_at DESC);
