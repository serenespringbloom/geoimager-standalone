import base64
import io
import math

import numpy as np
from flask import Flask, jsonify, make_response, request, Response
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)


def rgb_to_lab(rgb):
    rgb = np.array(rgb, dtype=np.float64) / 255.0
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92
    rgb = rgb * 100.0
    M = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = np.dot(M, rgb)
    white = np.array([95.047, 100.0, 108.883])
    xyz = xyz / white
    mask2 = xyz > 0.008856
    xyz[mask2] = np.cbrt(xyz[mask2])
    xyz[~mask2] = (7.787 * xyz[~mask2]) + (16 / 116)
    x, y, z = xyz
    l = (116 * y) - 16
    a = 500 * (x - y)
    b = 200 * (y - z)
    return np.array([l, a, b])


@app.get("/hi")
def hi():
    return "hi"


@app.route("/process_image_v2", methods=["POST", "OPTIONS"])
def process_image_v2():
    if request.method == "OPTIONS":
        return Response()

    try:
        body = request.get_json(force=True)

        img = Image.open(io.BytesIO(base64.b64decode(body["image"]))).convert("RGBA")
        pixel_values = np.array(img)
        pixel_values = pixel_values.copy()

        a_threshold = int(body["a_threshold"])
        b_threshold = int(body["b_threshold"])
        unweathered_a_threshold = int(body["unweathered_a_threshold"])
        unweathered_b_threshold = int(body["unweathered_b_threshold"])
        levels = int(body["levels"])
        normalization_levels = body["normalization_levels"]
        color_scheme_raw_value = list(body["color_scheme"])

        delta_e = math.sqrt(
            pow(a_threshold - unweathered_a_threshold, 2) +
            pow(b_threshold - unweathered_b_threshold, 2)
        )

        range_levels = [-1, -1, -1, -1, -1, -1, -1, -1]
        _population = [0, 0, 0, 0, 0, 0, 0, 0]
        for i in range(len(normalization_levels)):
            range_levels[i] = delta_e * normalization_levels[i]

        color_scheme_raw_value.reverse()

        total_pixels = 0
        for xCoordinate in range(pixel_values.shape[0]):
            for yCoordinate in range(pixel_values.shape[1]):
                pixel = pixel_values[xCoordinate][yCoordinate]
                if pixel[3] > 0:
                    total_pixels += 1
                    lab = rgb_to_lab([pixel[0], pixel[1], pixel[2]])
                    compounded_ab = math.sqrt(
                        pow(lab[1] - unweathered_a_threshold, 2) +
                        pow(lab[2] - unweathered_b_threshold, 2)
                    )
                    list_offset = len(color_scheme_raw_value) - levels - 1
                    if compounded_ab < 0:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + levels]
                        _population[levels] += 1
                    elif compounded_ab > range_levels[0]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 0]
                        _population[0] += 1
                    elif compounded_ab > range_levels[1]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 1]
                        _population[1] += 1
                    elif compounded_ab > range_levels[2]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 2]
                        _population[2] += 1
                    elif compounded_ab > range_levels[3]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 3]
                        _population[3] += 1
                    elif compounded_ab > range_levels[4]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 4]
                        _population[4] += 1
                    elif compounded_ab > range_levels[5]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 5]
                        _population[5] += 1
                    elif compounded_ab > range_levels[6]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 6]
                        _population[6] += 1
                    elif compounded_ab > range_levels[7]:
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[list_offset + 7]
                        _population[7] += 1
                    else:
                        _population[0] += 1
                        pixel_values[xCoordinate][yCoordinate] = color_scheme_raw_value[levels - 1]
                else:
                    pixel_values[xCoordinate][yCoordinate] = [0, 0, 0, 0]

        for i, p in enumerate(_population):
            _population[i] = (p / total_pixels) * 100

        im = Image.fromarray(pixel_values.astype(np.uint8), "RGBA")
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        image_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        _population[0:levels] = _population[0:levels][::-1]

        return make_response(jsonify(image=image_b64, population=_population))

    except Exception as exc:
        return make_response(jsonify(error=str(exc)), 500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
