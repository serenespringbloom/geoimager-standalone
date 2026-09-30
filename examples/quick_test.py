"""
Quick-test for GeoImager.

Generates a synthetic slope image (horizontal gradient from fresh green-grey to
weathered orange-red), sends it to the API, saves the false-colour classification
output, and prints the grade population.

Usage:
    python examples/quick_test.py

Prerequisites:
    - Backend running at http://localhost:8787 (see README).
    - Python 3.9+ with `requests` and `Pillow` installed:
        pip install requests pillow

Expected output:
    - Prints per-grade percentages (W1..W6).
    - Writes examples/output_synthetic.png with the false-colour heatmap.
"""
import base64
import io
import json
import sys
import urllib.request

from PIL import Image, ImageDraw

API_URL = "http://localhost:8787/methods/geoimager"
OUTPUT_PATH = "examples/output_synthetic.png"

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


def make_synthetic_slope(width: int = 512, height: int = 256) -> bytes:
    """Horizontal gradient: greyish-green (fresh) -> orange-red (weathered)."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for x in range(width):
        t = x / (width - 1)
        r = int(90 + (200 - 90) * t)
        g = int(110 + (90 - 110) * t)
        b = int(85 + (60 - 85) * t)
        draw.line([(x, 0), (x, height)], fill=(r, g, b))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def main() -> int:
    print("Generating synthetic slope image ...")
    png_bytes = make_synthetic_slope()
    b64 = base64.b64encode(png_bytes).decode("ascii")

    payload = {
        "image": b64,
        "unweathered_a_threshold": 0,
        "unweathered_b_threshold": 0,
        "unweathered_l_threshold": 0,
        "a_threshold": 20,
        "b_threshold": 20,
        "l_threshold": 0,
        "levels": 5,
        "normalization_levels": [0.8, 0.6, 0.4, 0.2],
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read())
    except urllib.error.URLError as err:
        print(f"ERROR: could not reach {API_URL}: {err}", file=sys.stderr)
        print("Is the backend running? See README for setup.", file=sys.stderr)
        return 1
    except urllib.error.HTTPError as err:
        print(f"ERROR: HTTP {err.code}: {err.read().decode('utf-8', 'replace')}", file=sys.stderr)
        return 1

    population = body.get("population", [])
    print("\nGrade population (%):")
    for i, pct in enumerate(population, start=1):
        print(f"  W{i}: {pct:6.2f}%")

    out_b64 = body.get("image", "")
    if out_b64:
        with open(OUTPUT_PATH, "wb") as f:
            f.write(base64.b64decode(out_b64))
        print(f"\nFalse-colour output written to: {OUTPUT_PATH}")
    else:
        print("\nWARNING: no image returned in response.", file=sys.stderr)
        return 2

    print("\nQuick-test PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
