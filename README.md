# CVEDM — CIELAB Vector Euclidean Distance Metrics

Colour-based rock weathering grade classifier. Given a slope photograph (with
the rock surface masked), CVEDM converts each pixel to CIELAB colour space,
measures its Euclidean ΔE distance from a user-supplied *fresh* reference
point, and classifies the pixel into one of N weathering grades
(W1 = freshest, WN = most weathered). Output is a false-colour image and a
per-grade population histogram.

This repository contains the source used to produce the results reported in
the accompanying publication.

## Repository layout

```
cvedm/
├── python-service/      Flask image-processing service — the core algorithm
│   ├── main.py          CIELAB conversion, ΔE classification, false-colour output
│   ├── requirements.txt
│   └── (a hosted deployment is used by default; see below)
├── api/                 Node.js/Hono API — proxy + preset storage (SQLite)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── db/          SQLite (better-sqlite3, auto-created on first run)
│   └── package.json
├── web/                 Next.js/React frontend
│   ├── src/app/methods/cvedm/
│   │   ├── page.tsx     Main UI
│   │   ├── color-scheme.ts
│   │   └── grade-bar-chart.tsx
│   └── package.json
├── examples/
│   ├── slope_sample.png Real slope photograph fixture
│   └── README.md        Step-by-step example run using the sample
├── LICENSE              MIT
└── README.md
```

## Prerequisites

- Node.js 20+

That is the entire prerequisite list. The image-processing algorithm runs on
a hosted service, so reviewers do not need to install Python dependencies,
Docker, or a database to try the app. The full Python source is still
included in `python-service/` for inspection and optional self-hosting (see
*Optional: self-host the algorithm* below).

## Quick start

```bash
git clone https://github.com/serenespringbloom/CIELAB_Vector_Euclidean_Distance_Metrics.git
cd CIELAB_Vector_Euclidean_Distance_Metrics

# Shell 1 — API (uses local SQLite, proxies image jobs to hosted algorithm)
cd api && npm install && npm run dev
# → listening on http://localhost:8787

# Shell 2 — Web UI
cd web && npm install && npm run dev
# → http://localhost:3000
```

Then open <http://localhost:3000>. The root path redirects to
`/methods/cvedm`.

## Example run

A real slope photograph is bundled at `examples/slope_sample.png` so reviewers
can exercise the full pipeline end-to-end through the web interface.

With both servers running (see *Quick start* above):

1. Open <http://localhost:3000>.
2. Upload `examples/slope_sample.png`.
3. Set **Fresh** reference a\*=0, b\*=0 and **Weathered** reference a\*=4, b\*=20.
4. Set **No. of levels** to 6.
5. Enter **Normalisation thresholds** T1..T5 as 0.17, 0.33, 0.50, 0.67, 0.83.
6. Click **Process Image**.

Expected result: the right-hand panel shows a false-colour weathering
classification of the sample slope plus a per-grade histogram (W1..W6) whose
percentages sum to ~100%.

Full step-by-step and expected output: see [`examples/README.md`](examples/README.md).

## Using the web interface

1. Open <http://localhost:3000>.
2. **Upload** a slope photograph. For best results, crop to the exposed rock
   surface only (polygon/freehand cropper is built in).
3. **Set the CIELAB reference points**:
   - *Fresh / Unweathered* — a\*/b\* of visibly fresh rock in the image.
   - *Weathered* — a\*/b\* of a maximally weathered patch.
4. **Choose weathering levels** (2–8) and normalisation thresholds (fractions
   of maximum ΔE at which grade boundaries fall).
5. Click **Process Image**. The right column shows the false-colour output and
   per-grade histogram.

Presets (reference points, threshold sets) can be saved and reloaded from each
configuration card. Presets are stored in a local SQLite file at
`api/data/cvedm.sqlite` (auto-created).

## API contract

### `POST /methods/cvedm`

Body (all fields required):

```json
{
  "image": "<base64 PNG or JPEG>",
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
  "image": "<base64 PNG of false-colour output>",
  "population": [pct_W1, pct_W2, ..., pct_WN]
}
```

### `GET/POST/DELETE /methods/cvedm-presets`

CRUD for saved presets. `type` is either `"reference"` (a\*b\* fresh/weathered
pairs) or `"threshold"` (level count + normalisation thresholds).

## Optional: self-host the algorithm

If the hosted service is unavailable or you want to run the algorithm locally:

```bash
cd python-service
pip install -r requirements.txt
python main.py                       # serves at http://localhost:8080

# Then in Shell 1, point the API at your local instance:
cd api
ALGORITHM_URL=http://localhost:8080 npm run dev
```

The Python service exposes `POST /process_image_v2` with the same body/response
shape documented above.

## Licence

MIT. See [`LICENSE`](LICENSE).

## Citation

If you use this software in academic work, please cite the accompanying paper.
