(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && !!window.ScrollTrigger;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll progress bar ---------- */
  function initScrollProgress() {
    var bar = document.querySelector("#scroll-progress span");
    if (!bar) return;

    if (!hasScrollTrigger) {
      var setWidth = function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = pct + "%";
      };
      window.addEventListener("scroll", setWidth, { passive: true });
      window.addEventListener("resize", setWidth);
      setWidth();
      return;
    }

    gsap.set(bar, { width: "0%" });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) { gsap.set(bar, { width: (self.progress * 100) + "%" }); },
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagneticButtons() {
    if (!hasGSAP || reduceMotion || !canHover) return;
    var buttons = document.querySelectorAll(".btn");
    buttons.forEach(function (btn) {
      var moveX = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
      var moveY = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var relX = e.clientX - rect.left - rect.width / 2;
        var relY = e.clientY - rect.top - rect.height / 2;
        moveX(relX * 0.28);
        moveY(relY * 0.45);
      });
      btn.addEventListener("mouseleave", function () {
        moveX(0);
        moveY(0);
      });
    });
  }

  /* ---------- Hero portrait parallax ---------- */
  function initPortraitParallax() {
    var portrait = document.querySelector(".hero-portrait");
    var hero = document.getElementById("hero");
    if (!portrait || !hero || !hasGSAP || reduceMotion || !canHover) return;
    // wait out the hero entrance timeline so it doesn't fight this over the y transform
    setTimeout(function () {
      var moveX = gsap.quickTo(portrait, "x", { duration: 0.6, ease: "power3.out" });
      var moveY = gsap.quickTo(portrait, "y", { duration: 0.6, ease: "power3.out" });
      hero.addEventListener("mousemove", function (e) {
        var rect = hero.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width - 0.5;
        var relY = (e.clientY - rect.top) / rect.height - 0.5;
        moveX(relX * 18);
        moveY(relY * 14);
      });
    }, 1500);
  }

  /* ---------- Theme (light / dark / system) ---------- */
  function initTheme() {
    var buttons = document.querySelectorAll("[data-theme-choice]");
    if (!buttons.length) return;

    var darkMql = window.matchMedia("(prefers-color-scheme: dark)");

    // dark is the hard default — "system" must be picked explicitly to follow the OS
    function current() {
      try {
        var t = localStorage.getItem("theme");
        return t === "light" || t === "dark" || t === "system" ? t : "dark";
      } catch (e) {
        return "dark";
      }
    }

    function apply(choice) {
      var effective = choice === "system" ? (darkMql.matches ? "dark" : "light") : choice;
      document.documentElement.setAttribute("data-theme", effective);
      buttons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-theme-choice") === choice));
      });
    }

    apply(current());

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var choice = btn.getAttribute("data-theme-choice");
        try { localStorage.setItem("theme", choice); } catch (e) {}
        apply(choice);
      });
    });

    // live-update only while "system" is the active choice
    darkMql.addEventListener("change", function () {
      if (current() === "system") apply("system");
    });
  }

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelectorAll("#mobile-nav a, .nav-links a");
    if (!toggle) return;

    function closeMenu() {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    function openMenu() {
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      document.body.classList.contains("nav-open") ? closeMenu() : openMenu();
    });
    links.forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Sticky nav background + active section ---------- */
  function initScrollNav() {
    var nav = document.getElementById("site-nav");
    var sections = document.querySelectorAll("main section[id]");
    var navLinks = document.querySelectorAll(".nav-links a");

    function onScroll() {
      if (window.scrollY > 40) nav.classList.add("is-solid");
      else nav.classList.remove("is-solid");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!("IntersectionObserver" in window) || !sections.length) return;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.getAttribute("id");
          navLinks.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;
    window.addEventListener(
      "scroll",
      function () { btn.classList.toggle("is-visible", window.scrollY > 400); },
      { passive: true }
    );
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Role typewriter ---------- */
  function initTypedRole() {
    var el = document.getElementById("typed-role");
    if (!el) return;
    var roles = ["Backend Developer", "Cloud Application Developer", "Digital Transformation Consultant"];

    if (reduceMotion) {
      el.textContent = roles[0];
      return;
    }

    var roleIndex = 0, charIndex = 0, deleting = false;

    function tick() {
      var current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1800);
          return;
        }
        setTimeout(tick, 55);
      } else {
        charIndex--;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, 30);
      }
    }
    tick();
  }

  /* ---------- Experience years + counters ---------- */
  function initCounters() {
    var startYear = 2016;
    var years = new Date().getFullYear() - startYear;

    var yearsEl = document.getElementById("years-of-experience");
    if (yearsEl) yearsEl.setAttribute("data-to", years);

    var heroYears = document.getElementById("hero-years");
    if (heroYears) heroYears.textContent = years + "+";

    var repoEl = document.getElementById("repo-count");
    if (repoEl) {
      fetch("https://api.github.com/users/subhamaybose")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data || typeof data.public_repos !== "number") return;
          repoEl.setAttribute("data-to", data.public_repos);
        })
        .catch(function () { /* keep the static fallback value */ });
    }

    var counters = document.querySelectorAll(".js-counter");
    if (!counters.length) return;

    function animateCounter(el) {
      var to = parseInt(el.getAttribute("data-to"), 10) || 0;
      if (reduceMotion || !hasGSAP) {
        el.textContent = to;
        return;
      }
      gsap.to(el, {
        textContent: to,
        duration: 1.6,
        ease: "power2.out",
        snap: { textContent: 1 },
      });
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCounter);
      return;
    }
    var band = document.getElementById("counter-animate");
    var triggered = false;
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            counters.forEach(animateCounter);
          }
        });
      },
      { threshold: 0.4 }
    );
    if (band) obs.observe(band);
  }

  /* ---------- Skill meters ---------- */
  function initMeters() {
    var meters = document.querySelectorAll(".meter-fill");
    if (!meters.length || !("IntersectionObserver" in window)) {
      meters.forEach(function (m) { m.style.width = m.getAttribute("data-fill") + "%"; });
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.width = entry.target.getAttribute("data-fill") + "%";
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    meters.forEach(function (m) { obs.observe(m); });
  }

  /* ---------- Certification filter ---------- */
  function initBadgeFilter() {
    var pills = document.querySelectorAll(".filter-pill");
    var cards = document.querySelectorAll(".badge-card");
    if (!pills.length) return;

    pills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        pills.forEach(function (p) { p.classList.remove("is-active"); });
        pill.classList.add("is-active");
        var filter = pill.getAttribute("data-filter");
        cards.forEach(function (card) {
          var show = filter === "all" || card.getAttribute("data-cat") === filter;
          card.classList.toggle("is-hidden", !show);
        });
      });
    });
  }

  /* ---------- Scroll reveals (GSAP) ---------- */
  function initReveals() {
    var items = Array.prototype.filter.call(
      document.querySelectorAll("[data-reveal]"),
      function (el) { return !el.closest("#hero"); }
    );
    if (!items.length || reduceMotion || !hasScrollTrigger) return;

    items.forEach(function (el) {
      gsap.set(el, { opacity: 0, y: 24 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
  }

  /* ---------- Grid cascade reveals (skill/badge/tech/quote cards) ---------- */
  function initGridStagger() {
    if (reduceMotion || !hasScrollTrigger) return;
    var selectors = [".skill-card", ".badge-card", ".tech-tile", ".quote-card"];
    selectors.forEach(function (selector) {
      var els = document.querySelectorAll(selector);
      if (!els.length) return;
      gsap.set(els, { opacity: 0, y: 28, scale: 0.96 });
      ScrollTrigger.batch(els, {
        start: "top 90%",
        onEnter: function (batch) {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
            // hand transform control back to CSS so the :hover lift works afterward
            onComplete: function () { gsap.set(this.targets(), { clearProps: "transform" }); },
          });
        },
        once: true,
      });
    });
  }

  /* ---------- Timeline line draw-in ---------- */
  function initTimelineDraw() {
    var lines = document.querySelectorAll(".timeline-fill");
    if (!lines.length) return;
    if (!hasScrollTrigger || reduceMotion) {
      lines.forEach(function (line) { line.style.height = "100%"; });
      return;
    }
    lines.forEach(function (line) {
      gsap.to(line, {
        height: "100%",
        ease: "none",
        scrollTrigger: { trigger: line.parentElement, start: "top 75%", end: "bottom 85%", scrub: true },
      });
    });
  }

  /* ---------- Hero entrance ---------- */
  function initHeroEntrance() {
    var portrait = document.querySelector(".hero-portrait");
    var textItems = document.querySelectorAll(".hero-copy [data-reveal]");
    var titleWords = document.querySelectorAll("#hero-title .reveal-word > span");
    if ((!textItems.length && !portrait) || reduceMotion || !hasGSAP) return;

    var tl = gsap.timeline({ delay: 0.1 });

    if (titleWords.length) {
      gsap.set(titleWords, { yPercent: 110 });
      tl.to(titleWords, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.12 });
    }

    gsap.set(textItems, { opacity: 0, y: 20 });
    tl.to(textItems, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 }, 0.1);

    if (portrait) {
      gsap.set(portrait, { opacity: 0, y: 16 });
      tl.to(portrait, { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, 0.25);
    }
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initScrollProgress();
    initNav();
    initScrollNav();
    initBackToTop();
    initTypedRole();
    initCounters();
    initMeters();
    initBadgeFilter();
    initHeroEntrance();
    initReveals();
    initGridStagger();
    initTimelineDraw();
    initMagneticButtons();
    initPortraitParallax();
    initYear();
  });
})();
