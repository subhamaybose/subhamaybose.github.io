# subhamaybose.com — deployable site

**This branch (`production`) is the site, ready to upload.** Everything in it goes
into `public_html`. There is no build step, no npm install, nothing to compile.

---

## Deploy to Hostinger (`public_html`)

Upload **the contents of this folder** — not the folder itself — into `public_html`,
so that `index.html` sits at `public_html/index.html`.

Via the file manager:

1. Download this branch as a ZIP (GitHub → Code → Download ZIP), or `git clone`
   and `git checkout production`.
2. hPanel → **Files → File Manager → `public_html`**.
3. Delete the placeholder `default.php` / `index.html` that Hostinger ships.
4. Upload the ZIP, then **Extract** it in place.
5. Make sure `index.html`, `css/`, `js/`, `images/`, `resume/` are directly inside
   `public_html`, not nested inside an extra folder.

Via SSH or FTP, the same thing:

```bash
# from a checkout of this branch
rsync -av --delete ./ user@host:~/public_html/ --exclude='.git' --exclude='.claude'
```

### After uploading

- hPanel → **Websites → SSL** → issue/confirm the certificate, and turn on
  **Force HTTPS**.
- Decide `www` vs non-`www` in the panel and let it redirect. **Do not** add
  redirect rules to `.htaccess` — on this kind of shared host, hand-written
  redirects behind the proxy are the usual cause of a redirect loop.
- Open `https://subhamaybose.com/` and hard-refresh once.

### The `.htaccess`

Ships with this branch. It sets the 404 page, gzip, cache headers, two security
headers, and the **AVIF mime type** — that last one matters: on Apache builds
without it the hero portrait downloads as a file instead of rendering. It
deliberately contains **no rewrite rules**.

---

## Deploy to GitHub Pages instead

Also works, with two changes:

1. Repo → Settings → Pages → deploy from branch `production`, folder `/`.
2. Add a file named `CNAME` at the root containing exactly `subhamaybose.com`,
   or Pages drops the custom domain on the next deploy.

`.htaccess` is ignored by Pages — caching and the 404 are handled by GitHub.

---

## What is where

| Path | |
|---|---|
| `index.html` | The whole site. One page. |
| `css/style.css` | All styling, both themes. |
| `js/main.js` | Behaviour: scroll, theme-colour, share, audience switcher. |
| `js/theme.js` | Dark/light toggle and the stored preference. |
| `images/` | Portraits, credential badges, technology logos, favicons, social card. |
| `resume/resume.pdf` | Linked from the header and the contact block. |
| `sitemap.xml`, `robots.txt` | Both point at `https://subhamaybose.com/`. |
| `404.html` | Self-contained — it does not load `style.css`, so it cannot break when the stylesheet changes. |

External runtime dependencies are Google Fonts, and GSAP / Lenis / Three.js from
CDNs. The page degrades to a readable, complete document if any of them fail.

---

## Two things to know before editing

**The hero exists twice.** `#mhero` is the phone layout, `#hero` is tablet and
desktop, and both are in the HTML — CSS decides which one renders. A change to the
headline, the audience pills or the call-to-action buttons has to be made in
**both**, or it lands on one tier only.

**There is exactly one `<h1>`**, and it is the visually hidden one just inside
`<main>`. Both visible hero headlines are `<h2 class="hero-h">` on purpose: two
heroes in the DOM meant two H1s, so the visible ones were demoted and the real
heading was made `.sr-only` — hidden from sight, still read by screen readers and
still indexed. If a second page is ever added, it needs its **own** H1; do not
move this one into a shared header.

---

## Where the rest of the history lives

- `main` — the previous site, plus the three design previews at `/preview/a|b|c.html`.
- `revamp` — the working branch: all three directions under `_preview/`, the
  verification scripts, and `RESUME_HERE.md`, which is the file to read before
  picking this project up again.
- Tags `pre-promotion-main` and `pre-promotion-revamp` mark the state before this
  branch was created.

Nothing was deleted to build this branch. Files the new site does not reference —
the old Bootstrap fonts, the B and C previews and their portraits — were left out
of `production` and are still on `main` and `revamp`.
