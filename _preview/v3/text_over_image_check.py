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

IMPORTANT when producing the two shots: kill CSS transitions BEFORE hiding the
text, e.g. inject `*{transition:none!important}` and set color to transparent
with !important. A control with a colour transition (buttons usually have one)
otherwise leaves the ground shot holding HALF-FADED TEXT, which then gets
sampled as if it were background - it reported a 2.67:1 failure on a CTA that
was actually sitting at 9:1.

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
        idx = [i for i in range(len(pa))
               if abs(pa[i][0] - pb[i][0]) + abs(pa[i][1] - pb[i][1])
               + abs(pa[i][2] - pb[i][2]) > diff_thresh]
        if len(idx) < 12:
            rows.append({"label": box["label"], "skip": "no glyph pixels found"})
            continue
        ground = [pb[i] for i in idx]

        # Use the RENDERED text colour, not the declared one. A translucent layer
        # painted OVER the text (a scrim at the wrong z-index, an overlay, a
        # parent opacity) leaves the declared colour untouched while the visible
        # contrast collapses - measuring box["color"] reports a pass that the eye
        # plainly fails. The glyph core is where the WITH pixel differs most from
        # the ground; its median is what a reader actually sees.
        diffs = sorted(idx, key=lambda i: -(abs(pa[i][0] - pb[i][0])
                                            + abs(pa[i][1] - pb[i][1])
                                            + abs(pa[i][2] - pb[i][2])))
        core = [pa[i] for i in diffs[:max(8, len(diffs) // 3)]]
        core.sort(key=lambda p: lum_rgb(*p))
        rendered = core[len(core) // 2]
        tl = lum_rgb(*rendered)

        declared = lum_rgb(*box["color"])
        drift = abs(declared - tl)

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
            # Large drift means what renders is not the colour the CSS asked for.
            "dimmed": drift > 0.02,
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
        print("  %-30s worst %5.2f:1  median %5.2f:1  need %.1f  %-8s [%d glyph px]%s"
              % (r["label"], r["ratio"], r["medianRatio"], r["need"],
                 "OK" if ok else "**FAIL**", r["glyphPx"],
                 "  <- RENDERS DIMMER THAN DECLARED" if r.get("dimmed") else ""))
    sys.exit(1 if bad else 0)
