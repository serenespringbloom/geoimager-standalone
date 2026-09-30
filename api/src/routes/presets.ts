import type { Hono } from "hono";
import { pool } from "../db/client.js";

export function registerPresetRoutes(app: Hono) {
  app.get("/methods/geoimager-presets", async (c) => {
    try {
      const type = c.req.query("type");
      const params: string[] = [];
      let where = "";
      if (type) {
        where = "WHERE type = $1";
        params.push(type);
      }
      const { rows } = await pool.query(
        `SELECT id, name, type, data, created_by_name, created_at
         FROM geoimager_presets ${where}
         ORDER BY created_at DESC`,
        params,
      );
      return c.json(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          data: r.data,
          createdByName: r.created_by_name,
          createdAt: r.created_at,
        })),
        200,
      );
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
      const { rows } = await pool.query(
        `INSERT INTO geoimager_presets (name, type, data, created_by_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, type, data, created_by_name, created_at`,
        [body.name, body.type, JSON.stringify(body.data), body.createdByName ?? ""],
      );
      const r = rows[0];
      return c.json({
        id: r.id,
        name: r.name,
        type: r.type,
        data: r.data,
        createdByName: r.created_by_name,
        createdAt: r.created_at,
      }, 201);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  app.delete("/methods/geoimager-presets/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      await pool.query("DELETE FROM geoimager_presets WHERE id = $1", [id]);
      return c.json({ ok: true }, 200);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  });
}
