# RESUME_HERE — Subhamay Bose portfolio

**State last changed: 2026-09-12.** Read this file and you have full context. Do not
reconstruct state from conversation history.

---

## 0 · Where things stand

The client reviewed three finished design directions and **chose A — "Nightshift"**.
B and C are **frozen, not deleted**: they stay exactly as they are, and no change to A
may touch them. A is the only line of work from here.

| | |
|---|---|
| Chosen design | **A — Nightshift** |
| Source of truth | `_preview/v3/a.html` + `_preview/v3/css/a.css` + `_preview/v3/js/a.js` |
| Working branch | `revamp` |
| Published preview | `preview/a.html` on `origin/main` → https://subhamaybose.github.io/preview/a.html |
| Local preview | `py -3 -m http.server 4173` then `/_preview/v3/a.html` |

**The publish step flattens `_preview/v3/` → `preview/`, so the only difference between
the source and the published copy is path depth (`../../` → `../`).** CSS and JS are
byte-identical. Verify with a `--strip-trailing-cr` diff before assuming otherwise.

### Deployment split, agreed 2026-09-12

- **Ours:** everything in the repo — markup, CSS, JS, assets, and the head/SEO work
  (title, description, canonical, OG/Twitter, favicon, `sitemap.xml`, `robots.txt`).
- **The client's:** taking the repo to **subhamaybose.com** — DNS, the `CNAME` file,
  GitHub Pages settings, Enforce HTTPS. Do not do this for him.

---

## 1 · Hard constraints

- **`_preview/v3/js/theme.js` is shared by A, B and C.** It is currently untouched and
  must stay that way. If A ever needs a theme-behaviour change, **fork it to an A-only
  copy** — never edit the shared file.
- **`css/a.css`, `js/a.js` and `a.html` are A-only.** Safe to edit.
- After any change, prove B and C are untouched:
  `git diff --quiet HEAD -- _preview/v3/b.html _preview/v3/c.html _preview/v3/css/b.css _preview/v3/css/c.css _preview/v3/js/b.js _preview/v3/js/c.js _preview/v3/js/theme.js`
- **Light and dark both ship.** Every change is checked in both. The light theme is a
  re-decision, not an inversion, and it has a measured contrast audit behind it.
- **A has two separate heroes**, not one responsive hero: `#mhero` (`.m-only`, <45rem)
  and `#hero` (`.d-only`, ≥45rem). A hero change must be made in **both** or it lands
  on one tier only.

---

## 2 · Verification scripts — use these, do not write new ones

Both live in `_preview/v3/` and are the project's own gates.

```bash
py -3 _preview/v3/contrast_check.py          # light palettes, all three designs
py -3 -W ignore _preview/v3/text_over_image_check.py <with_text.png> <ground.png> <geo.json> <dpr>
```

`text_over_image_check.py` is the one that matters for the phone hero, where copy sits
directly on the photograph. Its geo JSON needs `{label,x,y,w,h,color:[r,g,b],need}` per
box. Read its docstring before using it — it explains why a bounding-box sample and a
median-core sample both give wrong answers.

`images/make_light_portraits.py` generates every portrait grade from `portrait-cut.png`.
It is deterministic: re-running it leaves B's and C's assets byte-identical.

---

## 3 · Traps that have already cost time

- **A backgrounded browser tab freezes `requestAnimationFrame`, and therefore GSAP's
  ticker.** Tweens queue and never complete, so the UI looks permanently stuck. This
  produced a false "the audience pills are broken" finding. Fix in-harness with
  `cdp("Page.setWebLifecycleState", state="active")` and assert `document.visibilityState`
  before trusting any interaction result.
- **The theme is stored in `localStorage` under `sb-theme` and survives reloads.** A loop
  that reloads and then toggles will silently label its runs the wrong way round — it
  reported a light-theme failure as a dark-theme one. Set the key explicitly per run and
  assert `data-theme` after load.
- **`_preview/v3/*` is committed LF but checks out CRLF** (`core.autocrlf=true`). Write
  files with `write_bytes`, never `write_text`. One stray lone `\r` made git classify
  `a.css` as binary and diff the whole 714-line file. Check `git diff --stat` before
  committing: a whole-file diff for a small edit means line endings moved.
- **`Emulation.setDeviceMetricsOverride(mobile=True)` does NOT give you `pointer: coarse`.**
  Touch emulation is separate and is reset by `new_tab`, so every
  `@media (pointer: coarse)` rule silently sits inactive and your measurements
  describe a layout no phone ever renders. It reported a tap-target fix as having
  no effect when the rule was simply not matching. Always
  `cdp("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)` and
  assert `matchMedia('(pointer: coarse)').matches` before believing a mobile number.
