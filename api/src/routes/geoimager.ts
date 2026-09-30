import type { Hono } from "hono";

export function registerGeoImagerRoutes(app: Hono) {
  app.post("/methods/geoimager", async (c) => {
    const geoimagerUrl = process.env.GEOIMAGER_URL;
    if (!geoimagerUrl) {
      return c.json({ error: "GeoImager service not configured" }, 503);
    }

    const contentType = c.req.header("Content-Type") ?? "";
    if (!contentType.includes("application/json")) {
      return c.json({ error: "Content-Type must be application/json" }, 415);
    }

    const body = await c.req.text();

    const upstream = await fetch(`${geoimagerUrl}/process_image_v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return c.json({ error: `GeoImager error: ${text}` }, 502);
    }

    const result = await upstream.json();
    return c.json(result, 200);
  });
}
