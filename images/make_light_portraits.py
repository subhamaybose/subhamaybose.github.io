"""Generate the light-theme portrait grades from the neutral cut-out.

Two different jobs, deliberately:

  A  now ships UNTINTED in both themes (client decision, 2026-09-12): the
     amber duotone was dropped for the real photograph. The warm duotone is
     kept below because Design A's earlier cut still references it and B/C
     must not move - but A itself uses portrait-cut-paper.

  A-paper is a NEUTRAL grade, not a duotone. It is only a tone curve: the
     untinted photograph runs to 255 at the highlights, which against
     #FBF6EC paper dissolves the figure's edge into the background. This
     compresses the highlight end and leaves hue alone.

  C  is a GRADE OF THE PHOTOGRAPH, not a duotone. C's dark portrait is a cool
     grade of the real image, so skin still reads as skin. A duotone here mapped
     every pixel onto a blue ramp and turned the subject blue. This keeps real
     colour, desaturates modestly, and puts the cool cast in the SHADOWS only.

Both compress the highlight end: the dark grades run to 237-247, which is right
against black and wrong against paper, where a near-white highlight dissolves
the figure's edge into the background.

Run: py -3 make_light_portraits.py
"""
import numpy as np
from PIL import Image

SRC = "portrait-cut.png"
LUMA = [0.2126, 0.7152, 0.0722]


def load():
    a = np.array(Image.open(SRC).convert("RGBA"))
    return a[..., :3].astype(np.float64) / 255.0, a[..., 3]


def save(rgb, alpha, name):
    out = np.empty(rgb.shape[:2] + (4,), dtype=np.uint8)
    out[..., :3] = np.clip(rgb * 255.0, 0, 255).astype(np.uint8)
    out[..., 3] = alpha
    im = Image.fromarray(out, "RGBA")
    im.save(name + ".png", optimize=True)
    im.save(name + ".avif", quality=62)

    m = alpha > 128
    px = np.array(im)[..., :3][m].astype(float)
    lum = px @ LUMA
    print("%-28s lum %3.0f/%3.0f/%3.0f  meanRGB=(%3.0f,%3.0f,%3.0f)  b-r=%+3.0f"
          % (name, lum.min(), np.median(lum), lum.max(),
             px[:, 0].mean(), px[:, 1].mean(), px[:, 2].mean(),
             px[:, 2].mean() - px[:, 0].mean()))


def normalise(lum, alpha):
    """Stretch against the OPAQUE pixels only - the transparent margin is pure
    black and would otherwise anchor the low end and flatten the map."""
    op = alpha > 128
    lo, hi = np.percentile(lum[op], 1), np.percentile(lum[op], 99)
    return np.clip((lum - lo) / max(hi - lo, 1e-6), 0.0, 1.0)


# ---------------------------------------------------------------- Design A
def warm_duotone(rgb, alpha, shadow, highlight, gamma=0.92, ceiling=0.84):
    t = normalise(rgb @ LUMA, alpha) ** gamma * ceiling
    sh = np.array(shadow, dtype=np.float64) / 255.0
    hl = np.array(highlight, dtype=np.float64) / 255.0
    return sh + (hl - sh) * t[..., None]


# ---------------------------------------------------------------- Design C
def cool_photo_grade(rgb, alpha, desat=0.38, ceiling=0.74, shadow_tint=(-0.010, 0.004, 0.030)):
    """Keep the photograph. Desaturate modestly, compress the highlights, and
    push the cool cast into the shadows so mid-tone skin stays skin-coloured."""
    lum = rgb @ LUMA
    t = normalise(lum, alpha)

    # Rebuild around the normalised luminance so the tone curve applies evenly,
    # keeping each pixel's colour offset from its own luminance.
    offset = rgb - lum[..., None]
    graded = t[..., None] * ceiling + offset * (1.0 - desat)

    # Split tone: full tint in the darkest values, none in the highlights.
    weight = (1.0 - t)[..., None] ** 1.5
    graded = graded + np.array(shadow_tint) * weight

    return np.clip(graded, 0.0, 1.0)


# ------------------------------------------------ Design A, light, untinted
def neutral_paper_grade(rgb, alpha, ceiling=0.80, desat=0.10):
    """No hue shift at all - only a tone curve. The dark cut runs its
    highlights to 255; on paper that is brighter than the ground, so the
    shoulder and the shirt lose their edge. Compressing to `ceiling` keeps
    the figure sitting ON the paper rather than bleeding into it."""
    lum = rgb @ LUMA
    t = normalise(lum, alpha)
    offset = rgb - lum[..., None]
    return np.clip(t[..., None] * ceiling + offset * (1.0 - desat), 0.0, 1.0)


rgb, alpha = load()
save(warm_duotone(rgb, alpha, (0x22, 0x19, 0x0F), (0xD9, 0xA9, 0x61)), alpha, "portrait-cut-warmink")
save(cool_photo_grade(rgb, alpha), alpha, "portrait-cut-coolink")
save(neutral_paper_grade(rgb, alpha), alpha, "portrait-cut-paper")
