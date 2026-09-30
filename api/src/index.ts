import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { registerCvedmRoutes } from "./routes/cvedm.js";
import { registerPresetRoutes } from "./routes/presets.js";

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "DELETE", "OPTIONS"] }));

app.get("/", (c) => c.json({ service: "cvedm-api", status: "ok" }));

registerCvedmRoutes(app);
registerPresetRoutes(app);

const port = Number(process.env.PORT ?? 8787);
console.log(`CVEDM API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
