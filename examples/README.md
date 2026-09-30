# Example / Quick-test

`quick_test.py` generates a synthetic slope image (a horizontal colour gradient
from fresh green-grey to weathered orange-red), submits it to the GeoImager
API, prints the per-grade weathering distribution, and writes the false-colour
classification output to `output_synthetic.png`.

The synthetic image is generated in-process — no real field photograph is
required, so the test is reproducible and does not require any bundled binary
sample data.

## Run

```bash
# 1. Ensure the backend stack is running (see project README):
docker compose up --build

# 2. In another shell:
pip install pillow                # only Pillow needed; requests is not used
python examples/quick_test.py
```

Expected: percentages sum to ~100 across W1..W6, and
`examples/output_synthetic.png` shows a false-colour band transitioning from
W1 (fresh) on the left to W6 (most weathered) on the right.
