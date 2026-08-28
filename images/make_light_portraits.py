"""Generate the light-theme portrait grades from the neutral cut-out.

The dark-theme grades (amber / bw / cool) assume a near-black ground: their
highlights run to 237-247, which is correct against black and wrong against
paper, where a 250-luminance highlight dissolves the figure's edge into the
background. These grades are built from the UNGRADED source so the two
treatments do not compound, and they compress the highlight end so the figure
stays readable as a dark mass on a light ground.

Run: py -3 make_light_portraits.py
"""
from PIL import Image
import numpy as np

SRC = "portrait-cut.png"

# (output, shadow, highlight, gamma, hi_ceiling)
# hi_ceiling caps the mapped highlight so nothing approaches the paper value.
GRADES = [
    ("portrait-cut-warmink.png", (0x22, 0x19, 0x0F), (0xD9, 0xA9, 0x61), 0.92, 0.84),
    ("portrait-cut-coolink.png", (0x0E, 0x1A, 0x22), (0xA8, 0xC4, 0xD4), 0.92, 0.80),
]


def duotone(src, shadow, highlight, gamma, ceiling):
    a = np.array(Image.open(src).convert("RGBA"))
    rgb = a[..., :3].astype(np.float64) / 255.0
    alpha = a[..., 3]

    lum = rgb @ [0.2126, 0.7152, 0.0722]

    # Normalise against the opaque pixels only - the transparent margin is
    # pure black and would otherwise anchor the low end and flatten the map.
    op = alpha > 128
    lo, hi = np.percentile(lum[op], 1), np.percentile(lum[op], 99)
    t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    t = t ** gamma
    t = t * ceiling  # keep the brightest tone clear of the paper

    sh = np.array(shadow, dtype=np.float64) / 255.0
    hl = np.array(highlight, dtype=np.float64) / 255.0
    out = sh + (hl - sh) * t[..., None]

    res = np.empty_like(a)
    res[..., :3] = np.clip(out * 255.0, 0, 255).astype(np.uint8)
    res[..., 3] = alpha
    return Image.fromarray(res, "RGBA")


for name, sh, hl, g, ceil in GRADES:
    im = duotone(SRC, sh, hl, g, ceil)
    im.save(name, optimize=True)

    arr = np.array(im)
    m = arr[..., 3] > 128
    l = arr[..., :3][m].astype(float) @ [0.2126, 0.7152, 0.0722]
    print("%-28s lum min/med/max = %3.0f/%3.0f/%3.0f" % (name, l.min(), np.median(l), l.max()))
