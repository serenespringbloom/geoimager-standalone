# GeoImager

Colour-based rock weathering grade classifier. Given a slope photograph (with
the rock surface masked), GeoImager converts each pixel to CIELAB colour space,
measures its ΔE distance from a user-supplied *fresh* reference point, and
classifies the pixel into one of N weathering grades (W1 = freshest, WN = most
weathered). Output is a false-colour image and a per-grade population histogram.

This repository contains the source used to produce the results reported in
the accompanying publication.

## Repository layout

```
geoimager-standalone/
├── python-service/      Flask image-processing service — the core algorithm
│   ├── main.py          CIELAB conversion, ΔE classification, false-colour output
│   ├── requirements.txt
│   └── (deployed at https://geoimager-926431461658.asia-southeast1.run.app)
├── api/                 Node.js/Hono API — proxy + preset storage (SQLite)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── db/          SQLite (better-sqlite3, auto-created on first run)
│   └── package.json
├── web/                 Next.js/React frontend
│   ├── src/app/methods/geoimager/
│   │   ├── page.tsx     Main UI
│   │   ├── color-scheme.ts
│   │   └── grade-bar-chart.tsx
│   └── package.json
├── examples/
│   ├── quick_test.py    End-to-end smoke test with a synthetic image
│   └── README.md
├── LICENSE              MIT
└── README.md
```

## Prerequisites

- Node.js 20+
- Python 3.9+ (only needed to run the quick-test; not needed to use the app)

That is the entire prerequisite list. The image-processing algorithm runs on
a hosted service at
<https://geoimager-926431461658.asia-southeast1.run.app>, so reviewers do not
need to install Python dependencies, Docker, or a database to try the app.
The full Python source is still included in `python-service/` for inspection
and self-hosting (see *Optional: self-host the algorithm* below).

## Quick start

```bash
git clone https://github.com/serenespringbloom/geoimager-standalone.git
cd geoimager-standalone

# Shell 1 — API (uses local SQLite, proxies image jobs to hosted algorithm)
cd api && npm install && npm run dev
# → listening on http://localhost:8787

# Shell 2 — Web UI
cd web && npm install && npm run dev
# → http://localhost:3000
```

Then open <http://localhost:3000>. The root path redirects to
`/methods/geoimager`.

## Running the quick-test

The quick-test reads the bundled sample slope photograph
(`examples/slope_sample.png`), submits it through the full pipeline, and
writes the false-colour classification output.

No third-party Python packages are required — the script uses only the
standard library.

```bash
# With the API running in Shell 1:
python examples/quick_test.py
```

Expected output:

```
Reading sample slope image: examples/slope_sample.png
POST http://localhost:8787/methods/geoimager

Grade population (%):
  W1:  xx.xx%
  W2:  xx.xx%
  W3:  xx.xx%
  W4:  xx.xx%
  W5:  xx.xx%

False-colour output written to: examples/output_sample.png

Quick-test PASSED.
```

Success criteria: (a) HTTP 200 response, (b) percentages sum to ~100%,
(c) `output_sample.png` is written and shows a false-colour heatmap
classifying the sample slope's weathering grades.

The quick-test uses the following recommended parameter defaults for the
bundled sample:

| Parameter                      | Value                          |
|--------------------------------|--------------------------------|
| Fresh reference (a\*, b\*)     | (0, 0)                         |
| Weathered reference (a\*, b\*) | (4, 20)                        |
| Levels                         | 6                              |
| Normalisation thresholds       | 0.17, 0.33, 0.50, 0.67, 0.83   |

Use the same values in the web UI to reproduce the quick-test output.

See [`examples/README.md`](examples/README.md) for details.

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
`api/data/geoimager.sqlite` (auto-created).

## API contract

### `POST /methods/geoimager`

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

### `GET/POST/DELETE /methods/geoimager-presets`

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
GEOIMAGER_URL=http://localhost:8080 npm run dev
```

The Python service exposes `POST /process_image_v2` with the same body/response
shape documented above.

## Licence

MIT. See [`LICENSE`](LICENSE).

## Citation

If you use this software in academic work, please cite the accompanying paper.
