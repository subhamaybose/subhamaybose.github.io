/* Rendered contrast sweep — paste into the page and evaluate.

   Two things this gets right that a naive sweep does not:

   1. Only elements rendering their OWN text are measured. Otherwise every
      wrapper div inherits a child's colour and the report fills with noise.
   2. If any ancestor has a background-IMAGE (a gradient, a photo), the true
      ground cannot be read from computed style, so the element is counted as
      "onGradient" rather than compared against a background-color further up.
      Walking past a gradient is what produced phantom failures on Design B's
      amber bands. Those cases need text_over_image_check.py instead.

   Returns {fails:[...], onGradient:n}. */
(function () {
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function L(s) {
    var m = s.match(/[\d.]+/g);
    if (!m) return null;
    return 0.2126 * lin(+m[0]) + 0.7152 * lin(+m[1]) + 0.0722 * lin(+m[2]);
  }

  function groundOf(el) {
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { gradient: true };
      var m = cs.backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > 0.85)) return { bg: cs.backgroundColor };
    }
    return { bg: getComputedStyle(document.body).backgroundColor };
  }

  var fails = [], grad = 0;
  document.querySelectorAll('body *').forEach(function (el) {
    var own = Array.prototype.filter.call(el.childNodes, function (n) {
      return n.nodeType === 3 && n.textContent.trim().length > 1;
    });
    if (!own.length) return;

    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.1) return;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;

    var g = groundOf(el);
    if (g.gradient) { grad++; return; }

    var f = L(cs.color), b = L(g.bg);
    if (f === null || b === null) return;
    var hi = Math.max(f, b), lo = Math.min(f, b), ratio = (hi + 0.05) / (lo + 0.05);

    var px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    var need = (px >= 24 || (bold && px >= 18.66)) ? 3.0 : 4.5;
    if (ratio < need) {
      fails.push(el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 20) +
        ' "' + own[0].textContent.trim().slice(0, 24) + '" ' + cs.color + ' on ' + g.bg +
        ' = ' + ratio.toFixed(2) + ' (need ' + need + ')');
    }
  });
  return JSON.stringify({ fails: fails.slice(0, 18), onGradient: grad });
})()