- **`python` on this machine is the Hermes venv and has no numpy — use `py -3`.**
- **Never run a static server with its cwd inside a directory you will delete**; it locks
  the folder on Windows and `git worktree remove` fails with "Permission denied".

---

## 4 · Open items

1. **Head / SEO batch (ours, not started).** A still carries
   `<meta name="robots" content="noindex">` — correct for a preview, **must come off at
   promotion**. A has no description, canonical, OG or Twitter tags. `sitemap.xml` and
   `robots.txt` still point at `subhamaybose.github.io`. The favicon is linked.
2. **The hidden `#projects` section needs real content.** How to publish it is documented
   in the HTML comment directly above the section.
3. **Retiring B and C is a separate job**, not yet done or scoped.
4. **Promoting A to `/`** — the repo holds two dead homepage candidates once that happens:
   the legacy site live on `main`, and an unpublished "Technical Swiss" rebuild on
   `revamp`. Deleting either is the client's call.
5. **Five desktop nav links are 22px tall**, 2px under the WCAG 2.2 SC 2.5.8
   minimum. Pre-existing and unchanged; untouched deliberately because fixing it
   means making the nav links `inline-block`, which moves their hover underline.
   Not a phone issue — the touch tiers are all clear.
6. **"Audience buttons don't change on mobile"** was reported from a real phone and
   **could not be reproduced** under device emulation at any viewport. The handler was
   hardened against the most likely cause (see §5). If it recurs, the phone model and
   browser are needed.

---

## 5 · Changes made 2026-09-12

Against `7ec7e82`. Four files touched, all A-only plus the portrait generator.

- **Untinted portrait.** A now uses `portrait-cut.avif` (dark) and a new
  `portrait-cut-paper.avif` (light) instead of the amber duotone. `portrait-cut.png` was
  already the same photograph as the client's reference — verified by luminance and mean
  RGB, no re-export needed. The paper grade is a tone curve only, no hue shift: the
  untinted photo runs to 255 at the highlights, which dissolves the figure's edge against
  `#FBF6EC`.
- **Phone hero no longer puts copy on his face.** Root cause was a vertical budget, not a
  font size: the portrait is top-anchored and `.m-body` bottom-anchored, and on a short
  viewport they met. Measured landmark — **the jaw is the narrowest point of the cut-out,
  at 40–44% of its height**. `#mhero::before` now reserves the picture zone *in flow*, so
  no viewport can overlap; the headline clamp also reads `svh`, which a vw-only clamp
  cannot. Verified clear on nine viewports including his real one (440×763 @ DPR 3).
- **Stack section** (`.stack`) — 13 logos in his own three groups. The SVGs carry **no
  `fill` attribute**, so they render pure black; `filter: invert(1)` handles both themes
  in one line.
- **Hidden `#projects` section** — complete and styled, three template cards, `hidden`.
- **Share control** in the header — popover with the four social links, click-outside,
  Escape, focus handling. Anchored to the nav gutter, not the button, or it sits 18px
  off-screen at 320px.
- **Audience pills hardened** — the chosen key is now read at tween-completion time.
  Previously a second tap inside the 220ms fade let GSAP overwrite the first tween, whose
  `onComplete` (which carried the text) then never ran.
- **Favicon.** A Fraunces "S" in ink on the brand amber, rounded like the buttons —
  rendered from the real webfont, then masked to transparent corners so it does not
  show a white box on dark browser chrome. Shipped as `favicon-s.ico` (16/32/48),
  `favicon-s-32.png` and `favicon-s-180.png` (apple-touch). The old
  `images/favicon.png` is left alone; the legacy `index.html` still uses it.
- **Recommendation corrected** — "Sankar L B." is now "Sankar L Biswas", with the
  role "Business Transformation Consultant — AI Led Automation at IBM".
- **Tap targets.** The About email and phone were 21px strips, under the 24px
  WCAG 2.2 minimum. The earlier mobile pass had lifted `#contact .mail` to 44px and
  missed these two copies of the same affordance. Both are now 44px on touch,
  with the row heights unchanged.
- **Accessibility fix.** The phone eyebrow is ~10px, i.e. small text needing 4.5:1. It
  measured **3.82:1 before this work — it never passed.** Now 11.87:1 dark / 5.47:1 light,
  via a brighter amber and a light scrim that closes earlier.

Measured after: all hero text ≥4.5:1 in both themes, no horizontal scroll at any width,
zero console errors, B and C byte-identical to HEAD.
