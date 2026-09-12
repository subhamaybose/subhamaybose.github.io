/* DESIGN A — Nightshift
   GSAP + ScrollTrigger for scrubbed scroll, Lenis for smooth scroll,
   Three.js for the cursor-reactive node field behind the hero.
   Everything degrades: no JS, no WebGL and reduced-motion all leave a
   readable, complete page. */
(function () {
  "use strict";

  var CAREER_START = 2016;   // first professional role

  var reduce = matchMedia("(prefers-reduced-motion: reduce)");
  var fine = matchMedia("(hover: hover) and (pointer: fine)");
  var hasGSAP = typeof window.gsap !== "undefined";

  function init(name, fn) {
    try { fn(); } catch (e) { console.warn("[a] " + name, e); }
  }

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  init("lenis", function () {
    if (reduce.matches || typeof window.Lenis === "undefined") return;
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  });

  /* ---------- Custom cursor + magnetic targets ---------- */
  init("cursor", function () {
    if (!fine.matches || reduce.matches || !hasGSAP) return;
    var ring = document.getElementById("cur");
    var dot = document.getElementById("cur-dot");
    if (!ring || !dot) return;
    var rx = gsap.quickTo(ring, "x", { duration: .5, ease: "power3" });
    var ry = gsap.quickTo(ring, "y", { duration: .5, ease: "power3" });
    var dx = gsap.quickTo(dot, "x", { duration: .12, ease: "power3" });
    var dy = gsap.quickTo(dot, "y", { duration: .12, ease: "power3" });
    var shown = false;
    addEventListener("pointermove", function (e) {
      // stays hidden until the pointer actually moves, otherwise the ring
      // renders parked at 0,0 in the corner on load
      if (!shown) { shown = true; ring.style.opacity = 1; dot.style.opacity = 1; }
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });

    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("pointerenter", function () { gsap.to(ring, { scale: 1.75, duration: .3 }); });
      el.addEventListener("pointerleave", function () { gsap.to(ring, { scale: 1, duration: .3 }); });
    });

    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      var mx = gsap.quickTo(el, "x", { duration: .5, ease: "power3" });
      var my = gsap.quickTo(el, "y", { duration: .5, ease: "power3" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * .28);
        my((e.clientY - (r.top + r.height / 2)) * .45);
      });
      el.addEventListener("pointerleave", function () { mx(0); my(0); });
    });
  });

  /* ---------- Hero light follows the pointer ---------- */
  init("glow", function () {
    var glow = document.querySelector(".glow");
    var hero = document.getElementById("hero");
    if (!glow || !hero || !fine.matches || reduce.matches) return;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      glow.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      glow.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }, { passive: true });
  });

  /* ---------- Three.js node field ---------- */
  init("field", function () {
    var host = document.getElementById("field");
    if (!host || reduce.matches || typeof window.THREE === "undefined") return;

    var w = host.clientWidth, h = host.clientHeight;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setSize(w, h);
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
    cam.position.z = 620;

    // a sparse constellation — distributed systems, not confetti
    var COUNT = window.innerWidth < 800 ? 90 : 170;
    var pos = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - .5) * 1500;
      pos[i * 3 + 1] = (Math.random() - .5) * 900;
      pos[i * 3 + 2] = (Math.random() - .5) * 600;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var ptMat = new THREE.PointsMaterial({
      size: 2.6, transparent: true, depthWrite: false
    });
    var pts = new THREE.Points(geo, ptMat);
    scene.add(pts);

    // link nearby nodes
    var lp = [];
    for (var a = 0; a < COUNT; a++) {
      for (var b = a + 1; b < COUNT; b++) {
        var dx2 = pos[a * 3] - pos[b * 3], dy2 = pos[a * 3 + 1] - pos[b * 3 + 1], dz2 = pos[a * 3 + 2] - pos[b * 3 + 2];
        if (dx2 * dx2 + dy2 * dy2 + dz2 * dz2 < 32000) {
          lp.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
        }
      }
    }
    var lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lp), 3));
    var lnMat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
    scene.add(new THREE.LineSegments(lgeo, lnMat));

    /* Dark: amber ADDED to black is the glow. Light: the same addition washes
       every node out to paper, so the field switches to normal blending and a
       warm ink that reads as drawn marks instead. */
    function paintField(theme) {
      var light = theme === "light";
      ptMat.color.setHex(light ? 0x8A5109 : 0xF0A428);
      ptMat.opacity = light ? .55 : .85;
      ptMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      lnMat.color.setHex(light ? 0x93540A : 0xD98510);
      lnMat.opacity = light ? .16 : .17;
      lnMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      ptMat.needsUpdate = lnMat.needsUpdate = true;
    }
    paintField(document.documentElement.getAttribute("data-theme"));
    document.addEventListener("themechange", function (e) { paintField(e.detail.theme); });

    var tx = 0, ty = 0, running = true;
    addEventListener("pointermove", function (e) {
      tx = (e.clientX / innerWidth - .5) * .5;
      ty = (e.clientY / innerHeight - .5) * .35;
    }, { passive: true });

    // stop drawing when the hero is off screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { running = en[0].isIntersecting; })
        .observe(host);
    }

    var clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!running) return;
      var t = clock.getElapsedTime();
      scene.rotation.y += ((tx + t * .02) - scene.rotation.y) * .04;
      scene.rotation.x += (ty - scene.rotation.x) * .04;
      renderer.render(scene, cam);
    })();

    addEventListener("resize", function () {
      w = host.clientWidth; h = host.clientHeight;
      cam.aspect = w / h; cam.updateProjectionMatrix(); renderer.setSize(w, h);
    }, { passive: true });
  });

  /* ---------- Browser chrome follows the theme ---------- */
  init("theme-color", function () {
    var tag = document.querySelector('meta[name="theme-color"]');
    if (!tag) return;
    // Static in the markup so the FIRST paint is right; updated here because a
    // <meta> cannot carry two values and this page's theme is a stored choice,
    // not the OS preference a `media` attribute would follow.
    function paint(theme) { tag.setAttribute("content", theme === "light" ? "#FBF6EC" : "#08080A"); }
    paint(document.documentElement.getAttribute("data-theme"));
    document.addEventListener("themechange", function (e) { paint(e.detail.theme); });
  });

  /* ---------- Share: reveals the social links ---------- */
  init("share", function () {
    var btn = document.getElementById("share");
    var menu = document.getElementById("share-menu");
    if (!btn || !menu) return;

    function open(state) {
      menu.hidden = !state;
      btn.setAttribute("aria-expanded", String(state));
      btn.setAttribute("aria-label", state ? "Hide social links" : "Show social links");
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      open(menu.hidden);
      if (!menu.hidden) { var a = menu.querySelector("a"); if (a) a.focus(); }
    });
    /* "Share this site": the native sheet on a phone (WhatsApp, Telegram,
       Mail...), a clipboard copy on a desktop that has no sheet. The receiving
       app builds its own preview by fetching the URL, so the card people see is
       whatever the OG tags in <head> say - nothing to pass here but the link.
       location without the hash, so a visitor deep in #contact does not share
       an anchored URL. navigator.share needs HTTPS and a real user gesture;
       both hold for a click on this button on the live site. */
    var doBtn = document.getElementById("share-site");
    if (doBtn) {
      var label = doBtn.querySelector("span");
      // Gated on POINTER, not just on the API existing. Edge and Chrome on
      // Windows implement navigator.share, so an API-only check opened the
      // clunky Windows share sheet on a desktop, where "copy link" is what
      // people expect. Touch gets the sheet, mouse gets the clipboard; a
      // touchscreen laptop reports coarse and gets the sheet, which is right.
      var canSheet = typeof navigator.share === "function" &&
                     matchMedia("(pointer: coarse)").matches;
      if (!canSheet) label.textContent = "Copy link";

      function flash(text) {
        var prev = canSheet ? "Share this site" : "Copy link";
        label.textContent = text;
        doBtn.classList.add("done");
        setTimeout(function () { label.textContent = prev; doBtn.classList.remove("done"); }, 1900);
      }
      function copy(url) {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(function () { flash("Link copied"); },
                                                  function () { flash("Copy failed"); });
          return;
        }
        // http:// or an older browser - clipboard API is absent there
        var t = document.createElement("textarea");
        t.value = url; t.setAttribute("readonly", "");
        t.style.cssText = "position:fixed;top:-1000px";
        document.body.appendChild(t); t.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(t);
        flash(ok ? "Link copied" : "Copy failed");
      }

      doBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var url = location.origin + location.pathname;
        if (canSheet) {
          navigator.share({ title: document.title, url: url }).then(function () { open(false); },
            function (err) { if (err && err.name !== "AbortError") copy(url); });
        } else {
          copy(url);
        }
      });
    }

    // Click-outside and Escape both close it; without the first, the menu
    // survives a tap anywhere else on the page, which on a phone is most taps.
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) open(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { open(false); btn.focus(); }
    });
    // Tabbing out of the last link should not leave an open menu behind.
    menu.addEventListener("focusout", function (e) {
      if (!menu.contains(e.relatedTarget) && e.relatedTarget !== btn) open(false);
    });
  });

  /* ---------- Audience pills ---------- */
  init("audience", function () {
    var pills = document.querySelectorAll(".aud button, .m-chips button");
    var outs = [document.getElementById("lede"), document.getElementById("mlede")].filter(Boolean);
    if (!pills.length || !outs.length) return;
    var COPY = {
      everyone: "Senior System Engineer and Team Lead at <strong>IBM</strong>, building scalable microservices, hybrid-cloud platforms and AI-driven systems in <strong>Node.js</strong> and <strong>Python</strong>.",
      recruiters: "Ten years in backend and cloud engineering, currently <strong>Team Lead at IBM India</strong>. AWS Certified Developer, Kubernetes and IBM Cloud certified &mdash; <strong>14 credentials</strong>, all independently verifiable.",
      engineers: "I work on <strong>Kafka</strong> event pipelines, <strong>Kubernetes</strong> orchestration and <strong>Elasticsearch</strong> at production scale, and write about the trade-offs behind them &mdash; batch vs stream, sync vs async, SQL vs NoSQL.",
      managers: "I lead a team at IBM delivering hybrid-cloud and AI systems end to end, and I care about the parts that are unglamorous: reliability, observability and <strong>handover that survives the handover</strong>.",
      collaborators: "Always open to a technical conversation &mdash; distributed systems, applied ML, or the architecture behind agentic AI. Eight essays published on system design so far."
    };
    /* The chosen key is read at COMPLETION time, not captured when the tween
       starts. A second tap inside the 220ms fade makes GSAP overwrite the
       first tween, and a killed tween never runs its onComplete - so a
       captured string would be dropped, leaving the copy on the previous
       audience while the pill showed the new one. That is exactly the
       "contents are not changing" report. Reading chosen() at completion
       means the newest choice always lands, however fast the taps come. */
    var chosen = "everyone";
    function chosenCopy() { return COPY[chosen] || COPY.everyone; }

    function pick(btn) {
      chosen = btn.dataset.aud;
      pills.forEach(function (p) {
        p.setAttribute("aria-pressed", String(p.dataset.aud === chosen));
      });
      outs.forEach(function (out) {
        if (!hasGSAP || reduce.matches) { out.innerHTML = chosenCopy(); return; }
        if (out.dataset.fading === "1") return;   // an in-flight fade will pick it up
        out.dataset.fading = "1";
        gsap.to(out, {
          opacity: 0, y: 8, duration: .22, ease: "power2.in", overwrite: "auto",
          onComplete: function () {
            out.dataset.fading = "";
            out.innerHTML = chosenCopy();
            gsap.to(out, { opacity: 1, y: 0, duration: .38, ease: "power2.out", overwrite: "auto" });
          }
        });
      });
    }
    pills.forEach(function (b) { b.addEventListener("click", function () { pick(b); }); });
  });

  /* ---------- Scroll choreography ---------- */
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
      // hero entrance — the name is NOT faded in, it is already painted;
      // only the supporting lines assemble around it
      gsap.from("#hero .eyebrow, #hero .aud, #hero .lede, #hero .hero-cta", {
        opacity: 0, y: 20, duration: .8, stagger: .09, ease: "power3.out", delay: .15
      });
      gsap.from("#hero .chip", {
        opacity: 0, scale: .9, y: 14, duration: .7, stagger: .12, ease: "back.out(1.6)", delay: .55
      });

      gsap.utils.toArray(".rv").forEach(function (el) {
        gsap.to(el, {
          opacity: 1, y: 0, duration: .85, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        });
      });

      var phone = matchMedia("(max-width: 44.99rem)").matches;

      if (phone) {
        // Phone: cards rise and settle as they enter. No parallax - on a touch
        // device a scrubbed transform reads as the page lagging the finger.
        gsap.utils.toArray(".m-pop").forEach(function (el, i) {
          gsap.to(el, {
            opacity: 1, y: 0, scale: 1, duration: .7, ease: "power3.out", delay: (i % 4) * .06,
            scrollTrigger: { trigger: el, start: "top 92%", once: true }
          });
        });
        // the phone hero portrait settles once on load rather than tracking scroll
        gsap.from("#mhero .m-img img", { scale: 1.1, y: 18, duration: 1.4, ease: "power3.out" });
        gsap.from("#mhero .m-body > *", { opacity: 0, y: 16, duration: .7, stagger: .07, ease: "power3.out", delay: .25 });
      }

      // Desktop only: hero figure scrubs upward and scales as you leave
      if (!phone) gsap.to("#hero .hero-figure", {
        yPercent: -12, scale: 1.06, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .6 }
      });
      if (!phone) gsap.to("#field", {
        yPercent: 18, opacity: .15, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: .6 }
      });

      // counters
      gsap.utils.toArray("[data-count]").forEach(function (el) {
        var to = +el.dataset.count;
        var o = { v: 0 };
        gsap.to(o, {
          v: to, duration: 1.4, ease: "power2.out", snap: { v: 1 },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: function () { el.textContent = Math.round(o.v) + (el.dataset.suffix || ""); }
        });
      });
    }

    // nav solid state
    ScrollTrigger.create({
      start: 60, end: 99999,
      onToggle: function (s) { document.getElementById("nav").classList.toggle("solid", s.isActive); }
    });

    // active section for nav + tab bar
    document.querySelectorAll("section[id]").forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: function (s) {
          if (!s.isActive) return;
          document.querySelectorAll('.nav-links a, #tabs a').forEach(function (a) {
            a.classList.toggle("on", a.getAttribute("href") === "#" + sec.id);
          });
        }
      });
    });
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
