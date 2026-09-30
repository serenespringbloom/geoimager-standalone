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
