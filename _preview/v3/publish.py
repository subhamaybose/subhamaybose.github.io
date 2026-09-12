"""Assemble a publish target from the `revamp` source. Dev tool, never shipped.

The source of truth is _preview/v3/ on revamp. Two targets are built from it and
they sit at different depths, so every relative path has to be rewritten per
target. Doing that by hand across twelve files is how a broken link ships, hence
this. It only ever WRITES the target tree - run it from a checkout of the branch
you are publishing to.

    git checkout preview-publish && py -3 _preview/v3/publish.py preview
    git checkout production      && py -3 _preview/v3/publish.py production

preview    a.html + css/ + js/ + blog/   under preview/,  page stays noindex
production index.html at the root, css/style.css, js/main.js, noindex stripped,
           absolute URLs repointed at subhamaybose.com
"""
import pathlib
import re
import subprocess
import sys

SRC = "_preview/v3"
PREVIEW_URL = "https://subhamaybose.github.io/preview/a.html"
LIVE = "https://subhamaybose.com"


def src(path):
    return subprocess.run(["git", "show", "revamp:" + path],
                          capture_output=True, check=True).stdout


def no_attr_paths(data, depth):
    """No src/href/srcset may still point above the target's root."""
    bad = re.findall((r'(?:src|href|srcset)="' + (r'\.\./' * depth) + r'[^"]*"').encode(), data)
    assert not bad, b"path above target root survives: " + b" ".join(bad[:3])


def write(rel, data):
    p = pathlib.Path(rel)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return len(data)


def build_preview():
    """preview/a.html is one level down; preview/blog/x.html is two."""
    n = 0
    h = src(SRC + "/a.html")
    h = h.replace(b"../../images/", b"../images/").replace(b"../../resume/", b"../resume/")
    no_attr_paths(h, 2)
    assert b'content="noindex"' in h, "the preview copy must stay noindex"
    assert PREVIEW_URL.encode() in h, "preview canonical missing"
    n += write("preview/a.html", h)

    n += write("preview/css/a.css", src(SRC + "/css/a.css"))
    n += write("preview/js/a.js", src(SRC + "/js/a.js"))
    n += write("preview/js/theme.js", src(SRC + "/js/theme.js"))

    for f in blog_files():
        b = src(SRC + "/blog/" + f)
        b = b.replace(b"../../../images/", b"../../images/") \
             .replace(b"../../../resume/", b"../../resume/")
        no_attr_paths(b, 3)
        n += write("preview/blog/" + f, b)
    return n


def build_production():
    """Everything sits one level higher than on preview, the stylesheet and
    script are renamed, and the page becomes indexable on its real domain."""
    n = 0
    h = src(SRC + "/a.html")
    h = h.replace(b"../../images/", b"images/").replace(b"../../resume/", b"resume/")
    h = h.replace(b'href="css/a.css"', b'href="css/style.css"')
    h = h.replace(b'src="js/a.js"', b'src="js/main.js"')
    h = h.replace(b'href="blog/"', b'href="blog/"')

    before = h
    h = re.sub(rb'<!-- =+\r?\n(?:.*?\r?\n)*?     =+ -->\r?\n<meta name="robots" content="noindex">\r?\n',
               b'', h)
    assert h != before and b'content="noindex"' not in h, "noindex block not removed cleanly"

    # the preview URL is not where this copy lives
    h = h.replace(PREVIEW_URL.encode(), (LIVE + "/").encode())
    h = h.replace(b"https://subhamaybose.github.io/images/og-cover.jpg",
                  (LIVE + "/images/og-cover.jpg").encode())
    assert b"subhamaybose.github.io" not in h, "a github.io URL survived into production"
    no_attr_paths(h, 1)
    n += write("index.html", h)

    n += write("css/style.css", src(SRC + "/css/a.css"))
    n += write("js/main.js", src(SRC + "/js/a.js"))
    n += write("js/theme.js", src(SRC + "/js/theme.js"))

    for f in blog_files():
        b = src(SRC + "/blog/" + f)
        b = b.replace(b"../../../images/", b"../images/") \
             .replace(b"../../../resume/", b"../resume/")
        b = b.replace(b'href="../css/a.css"', b'href="../css/style.css"')
        b = b.replace(b'src="../js/a.js"', b'src="../js/main.js"')
        b = b.replace(b'href="../a.html', b'href="../index.html')
        no_attr_paths(b, 2)
        assert b"a.html" not in b, "a link to a.html survived into production"
        n += write("blog/" + f, b)
    return n


def blog_files():
    out = subprocess.run(["git", "ls-tree", "--name-only", "revamp:" + SRC + "/blog"],
                         capture_output=True, check=True, text=True).stdout.split()
    files = sorted(f for f in out if f.endswith(".html"))
    assert files, "no blog pages found on revamp"
    return files


def sitemap(target):
    """Only production has a sitemap. Demo articles are noindex, so listing them
    would advertise URLs we have asked Google not to index."""
    if target != "production":
        return
    import datetime
    today = datetime.date.today().isoformat()
    urls = ["%s/" % LIVE, "%s/blog/" % LIVE]
    body = "\n".join(
        "  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n"
        "    <changefreq>monthly</changefreq>\n    <priority>%s</priority>\n  </url>"
        % (u, today, "1.0" if i == 0 else "0.8") for i, u in enumerate(urls))
    pathlib.Path("sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % body,
        encoding="utf-8", newline="\n")
    print("  sitemap.xml: %d urls (demo articles omitted - they are noindex)" % len(urls))


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else ""
    assert target in ("preview", "production"), __doc__
    branch = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"],
                            capture_output=True, text=True).stdout.strip()
    expect = {"preview": "preview-publish", "production": "production"}[target]
    assert branch == expect, "on branch %r, expected %r for target %r" % (branch, expect, target)

    n = build_preview() if target == "preview" else build_production()
    sitemap(target)
    print("  %s assembled: %d files, %d bytes" % (target, 4 + len(blog_files()), n))
