import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { registerGeoImagerRoutes } from "./routes/geoimager.js";
import { registerPresetRoutes } from "./routes/presets.js";

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "DELETE", "OPTIONS"] }));

app.get("/", (c) => c.json({ service: "geoimager-api", status: "ok" }));

registerGeoImagerRoutes(app);
registerPresetRoutes(app);

const port = Number(process.env.PORT ?? 8787);
console.log(`GeoImager API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
