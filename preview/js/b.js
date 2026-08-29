/* DESIGN B — Signal
   GSAP + ScrollTrigger + Lenis. No WebGL here on purpose: B's impact comes
   from colour, scale and type, so the motion budget goes into scroll
   choreography rather than a particle field. */
(function () {
  "use strict";

  var CAREER_START = 2016;   // first professional role

  var reduce = matchMedia("(prefers-reduced-motion: reduce)");
  var fine = matchMedia("(hover: hover) and (pointer: fine)");
  var hasGSAP = typeof window.gsap !== "undefined";

  function init(name, fn) {
    try { fn(); } catch (e) { console.warn("[b] " + name, e); }
  }

  init("lenis", function () {
    if (reduce.matches || typeof window.Lenis === "undefined") return;
    var l = new Lenis({ duration: 1.1, smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) {
      l.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { l.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { l.raf(t); requestAnimationFrame(raf); });
    }
  });

  /* magnetic buttons only — B keeps the native cursor, the colour is loud enough */
  init("magnet", function () {
    if (!fine.matches || reduce.matches || !hasGSAP) return;
    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      var mx = gsap.quickTo(el, "x", { duration: .5, ease: "power3" });
      var my = gsap.quickTo(el, "y", { duration: .5, ease: "power3" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * .3);
        my((e.clientY - (r.top + r.height / 2)) * .5);
      });
      el.addEventListener("pointerleave", function () { mx(0); my(0); });
    });
  });

  init("audience", function () {
    var pills = document.querySelectorAll(".aud button, .m-chips button");
    var outs = [document.getElementById("lede")].filter(Boolean);
    if (!pills.length || !outs.length) return;
    var COPY = {
      everyone: "Senior System Engineer and Team Lead at <b>IBM</b>. Scalable microservices, hybrid-cloud platforms and AI-driven systems in Node.js and Python.",
      recruiters: "Ten years in backend and cloud engineering, currently <b>Team Lead at IBM India</b>. AWS Certified Developer, Kubernetes and IBM Cloud certified &mdash; 14 credentials, all independently verifiable.",
      engineers: "<b>Kafka</b> pipelines, <b>Kubernetes</b> orchestration and <b>Elasticsearch</b> at production scale &mdash; and eight essays on the trade-offs behind them.",
      managers: "I lead a team at IBM delivering hybrid-cloud and AI systems end to end, and I care about the unglamorous parts: reliability, observability, and handover that survives the handover.",
      collaborators: "Open to a technical conversation &mdash; distributed systems, applied ML, or the architecture behind agentic AI."
    };
    pills.forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.dataset.aud;
        pills.forEach(function (p) { p.setAttribute("aria-pressed", String(p.dataset.aud === key)); });
        var next = COPY[key] || COPY.everyone;
        outs.forEach(function (out) {
          if (hasGSAP && !reduce.matches) {
            gsap.to(out, {
              opacity: 0, y: 6, duration: .2, ease: "power2.in",
              onComplete: function () {
                out.innerHTML = next;
                gsap.to(out, { opacity: 1, y: 0, duration: .35, ease: "power2.out" });
              }
            });
          } else { out.innerHTML = next; }
        });
      });
    });
  });

  init("scroll", function () {
    if (!hasGSAP || !window.ScrollTrigger) {
      document.querySelectorAll(".rv, .m-pop").forEach(function (el) {
        el.style.opacity = 1; el.style.transform = "none";
      });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    if (reduce.matches) {
      gsap.set(".rv, .m-pop", { opacity: 1, y: 0, scale: 1 });
    } else {
      var phone = matchMedia("(max-width: 44.99rem)").matches;

      if (phone) {
        // Phone: the cover assembles top-down, then cards pop in on scroll.
        // No scrubbed parallax - it reads as lag under a finger.
        gsap.from("#mhero .m-claim, #mhero .m-chips", { opacity: 0, y: 14, duration: .6, stagger: .08, ease: "power3.out", delay: .15 });
        gsap.from("#mhero .m-plate", { opacity: 0, y: 26, duration: .8, ease: "power3.out", delay: .3 });
        gsap.from("#mhero .m-name", { opacity: 0, y: 22, duration: .8, ease: "power3.out", delay: .45 });
        gsap.utils.toArray(".m-pop").forEach(function (el, i) {
          gsap.to(el, {
            opacity: 1, y: 0, scale: 1, duration: .7, ease: "power3.out", delay: (i % 4) * .06,
            scrollTrigger: { trigger: el, start: "top 92%", once: true }
          });
        });
      }

      // hero: the giant name rises from the bottom crop, everything else follows
      var tl = gsap.timeline({ delay: .12, paused: phone });
      tl.from(".bigname span", { yPercent: 108, duration: 1.05, stagger: .09, ease: "power4.out" })
        .from(".hero-claim, .aud, .hero-lede", { opacity: 0, y: 18, duration: .7, stagger: .08, ease: "power3.out" }, "-=.65")
        .from(".plate", { opacity: 0, y: 34, duration: .9, ease: "power3.out" }, "-=.8")
        .from(".hero-meta", { opacity: 0, duration: .6 }, "-=.5");

      gsap.utils.toArray(".rv").forEach(function (el) {
        gsap.to(el, {
          opacity: 1, y: 0, duration: .8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        });
      });

      // ghost surname drifts against the scroll
      if (!phone) gsap.to(".ghost", {
        yPercent: -22, xPercent: -6, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .5 }
      });
      if (!phone) gsap.to(".plate", {
        yPercent: -9, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .5 }
      });

      // marquee
      gsap.utils.toArray(".ticker-row").forEach(function (row, i) {
        gsap.to(row, {
          xPercent: i % 2 ? 50 : -50, ease: "none",
          scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: 1 }
        });
      });

      gsap.utils.toArray("[data-count]").forEach(function (el) {
        var o = { v: 0 }, to = +el.dataset.count;
        gsap.to(o, {
          v: to, duration: 1.3, ease: "power2.out", snap: { v: 1 },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: function () { el.textContent = Math.round(o.v) + (el.dataset.suffix || ""); }
        });
      });
    }

    document.querySelectorAll("section[id]").forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: function (s) {
          if (!s.isActive) return;
          document.querySelectorAll(".nav-links a, #tabs a").forEach(function (a) {
            a.classList.toggle("on", a.getAttribute("href") === "#" + sec.id);
          });
        }
      });
    });
  });

  init("carousel", function () {
    var track = document.getElementById("cap-track");
    var count = document.getElementById("cap-count");
    if (!track) return;
    var items = track.children;
    if (!items.length) return;

    function step() {
      var a = items[0].getBoundingClientRect();
      var b = items[1] ? items[1].getBoundingClientRect() : null;
      return b ? (b.left - a.left) : a.width + 16;
    }
    function current() {
      return Math.min(items.length - 1, Math.max(0, Math.round(track.scrollLeft / step())));
    }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function sync() {
      if (count) count.textContent = pad(current() + 1) + " / " + pad(items.length);
    }
    document.querySelectorAll("[data-cap]").forEach(function (b) {
      b.addEventListener("click", function () {
        var dir = b.dataset.cap === "next" ? 1 : -1;
        track.scrollTo({
          left: (current() + dir) * step(),
          behavior: reduce.matches ? "auto" : "smooth"
        });
      });
    });
    track.addEventListener("scroll", function () {
      clearTimeout(track._t);
      track._t = setTimeout(sync, 90);
    }, { passive: true });
    sync();
  });

  init("year", function () {
    var y = document.getElementById("yr");
    if (y) y.textContent = new Date().getFullYear();
    // Every visible year, not just the footer's: the hero copies carry no id.
    document.querySelectorAll(".js-year").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
    // Every experience figure, in both layouts. Only the desktop one had an id,
    // so the mobile rails sat frozen at their hardcoded 10.
    var years = String(new Date().getFullYear() - CAREER_START);
    document.querySelectorAll(".js-exp").forEach(function (el) {
      el.dataset.count = years;
      if (!el.dataset.animated) el.textContent = years + (el.dataset.suffix || "");
    });
  });
})();
