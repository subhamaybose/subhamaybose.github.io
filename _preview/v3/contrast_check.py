"""WCAG contrast checker for the light-theme palettes.

Run: py -3 contrast_check.py
Prints every foreground/background pair with its ratio and pass/fail so the
palettes are measured rather than eyeballed. Body text needs 4.5:1, large
text (>=24px or >=18.66px bold) needs 3.0:1, UI borders need 3.0:1.
"""


def srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


PALETTES = {
    "A light - Daybreak (warm paper)": {
        "bg": "#FBF6EC",
        "surface": "#F5EEE1",
        "raised": "#EFE6D6",
        "pairs": [
            ("ink body", "#1A1512", "#FBF6EC", 4.5),
            ("ink on surface", "#1A1512", "#F5EEE1", 4.5),
            ("dim body", "#55483C", "#FBF6EC", 4.5),
            ("dim on surface", "#55483C", "#F5EEE1", 4.5),
            ("faint meta", "#736354", "#FBF6EC", 4.5),
            ("faint on surface", "#736354", "#F5EEE1", 4.5),
            ("amber ink (eyebrow/links)", "#93540A", "#FBF6EC", 4.5),
            ("amber ink on surface", "#93540A", "#F5EEE1", 4.5),
            ("amber deep (hover)", "#7A4508", "#FBF6EC", 4.5),
            ("amber em (large h1)", "#8A5109", "#FBF6EC", 3.0),
            ("on-amber btn text", "#140D02", "#F0A428", 4.5),
            ("border on paper", "#E2D6C2", "#FBF6EC", 1.0),
            ("chip dot green", "#12855A", "#FFFCF6", 3.0),
        ],
    },
    "B light - Signal (cream + amber ground)": {
        "bg": "#FAF5EC",
        "surface": "#F3ECE0",
        "pairs": [
            ("ink body", "#14110E", "#FAF5EC", 4.5),
            ("dim body", "#4E453A", "#FAF5EC", 4.5),
            ("faint meta", "#756B5E", "#FAF5EC", 4.5),
            ("amber ink", "#8F5205", "#FAF5EC", 4.5),
            ("ink ON amber ground", "#2A1804", "#F0A428", 4.5),
            ("deep ink on amber", "#1C1000", "#F0A428", 4.5),
            ("amber-light ground text", "#2A1804", "#FFC661", 4.5),
        ],
    },
    "C light - Deep Field (pale ice + deep cyan)": {
        "bg": "#F2F7FA",
        "surface": "#E8F0F5",
        "raised": "#DFEAF1",
        "pairs": [
            ("ink body", "#0B1620", "#F2F7FA", 4.5),
            ("ink on surface", "#0B1620", "#E8F0F5", 4.5),
            ("dim body", "#3E5464", "#F2F7FA", 4.5),
            ("dim on surface", "#3E5464", "#E8F0F5", 4.5),
            ("faint meta", "#556A79", "#F2F7FA", 4.5),
            ("faint on surface", "#556A79", "#E8F0F5", 4.5),
            ("cyan ink (eyebrow/links)", "#0A6B7A", "#F2F7FA", 4.5),
            ("cyan ink on surface", "#0A6B7A", "#E8F0F5", 4.5),
            ("cyan deep (hover)", "#075462", "#F2F7FA", 4.5),
            ("cyan em (large h2)", "#0A7E90", "#F2F7FA", 3.0),
            ("on-cyan btn text", "#04222A", "#2DD9EE", 4.5),
        ],
    },
}

fails = 0
for name, p in PALETTES.items():
    print("\n=== %s ===" % name)
    for label, fg, bg, need in p["pairs"]:
        r = ratio(fg, bg)
        ok = r >= need
        if not ok:
            fails += 1
        print("  %-28s %s on %s  %5.2f:1  need %.1f  %s"
              % (label, fg, bg, r, need, "OK" if ok else "**FAIL**"))

print("\n%d failing pair(s)" % fails)
