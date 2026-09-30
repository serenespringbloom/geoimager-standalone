import type { Hono } from "hono";
import { db } from "../db/client.js";

interface PresetRow {
  id: number;
  name: string;
  type: string;
  data: string;
  created_by_name: string;
  created_at: string;
}

function toResponse(r: PresetRow) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    data: JSON.parse(r.data),
    createdByName: r.created_by_name,
    createdAt: r.created_at,
  };
}

export function registerPresetRoutes(app: Hono) {
  app.get("/methods/geoimager-presets", (c) => {
    try {
      const type = c.req.query("type");
      const stmt = type
        ? db.prepare("SELECT * FROM geoimager_presets WHERE type = ? ORDER BY created_at DESC")
        : db.prepare("SELECT * FROM geoimager_presets ORDER BY created_at DESC");
      const rows = (type ? stmt.all(type) : stmt.all()) as PresetRow[];
      return c.json(rows.map(toResponse), 200);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  app.post("/methods/geoimager-presets", async (c) => {
    try {
      const body = await c.req.json() as {
        name: string;
        type: string;
        data: unknown;
        createdByName?: string;
      };
      if (!body.name || !body.type || body.data == null) {
        return c.json({ error: "name, type and data are required" }, 400);
      }
      const info = db
        .prepare(
          "INSERT INTO geoimager_presets (name, type, data, created_by_name) VALUES (?, ?, ?, ?)",
        )
        .run(body.name, body.type, JSON.stringify(body.data), body.createdByName ?? "");
      const row = db
        .prepare("SELECT * FROM geoimager_presets WHERE id = ?")
        .get(info.lastInsertRowid) as PresetRow;
      return c.json(toResponse(row), 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  app.delete("/methods/geoimager-presets/:id", (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      db.prepare("DELETE FROM geoimager_presets WHERE id = ?").run(id);
      return c.json({ ok: true }, 200);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });
}
