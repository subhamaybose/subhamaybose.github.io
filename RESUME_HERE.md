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
| Working branch | `revamp` — source of truth, all three designs, the verification scripts |
| **Deployable site** | **`production`** — A at the root plus `blog/`, ready for `public_html`. Its README is the deploy guide. |
| **Publishing** | **`py -3 _preview/v3/publish.py preview\|production`**, run from a checkout of that branch. Do NOT hand-copy any more — there are now three path depths. |
| Published preview | `preview/a.html` on `origin/main` → https://subhamaybose.github.io/preview/a.html |
| Local preview | `py -3 -m http.server 4173` then `/_preview/v3/a.html` |
| Handover doc | https://claude.ai/code/artifact/ab0400a7-22b1-4ddd-a97c-061cabeca545 — status, what shipped, the seven deploy steps, open items. Shareable; this file stays authoritative. |

Latest: source `4935dbc` on `revamp`, published as `6d38d46` on `main` /
`preview-publish` (2026-09-12). **`preview-publish` is not a separate line of work** —
it is `main` plus the assembled `preview/` folder, and it is what gets pushed.
To publish again: from `preview-publish`, copy the three A files out of `revamp`,
rewrite `../../` to `../` in the HTML only (the CSS and JS carry no repo-root paths),
add any newly referenced images, then `git push origin preview-publish:main`.

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

## 4 · Promotion — DONE 2026-09-12, it lives on the `production` branch

A is promoted. `production` is the deployable tree: `index.html` at the root,
`css/style.css`, `js/main.js` + `js/theme.js`, 44 files, 1.5 MB, no build step.
`noindex` is gone, `sitemap.xml` and `robots.txt` name `subhamaybose.com`, and
`.htaccess` carries the 404, gzip, cache headers and the AVIF mime type.

**Rollback:** tags `pre-promotion-main` and `pre-promotion-revamp` (both pushed)
mark the state before that branch existed. `main` still serves the old site plus
the previews; nothing on it was replaced.

**Three branches, three jobs.** `revamp` is where work happens. `preview-publish`
is `main` plus the assembled `preview/` folder and is what gets pushed to `main`
for review. `production` is the deliverable. A change to A means: edit under
`_preview/v3/` on `revamp`, then re-assemble BOTH `preview-publish` (flatten
`../../` → `../`) and `production` (flatten to root, rename `a.css`→`style.css`
and `a.js`→`main.js`, strip the noindex).

### Superseded — the original checklist, kept for the record

The head/SEO work is **done and already points at the destination**, so promotion is
mechanical. `subhamaybose.com` is registered and resolving (Hostinger IPs), currently
serving Hostinger's "Default page" placeholder — the domain is his, nothing to migrate.

1. Move `preview/a.html` → `index.html`, `preview/css/a.css` → `css/`, `preview/js/a.js`
   and `preview/js/theme.js` → `js/`. **Do not delete B and C** unless that was agreed
   separately.
2. Rewrite the paths: at the root `../images/` becomes `images/` and `../resume/`
   becomes `resume/`.
3. **Repoint `og:image` and `twitter:image`** from `subhamaybose.github.io` to
   `subhamaybose.com`. They deliberately point at github.io until then, because that
   is the only host serving the card while the domain shows a placeholder — a preview
   link shared before cutover would otherwise render an empty box.
4. **Delete the `<meta name="robots" content="noindex">` line.** It is the one thing
   keeping the page out of search, and the comment block above it says so.
5. Replace `sitemap.xml` with:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://subhamaybose.com/</loc>
       <lastmod>YYYY-MM-DD</lastmod>
       <changefreq>monthly</changefreq>
       <priority>1.0</priority>
     </url>
   </urlset>
   ```
6. Replace `robots.txt` with:
   ```
   User-agent: *
   Allow: /

   Sitemap: https://subhamaybose.com/sitemap.xml
   ```
7. Add a `CNAME` file containing `subhamaybose.com`, or the client's DNS move drops the
   custom domain on the next deploy.

**Why the sitemap and robots.txt were NOT done in advance:** a sitemap is a list of absolute URLs. Published
today, at `subhamaybose.github.io`, it would declare that this site lives on a domain
serving a hosting placeholder. They are correct only once A is at the root and the domain
points at it — so they flip AT cutover, not before.

Note for the client: the placeholder currently on `subhamaybose.com` is indexable. Worth a
quick Search Console check after cutover that "Default page" has dropped out.

---

## 5 · Open items

1. **The hidden `#projects` section needs real content.** How to publish it is documented
   in the HTML comment directly above the section.
4. **Retiring B and C is a separate job**, not yet done or scoped.
5. **Promoting A to `/`** — the repo holds two dead homepage candidates once that happens:
   the legacy site live on `main`, and an unpublished "Technical Swiss" rebuild on
   `revamp`. Deleting either is the client's call.
6. **Five desktop nav links are 22px tall**, 2px under the WCAG 2.2 SC 2.5.8
   minimum. Pre-existing and unchanged; untouched deliberately because fixing it
   means making the nav links `inline-block`, which moves their hover underline.
   Not a phone issue — the touch tiers are all clear.
7. **"Audience buttons don't change on mobile"** was reported from a real phone and
   **could not be reproduced** under device emulation at any viewport. The handler was
   hardened against the most likely cause (see §6). If it recurs, the phone model and
   browser are needed.

---

## 6 · Changes made 2026-09-12

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

