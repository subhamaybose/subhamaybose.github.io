"""Measure contrast for text that sits over the hero PHOTOGRAPH.

The DOM contrast sweep cannot see this case: it resolves an element's ground
from computed background-color, and a portrait behind the text is an <img>, not
a background. On the phone covers the headline and name sit directly on the
photo, so their real ground is whatever pixels happen to be under them.

Sampling the element's whole bounding box does not work either - a box spans the
full column width and includes padding and any transparent fade zone, so the
"worst" pixel is usually somewhere no glyph is drawn. That produces a failure
number that will not move no matter what you fix.

Method: shoot the page twice, once with the text visible and once hidden. Pixels
that differ are where glyphs actually land. Ground luminance is then sampled
from the text-hidden shot at ONLY those pixels.

Usage:
  py -3 text_over_image_check.py <with_text.png> <ground.png> <geo.json> [dpr]
"""
import json
import sys

from PIL import Image


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum_rgb(r, g, b):
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(l1, l2):
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def check(with_path, ground_path, boxes, dpr=1.0, diff_thresh=28):
    a = Image.open(with_path).convert("RGB")
    b = Image.open(ground_path).convert("RGB")
    if a.size != b.size:
        sys.exit("ERROR: screenshots differ in size %s vs %s" % (a.size, b.size))

    rows = []
    for box in boxes:
        x0, y0 = max(0, int(box["x"] * dpr)), max(0, int(box["y"] * dpr))
        x1 = min(a.width, int((box["x"] + box["w"]) * dpr))
        y1 = min(a.height, int((box["y"] + box["h"]) * dpr))
        if x1 <= x0 or y1 <= y0:
            continue

        pa = list(a.crop((x0, y0, x1, y1)).getdata())
        pb = list(b.crop((x0, y0, x1, y1)).getdata())

        # A glyph pixel is one that changed when the text was hidden.
        ground = [pb[i] for i in range(len(pa))
                  if abs(pa[i][0] - pb[i][0]) + abs(pa[i][1] - pb[i][1])
                  + abs(pa[i][2] - pb[i][2]) > diff_thresh]
        if len(ground) < 12:
            rows.append({"label": box["label"], "skip": "no glyph pixels found"})
            continue

        tl = lum_rgb(*box["color"])
        lums = sorted(lum_rgb(*p) for p in ground)
        # Ignore the extreme 2% - those are antialiased glyph edges, which are a
        # blend of text and ground and are not a real background sample.
        lo_i, hi_i = int(len(lums) * 0.02), int(len(lums) * 0.98)
        trimmed = lums[lo_i:hi_i] or lums
        worst = min(trimmed, key=lambda g: ratio(tl, g))
        rows.append({
            "label": box["label"],
            "glyphPx": len(ground),
            "ratio": round(ratio(tl, worst), 2),
            "medianRatio": round(ratio(tl, trimmed[len(trimmed) // 2]), 2),
            "need": box.get("need", 4.5),
        })
    return rows


if __name__ == "__main__":
    withp, groundp, geo = sys.argv[1], sys.argv[2], sys.argv[3]
    dpr = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    bad = 0
    for r in check(withp, groundp, json.load(open(geo)), dpr):
        if "skip" in r:
            print("  %-30s (%s)" % (r["label"], r["skip"]))
            continue
        ok = r["ratio"] >= r["need"]
        bad += 0 if ok else 1
        print("  %-30s worst %5.2f:1  median %5.2f:1  need %.1f  %-8s [%d glyph px]"
              % (r["label"], r["ratio"], r["medianRatio"], r["need"],
                 "OK" if ok else "**FAIL**", r["glyphPx"]))
    sys.exit(1 if bad else 0)
