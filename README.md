# GeoImager

Colour-based rock weathering grade classifier. Given a slope photograph (with
the rock surface masked), GeoImager converts each pixel to CIELAB colour space,
measures its ΔE distance from a user-supplied *fresh* reference point, and
classifies the pixel into one of N weathering grades (W1 = freshest, WN = most
weathered). The output is a false-colour image and a per-grade population
histogram.

The pipeline follows the CIELAB ΔE approach described in the accompanying
publication. This repository contains the exact source used to produce the
figures and results reported in that paper.

## Repository layout

```
geoimager-standalone/
├── python-service/      Flask image-processing service (the core algorithm)
│   ├── main.py          CIELAB conversion, ΔE classification, false-colour output
│   ├── requirements.txt
│   └── Dockerfile
├── api/                 Node.js/Hono API layer (proxy + preset storage)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/      REST endpoints
│   │   └── db/          Postgres schema + migration runner
│   ├── package.json
│   └── Dockerfile
├── web/                 Next.js/React frontend
│   ├── src/app/methods/geoimager/
│   │   ├── page.tsx     Main UI (upload, reference picker, level config)
│   │   ├── color-scheme.ts
│   │   └── grade-bar-chart.tsx
│   ├── package.json
│   └── Dockerfile
├── examples/            Quick-test that exercises the full pipeline
│   ├── quick_test.py
│   └── README.md
├── docker-compose.yml   Brings up Postgres + all three services
├── .env.example
├── LICENSE              MIT
└── README.md
```

## Architecture

```
  Browser                Node API                 Python service
  ────────── HTTPS ──── (Hono, port 8787) ─── (Flask, port 8080)
     ▲                        │
     │                        ▼
     │                   Postgres 16
     │                (presets storage)
     └── Next.js dev server, port 3000
```

- **`python-service/`** contains the algorithm: RGB→CIELAB conversion, ΔE
  computation against fresh/weathered reference points, threshold-based
  classification, and false-colour rendering.
- **`api/`** is a thin proxy that (a) forwards image-processing requests to the
  Python service and (b) provides CRUD for saved reference/threshold *presets*,
  which are stored in Postgres.
- **`web/`** is the operator UI: image upload, polygon/freehand cropping to
  isolate the rock surface, reference colour picker (a\*/b\* inputs with a
  CIELAB gamut preview), level count and threshold configuration, and the
  false-colour result + grade histogram display.

## Prerequisites

- Docker & Docker Compose (recommended path), **or**
- Python 3.12+, Node.js 20+, and a Postgres 16 instance (manual path).

## Quick start (Docker)

```bash
git clone <this-repo-url>
cd geoimager-standalone
docker compose up --build
```

Then open <http://localhost:3000> — the root path redirects to
`/methods/geoimager`.

The first startup builds three containers and applies the Postgres migration.
Subsequent runs are ~10 seconds.

## Quick start (manual, without Docker)

```bash
# 1. Postgres — any local instance is fine; create a DB called 'geoimager'.

# 2. Python service
cd python-service
pip install -r requirements.txt
PORT=8080 python main.py            # serves at http://localhost:8080

# 3. API (in a new shell)
cd api
npm install
DATABASE_URL=postgres://<user>:<pw>@localhost:5432/geoimager \
  GEOIMAGER_URL=http://localhost:8080 \
  npm run migrate
DATABASE_URL=... GEOIMAGER_URL=http://localhost:8080 npm run dev

# 4. Web (in a new shell)
cd web
npm install
npm run dev                          # serves at http://localhost:3000
```

Copy `.env.example` to `.env` and edit as needed if you prefer environment files.

## Running the quick-test

The quick-test generates a synthetic slope image (a colour gradient from
fresh to weathered), sends it through the pipeline, and verifies output.

```bash
pip install pillow
python examples/quick_test.py
```

Expected output:

```
Generating synthetic slope image ...
POST http://localhost:8787/methods/geoimager

Grade population (%):
  W1:   ~20%
  W2:   ~20%
  W3:   ~20%
  W4:   ~20%
  W5:   ~20%

False-colour output written to: examples/output_synthetic.png

Quick-test PASSED.
```

Actual percentages depend on the exact gradient boundaries and the chosen
levels/thresholds; the important checks are (a) the request returns HTTP 200,
(b) all six W-grades appear in the output, and (c) the false-colour image
shows a clean left-to-right progression from W1 to W6 colours.

See `examples/README.md` for details.

## Using the web interface

1. Open <http://localhost:3000>.
2. **Upload** a slope photograph. For best results, first crop the image to
   the exposed rock surface only (a polygon/freehand cropper is built in).
3. **Set the CIELAB reference points**:
   - *Fresh / Unweathered* — the a\*/b\* of visibly fresh rock in the image.
   - *Weathered* — the a\*/b\* of a maximally weathered patch.
4. **Choose the number of weathering levels** (2–8) and the normalisation
   thresholds (fractions of the maximum ΔE at which each grade boundary
   falls).
5. Click **Process Image**. The right column shows the false-colour output and
   the per-grade histogram.

Presets (reference points and threshold sets) can be saved and reloaded via
the *Save as Preset* / *Presets* buttons on each configuration card.

## API contract

### POST `/methods/geoimager`

Body (all fields required):

```json
{
  "image": "<base64-encoded PNG or JPEG>",
  "unweathered_a_threshold": 0.0,
  "unweathered_b_threshold": 0.0,
  "unweathered_l_threshold": 0.0,
  "a_threshold": 20.0,
  "b_threshold": 20.0,
  "l_threshold": 0.0,
  "levels": 5,
  "normalization_levels": [0.8, 0.6, 0.4, 0.2],
  "color_scheme": [[0,0,0,255], ...],
  "ignored_range": [],
  "ignored_color": [0, 0, 0, 0]
}
```

Response:

```json
{
  "image": "<base64 PNG of the false-colour output>",
  "population": [pct_W1, pct_W2, ..., pct_WN]
}
```

### `GET/POST/DELETE /methods/geoimager-presets`

CRUD for saved presets. `type` is either `"reference"` (a\*b\* fresh/weathered
pairs) or `"threshold"` (level count + normalisation thresholds).

## Licence

MIT. See [`LICENSE`](LICENSE).

## Citation

If you use this software in academic work, please cite the accompanying paper.
