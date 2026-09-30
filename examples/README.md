# Example

`slope_sample.png` is a real slope photograph provided as a fixture so
reviewers can exercise the full pipeline through the web interface without
needing to source their own image.

## How to use

With the API and web servers running (see the [project README](../README.md)):

1. Open <http://localhost:3000>.
2. In **Step 1 — Upload Slope Image**, upload `examples/slope_sample.png`.
3. In **Step 2 — Rock References (CIELAB a\* b\*)**, set:
   - **Fresh / Unweathered** — a\* = `0`, b\* = `0`
   - **Weathered Reference** — a\* = `4`, b\* = `20`
4. In **Step 3 — Weathering Levels**, set:
   - **No. of levels** — `6`
   - **Normalisation thresholds** — T1=`0.17`, T2=`0.33`, T3=`0.50`,
     T4=`0.67`, T5=`0.83`
5. Click **Process Image**.

Expected result: the right-hand panel shows a false-colour classification of
the sample slope plus a per-grade histogram (W1..W6) whose percentages sum to
~100%.