### Head / SEO batch, same day

Written onto A and pointed at `https://subhamaybose.com/` because that is where the file
is going; `noindex` stays until promotion, so nothing leaks meanwhile.

- Real `<title>` (55 rendered chars) and `description` (156 — the first draft was 177 and
  would have been truncated in the SERP). Both build on the wording his legacy
  `index.html` already used rather than inventing new copy.
- `canonical`, full Open Graph and Twitter card, `og:locale`, `author`, `theme-color`.
  Every absolute URL targets `subhamaybose.com` **except** `og:image` / `twitter:image`,
  which point at github.io so link previews work before the domain moves. Step 3 of the
  promotion checklist flips them.
- **`images/og-cover.jpg`** — a real 1200×630 social card in A's own language, rendered
  from the live page's fonts and portrait, 66 KB. There was no correctly-sized OG image
  before; the legacy site pointed social previews at a 1293×1280 square.
- **JSON-LD `@graph`**: WebSite + ProfilePage + Person, extending the Person block his
  legacy site already carried (his `sameAs` list, including the Facebook and Instagram
  profiles A does not link, is kept — `sameAs` is identity resolution, not navigation).
  Only the AWS credential is asserted via `hasCredential`, because the page's own
  hierarchy singles that one out as exam-verified; the other thirteen stay as content
  rather than claims in markup.
- `theme-color` is updated from `a.js` on `themechange`. A `<meta>` cannot hold two
  values, and a `media` attribute would follow the OS rather than this page's stored
  choice.
- Deliberately omitted: `<meta name="keywords">`. His legacy page has one; no search
  engine has used it in over a decade and it is one more line to keep true.

Core Web Vitals, measured (localhost, so TTFB is not representative — the rest is):
mobile at 4× CPU throttle LCP 652 ms, CLS 0.000, FCP 652 ms; desktop LCP 260 ms,
CLS 0.029. 10 requests, 325 KB.

### Third round — blog, share preview, second email

- **The WhatsApp preview was broken and the cause was `og:url`.** It named
  `subhamaybose.com`, which serves a Hostinger parking page with no og tags;
  Meta reads og:url as the canonical, follows it, finds nothing, and renders a
  bare link. Every identity tag on the preview copy now names the preview URL.
  **Verifying needs a cache-buster** — WhatsApp caches a negative scrape
  server-side for days with no public debugger. Test on `?v=2`.
- **`connect@subhamaybose.com` added** alongside the gmail address in the About
  facts, the contact block, the Email me button and the JSON-LD. **The mailbox
  must exist before production goes live** — the domain is still parked.
- **Blog**: `blog/index.html` plus nine article pages, all demo content and all
  `noindex` until real writing replaces them. A list, not a card grid — of eight
  reference blogs measured, only the magazine used cards. Progressive reveal in
  batches of three, with the hidden state added **by script**, never by CSS, so a
  dead CDN shows nine posts rather than none.
- **Nav is six on desktop, five on the phone.** `#tabs` is still
  `repeat(5, 1fr)`; Writing gave up its slot to Blog.
- **Light mobile hero.** The scrim was veiling the suit at 94% rather than the
  figure fading, which on paper left a grey silhouette with a hard edge. The
  portrait now dissolves through its own `mask-image`, timed to finish at 56% —
  the same proportion the spacer reserves — and the light scrim went back to
  being a transition. A veil is the wrong tool on a light ground; on a dark one
  the identical fault merges invisibly, so **check both themes**.
- **Nav target size closed.** The links are 22px of text; an absolutely
  positioned `::before` lifts the hit area to 44px with zero layout movement,
  because padding would have dragged the hover underline down with it.

### Second round of client feedback, same day

- **Exactly one `<h1>`.** Both hero headlines are now `<h2 class="hero-h">`; every
  hero rule was re-keyed from the tag onto the class so nothing else on the page
  is reachable by them. Proved with a pixel diff: 10,397,280 px compared across
  three viewports, **0 differ**. The single H1 is `.sr-only`, **not**
  `display: none` — the client asked for display:none, and that strips the
  element from the accessibility tree, leaving the page with no heading at all
  for a screen reader while still claiming one for Google. `.sr-only` is
  invisible, announced, and indexed. It lives in this file, not a shared header,
  so a future page cannot inherit it.
- **Phone hero, second pass.** Reserving to the jawline gave 12px — geometrically
  clear, still reading as text on him. Now reserved to 52% of the figure (below
  the collar) and the headline is 9vw, down from 10.5vw. That first pushed the
  CTAs behind the tab bar under 763px tall, so the portrait's height cap went
  58svh → 50svh and its top margin scales. Clearance 25–194px across 568–932
  tall; CTAs clear the tab bar from 640 up. At 568 the content genuinely does not
  fit and the CTAs need a short scroll.
- **Share action.** "Share this site" — native sheet on touch, clipboard copy on
  a mouse. Gated on `pointer: coarse`, **not** on `navigator.share` existing:
  Edge and Chrome on Windows implement it, so an API-only check served the clunky
  Windows share sheet to desktop users. `execCommand` fallback for non-secure
  contexts. Shares `location` minus the hash.
- **404 rebuilt** for `production`, self-contained with inline CSS, anchors
  matched to A's real section ids (`#creds`, not `#credentials`).

Open, unchanged: two badge images (`crew-ai.jpg`, `ibm-cwh.png`) are unreferenced
— the credentials section links thirteen while its heading says fourteen.
