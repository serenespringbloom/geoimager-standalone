# Example / Quick-test

`quick_test.py` reads the bundled sample slope image (`slope_sample.png`),
submits it to the GeoImager API, prints the per-grade weathering distribution,
and writes the false-colour classification output to `output_sample.png`.

Files in this folder:
- `slope_sample.png` — a real slope photograph provided as a fixture.
- `quick_test.py`    — end-to-end smoke test (standard library only, no
  third-party Python packages required).
- `output_sample.png` — produced when the test runs (git-ignored).

## Run

```bash
# 1. Ensure the backend API is running (see project README):
cd api && npm install && npm run dev

# 2. In another shell, from the repository root:
python examples/quick_test.py
```

Expected: HTTP 200 response, per-grade percentages printed to stdout summing
to ~100%, and `examples/output_sample.png` written with a false-colour heatmap
overlaying the sample slope.

## Parameters used by the quick-test

The script sends the sample image with the following recommended defaults:

| Parameter                | Value                              |
|--------------------------|------------------------------------|
| Fresh reference (a\*, b\*) | (0, 0)                             |
| Weathered reference (a\*, b\*) | (4, 20)                        |
| Number of levels         | 6                                  |
| Normalisation thresholds | 0.17, 0.33, 0.50, 0.67, 0.83       |

To reproduce the same output from the web UI:

1. Upload `examples/slope_sample.png`.
2. Set **Fresh** a\*=0, b\*=0 and **Weathered** a\*=4, b\*=20.
3. Set the number of weathering levels to **6**.
4. Enter the thresholds T1..T5 as **0.17, 0.33, 0.50, 0.67, 0.83**.
5. Click **Process Image**.
