"""
Quick-test for GeoImager.

Reads the sample slope image (`slope_sample.png`), sends it to the API for
CIELAB delta-E weathering-grade classification, prints the per-grade
population, and saves the false-colour output alongside the input.

Usage:
    python examples/quick_test.py

Prerequisites:
    - Backend API running at http://localhost:8787 (see project README).
    - Python 3.9+ (no third-party packages required; only the standard library
      is used).

Expected output:
    - Prints per-grade percentages (W1..WN).
    - Writes examples/output_sample.png with the false-colour heatmap.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

API_URL = "http://localhost:8787/methods/geoimager"
HERE = os.path.dirname(os.path.abspath(__file__))
INPUT_PATH = os.path.join(HERE, "slope_sample.png")
OUTPUT_PATH = os.path.join(HERE, "output_sample.png")

# Default colour scheme from the frontend (RGBA rows, W1 freshest .. W6 most weathered).
DEFAULT_COLOR_SCHEME = [
    [0, 0, 0, 255],
    [0, 0, 0, 255],
    [0, 0, 255, 255],
    [0, 204, 0, 255],
    [255, 255, 0, 255],
    [255, 140, 0, 255],
    [255, 0, 0, 255],
    [0, 0, 0, 255],
]


def main() -> int:
    if not os.path.exists(INPUT_PATH):
        print(f"ERROR: sample image not found at {INPUT_PATH}", file=sys.stderr)
        return 1

    print(f"Reading sample slope image: {INPUT_PATH}")
    with open(INPUT_PATH, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")

    # Reference points and thresholds matching the recommended defaults for
    # the bundled slope sample. Fresh reference: a*=0, b*=0. Weathered
    # reference: a*=4, b*=20. Six weathering levels with equally spaced
    # normalisation thresholds (0.17, 0.33, 0.50, 0.67, 0.83).
    payload = {
        "image": b64,
        "unweathered_a_threshold": 0,
        "unweathered_b_threshold": 0,
        "unweathered_l_threshold": 0,
        "a_threshold": 4,
        "b_threshold": 20,
        "l_threshold": 0,
        "levels": 6,
        "normalization_levels": [0.83, 0.67, 0.5, 0.33, 0.17],
        "color_scheme": DEFAULT_COLOR_SCHEME,
        "ignored_range": [],
        "ignored_color": [0, 0, 0, 0],
    }

    print(f"POST {API_URL}")
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read())
    except urllib.error.HTTPError as err:
        print(f"ERROR: HTTP {err.code}: {err.read().decode('utf-8', 'replace')}", file=sys.stderr)
        return 1
    except urllib.error.URLError as err:
        print(f"ERROR: could not reach {API_URL}: {err}", file=sys.stderr)
        print("Is the backend running? See README for setup.", file=sys.stderr)
        return 1

    population = body.get("population", [])
    print("\nGrade population (%):")
    for i, pct in enumerate(population, start=1):
        print(f"  W{i}: {pct:6.2f}%")

    out_b64 = body.get("image", "")
    if not out_b64:
        print("\nERROR: no image returned in response.", file=sys.stderr)
        return 2

    with open(OUTPUT_PATH, "wb") as f:
        f.write(base64.b64decode(out_b64))
    print(f"\nFalse-colour output written to: {OUTPUT_PATH}")

    print("\nQuick-test PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
