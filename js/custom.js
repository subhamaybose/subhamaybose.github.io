/* ==========================================================================
   Subhamay Bose — Portfolio
   No dependencies. Loaded with `defer`, so the DOM is parsed before this runs
   and no DOMContentLoaded wrapper is needed.

   Motion policy: CSS owns every transition. JS only adds/removes classes and
   writes text. `prefers-reduced-motion` is queried live at each decision point
   rather than snapshotted at load, so toggling the OS setting takes effect
   without a reload.
   ========================================================================== */
(function () {
  "use strict";

  var CAREER_START = 2016;

  var mqReduce = matchMedia("(prefers-reduced-motion: reduce)");

  /* Each init is isolated. One throwing init must never take the rest of the
     page with it — the previous build called them as bare sequential
     statements, so a single missing element silently killed every later
     feature. */
  function safeInit(name, fn) {
    try {
      fn();
    } catch (e) {
      if (window.console) console.warn("[init] " + name + " failed:", e);
    }
  }

  /* ---------- Theme: light / dark / system ----------
     The effective theme is already applied by the inline block in index.html
     (it must be, to avoid a flash). That block also records the raw stored
     choice on window.__themeChoice, so this function does not re-derive it. */
  function initTheme() {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll("[data-theme-choice]")
    );
    if (!buttons.length) return;

    var darkMql = matchMedia("(prefers-color-scheme: dark)");
    /* null means "never chosen" - follow the OS until they do. */
    var choice = window.__themeChoice === "light" || window.__themeChoice === "dark"
      ? window.__themeChoice
      : null;

    function apply(next) {
      choice = next;
      var effective = next || (darkMql.matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", effective);
      buttons.forEach(function (btn) {
        btn.setAttribute(
          "aria-pressed",
          String(btn.getAttribute("data-theme-choice") === effective)
        );
      });
    }

    apply(choice);

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-theme-choice");
        try {
          localStorage.setItem("theme", next);
        } catch (e) { /* private mode: the choice just won't persist */ }
        apply(next);
      });
    });

    /* Track the OS only until the visitor makes an explicit choice. */
    darkMql.addEventListener("change", function () {
      if (choice === null) apply(null);
    });
  }

  /* ---------- Mobile drawer ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var drawer = document.getElementById("mobile-nav");
    if (!toggle || !drawer) return;

    /* `inert` does the work a hand-rolled focus trap usually gets wrong. Two
       directions matter: the closed drawer must be out of the tab order, and
       while it is OPEN the page behind it must be too — otherwise Tab walks
       from the last drawer link into content hidden under an opaque panel.
       The nav bar itself stays reachable, because the drawer is a disclosure
       panel below it rather than a modal over it. */
    var behind = [document.getElementById("main"),
                  document.getElementById("site-footer")].filter(Boolean);

    function setOpen(open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        drawer.removeAttribute("inert");
        behind.forEach(function (el) { el.setAttribute("inert", ""); });
        var first = drawer.querySelector("a, button");
        if (first) first.focus();
      } else {
        drawer.setAttribute("inert", "");
        behind.forEach(function (el) { el.removeAttribute("inert"); });
      }
    }

    setOpen(false);

    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });

    /* Only the navigation links close the drawer. The social row lives in the
       same subtree, and closing the drawer when someone opens LinkedIn in a
       new tab is a surprise, not a feature. */
    drawer.querySelectorAll("ul a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Active nav link ---------- */
  function initScrollNav() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll(".nav-links a")
    );
    var sections = Array.prototype.slice.call(
      document.querySelectorAll("main section[id]")
    );
    if (!links.length || !sections.length || !("IntersectionObserver" in window)) {
      return;
    }

    var byHash = {};
    links.forEach(function (a) { byHash[a.getAttribute("href")] = a; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var active = byHash["#" + entry.target.id];
        links.forEach(function (a) {
          a.classList.remove("is-active");
          a.removeAttribute("aria-current");
        });
        if (active) {
          active.classList.add("is-active");
          active.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Scroll reveals ----------
     The stagger index comes from an inline `--i` in the markup, so ordering is
     authored rather than computed, and the CSS transition-delay does the work. */
  function initReveals() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll("[data-reveal]")
    );
    if (!items.length) return;

    var root = document.documentElement;

    /* Disarming is what actually shows the content: the CSS only hides while
       `reveals-on` is set. Adding `is-in` too keeps the two paths consistent. */
    function showAll() {
      root.classList.remove("reveals-on");
      items.forEach(function (el) { el.classList.add("is-in"); });
    }

    if (mqReduce.matches || !("IntersectionObserver" in window)) {
      showAll();
      window.__revealsReady = true;
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });

    items.forEach(function (el) { io.observe(el); });

    /* Tell the dead-man's switch in index.html that reveals are live. */
    window.__revealsReady = true;

    /* If the setting flips mid-session, stop animating and just show. */
    mqReduce.addEventListener("change", function () {
      if (mqReduce.matches) { io.disconnect(); showAll(); }
    });
  }

  /* ---------- The rail readout ----------
     The caret's vertical position is CSS scroll-driven where supported. This
     only writes the section name and the percentage, and falls back to moving
     the caret itself where `animation-timeline` is unavailable. */
  function initRailReadout() {
    var root = document.getElementById("rail-readout");
    if (!root) return;

    var secEl = root.querySelector(".r-sec");
    var pctEl = root.querySelector(".r-pct");
    var caret = root.querySelector(".caret");
    var readout = root.querySelector(".readout");
    if (!secEl || !pctEl) return;

    var cssDriven = window.CSS && CSS.supports &&
      CSS.supports("animation-timeline", "scroll()");

    var sections = Array.prototype.slice.call(
      document.querySelectorAll("main section[id]")
    );

    var labels = {};
    sections.forEach(function (s) {
      var head = s.querySelector(".sec-head .lbl");
      var idx = s.querySelector(".sec-idx");
      labels[s.id] = {
        name: head ? head.textContent.trim() : "Top",
        idx: idx ? idx.textContent.trim() : ""
      };
    });

    var currentId = sections.length ? sections[0].id : null;
    var frame = 0;

    function paint() {
      frame = 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      pctEl.textContent = pct + "%";

      var info = currentId ? labels[currentId] : null;
      var name = info ? (info.idx ? info.idx + " " + info.name : info.name) : "Top";
      if (secEl.textContent !== name) secEl.textContent = name;

      if (!cssDriven && caret && readout) {
        var travel = (window.innerHeight - 24) * (pct / 100);
        var t = "translateY(" + travel.toFixed(1) + "px)";
        caret.style.transform = t;
        readout.style.transform = t;
      }
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    }

    if ("IntersectionObserver" in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) currentId = entry.target.id;
        });
        schedule();
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { io.observe(s); });
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    paint();
  }

  /* ---------- Derived figures ----------
     Single source of truth for both. The markup ships the correct value for a
     no-JS visitor; this keeps it correct as years pass. */
  function initFigures() {
    var years = document.getElementById("years-of-experience");
    if (years) {
      years.textContent = String(new Date().getFullYear() - CAREER_START);
    }
    var year = document.getElementById("year");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }
  }

  [
    ["theme", initTheme],
    ["nav", initNav],
    ["scrollNav", initScrollNav],
    ["reveals", initReveals],
    ["railReadout", initRailReadout],
    ["figures", initFigures]
  ].forEach(function (pair) { safeInit(pair[0], pair[1]); });
})();
