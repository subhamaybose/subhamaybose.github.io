/* Shared dark/light toggle for designs A, B and C.

   The initial theme is set by a tiny inline script in <head> so the page never
   paints the wrong theme first - this file deliberately does NOT set it on
   load, or every visit would flash dark before switching.

   It owns three things: the button state, the stored preference, and a
   `themechange` event for surfaces CSS cannot reach (A's WebGL node field). */
(function () {
  "use strict";

  var KEY = "sb-theme";
  var root = document.documentElement;
  var media = window.matchMedia ? matchMedia("(prefers-color-scheme: light)") : null;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function apply(theme, persist) {
    root.setAttribute("data-theme", theme);
    if (persist) {
      try { localStorage.setItem(KEY, theme); } catch (e) {}
    }

    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    }

    /* <picture> sources are chosen by a real media query, which follows the OS
       and knows nothing about the toggle. Retarget them so a manual switch
       moves the artwork too. */
    var srcs = document.querySelectorAll("source[data-theme-src]");
    for (var i = 0; i < srcs.length; i++) {
      srcs[i].media = srcs[i].getAttribute("data-theme-src") === theme ? "all" : "not all";
    }

    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
  }

  function wire() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    apply(current(), false);              // sync the button to whatever <head> chose
    btn.addEventListener("click", function () {
      apply(current() === "light" ? "dark" : "light", true);
    });
  }

  /* Follow the OS only until the visitor makes an explicit choice. */
  if (media && media.addEventListener) {
    media.addEventListener("change", function (e) {
      if (!stored()) apply(e.matches ? "light" : "dark", false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
