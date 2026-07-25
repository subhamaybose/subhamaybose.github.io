# subhamaybose.github.io

Source for my personal portfolio site, live at [subhamaybose.github.io](https://subhamaybose.github.io/).

A single-page portfolio covering experience, skills, certifications, publications, and recommendations.

## Stack

- HTML, CSS, vanilla JS &mdash; no build step
- [Bootstrap 3](https://getbootstrap.com/docs/3.3/), [Font Awesome 5](https://fontawesome.com/v5/search), jQuery
- [Flexslider](https://woocommerce.com/flexslider/), [Owl Carousel](https://owlcarousel2.github.io/OwlCarousel2/), [Isotope](https://isotope.metafizzy.co/), [Typed.js](https://mattboldt.com/demos/typed-js/)
- Hosted on [GitHub Pages](https://pages.github.com/), deployed straight from `main`

## Structure

- `index.html` &mdash; the entire site
- `css/`, `js/`, `fonts/` &mdash; vendored assets
- `images/` &mdash; badges, profile photo, hero images
- `resume/resume.pdf` &mdash; downloadable CV
- `robots.txt`, `sitemap.xml` &mdash; search engine crawling/indexing
- `404.html` &mdash; branded not-found page

## Local development

No build step required &mdash; open `index.html` directly in a browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8000
```
