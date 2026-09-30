import type { Hono } from "hono";

const DEFAULT_ALGORITHM_URL = "https://geoimager-926431461658.asia-southeast1.run.app";

export function registerCvedmRoutes(app: Hono) {
  app.post("/methods/cvedm", async (c) => {
    const algorithmUrl = process.env.ALGORITHM_URL ?? DEFAULT_ALGORITHM_URL;

    const contentType = c.req.header("Content-Type") ?? "";
    if (!contentType.includes("application/json")) {
      return c.json({ error: "Content-Type must be application/json" }, 415);
    }

    const body = await c.req.text();

    const upstream = await fetch(`${algorithmUrl}/process_image_v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return c.json({ error: `CVEDM algorithm error: ${text}` }, 502);
    }

    const result = await upstream.json();
    return c.json(result, 200);
  });
}
