/* ==========================================================================
   Maverick Expeditions — site behaviour
   Vanilla ES2019. No dependencies, no build step.

     1.  Smooth scroll
     2.  Preloader
     3.  Hero — pinned, scroll-scrubbed timeline
     4.  Reveal animations
     5.  Circular gallery fan-out
     6.  Sticky header
     7.  Mobile drawer
     8.  FAQ accordion
     9.  Highlights carousel
     10. Looping tour columns
     11. Newsletter form
     12. Back-to-top + current year
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var clamp = function (v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  };

  /* 1. Smooth scroll ------------------------------------------------------- */

  /* Momentum scrolling that still moves the real scroll position, so
     `position: sticky` (which the hero pin depends on), anchor links, the
     scrollbar and devtools all keep working. Wheel input feeds a target and a
     rAF loop eases the window toward it.

     Deliberately off for touch (native inertia is better), for reduced-motion,
     and inside any element marked [data-native-scroll]. */

  var smooth = {
    active: false,
    target: 0,
    ease: 0.12,
    raf: 0
  };

  function scrollMax() {
    return Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
  }

  function initSmoothScroll() {
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion || coarse) return;

    smooth.target = window.scrollY;

    /* last position this loop wrote, so we can tell our own scrolling apart
       from anyone else's */
    var written = -1;

    function stop() {
      smooth.active = false;
      smooth.raf = 0;
      written = -1;
    }

    function step() {
      var y = window.scrollY;

      /* Something outside this loop moved the page — scrollIntoView, a focused
         field, find-in-page, the scrollbar. Yield to it instead of dragging
         the page back to our stale target. */
      if (written >= 0 && Math.abs(y - written) > 4) {
        smooth.target = y;
        stop();
        return;
      }

      var diff = smooth.target - y;

      /* close enough — hand control back so native scrolling stays responsive */
      if (Math.abs(diff) < 0.5) {
        window.scrollTo(0, smooth.target);
        stop();
        return;
      }

      window.scrollTo(0, y + diff * smooth.ease);
      written = window.scrollY;
      smooth.raf = requestAnimationFrame(step);
    }

    function start() {
      if (smooth.active) return;
      smooth.active = true;
      smooth.raf = requestAnimationFrame(step);
    }

    window.addEventListener(
      "wheel",
      function (e) {
        if (e.ctrlKey) return;                       // pinch-zoom
        if (e.target.closest && e.target.closest("[data-native-scroll]")) return;
        if (document.body.classList.contains("is-locked")) return;

        e.preventDefault();

        // deltaMode 1 = lines, 2 = pages
        var delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 16;
        else if (e.deltaMode === 2) delta *= window.innerHeight;

        smooth.target = clamp(smooth.target + delta, 0, scrollMax());
        start();
      },
      { passive: false }
    );

    /* keyboard, scrollbar drag, find-in-page and anchor jumps all move the
       window directly — resync so the next wheel tick starts from there */
    window.addEventListener(
      "scroll",
      function () {
        if (!smooth.active) smooth.target = window.scrollY;
      },
      { passive: true }
    );

    window.addEventListener("resize", function () {
      smooth.target = clamp(smooth.target, 0, scrollMax());
    });
  }

  /* Used by anchor links and back-to-top. Keeps `smooth.target` in step so a
     wheel tick mid-flight does not snap the page back. */
  function scrollToY(y) {
    y = clamp(y, 0, scrollMax());
    if (smooth.raf) {
      cancelAnimationFrame(smooth.raf);
      smooth.raf = 0;
      smooth.active = false;
    }
    smooth.target = y;
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function initAnchors() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var header = $(".header");
      var offset = header ? header.offsetHeight : 0;
      scrollToY(window.scrollY + el.getBoundingClientRect().top - offset + 1);
    });
  }

  /* 2. Preloader ---------------------------------------------------------- */

  function initPreloader() {
    var el = $("[data-preloader]");
    if (!el) return;
    var hide = function () {
      setTimeout(function () {
        el.classList.add("is-loaded");
      }, 60);
    };
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide);
    // never leave the page covered if something stalls
    setTimeout(hide, 6000);
  }

  /* 3. Hero — pinned, scroll-scrubbed timeline ---------------------------- */

  /* Three scenes over one timeline, scrubbed by scroll position:

       t 0.0 → 1.2   the centre card rises into frame
       t 1.2 → 2.2   eyebrow out, headline in, six side cards fan outward
       t 2.2 → 3.2   everything drops to a bottom row, CTA fades up

     Every stop below is [time, value]; `track` linearly interpolates between
     them. Distances are in viewport units so the composition holds at any
     window size, matching the reference build's vw/vh choreography. */

  var T_END = 3.2;
  var SCENE3 = 1.2;
  var SCENE4 = 2.2;

  /* selector: [x stops (vw), y stops (vh, or 'h' = card heights), scale stops] */
  var HERO_CARDS = {
    ".img-5": { s3: [-17.5, 42, 0.499], s4: [-43.5, 43, 0.33] },
    ".img-1": { s3: [-37.5, 15, 0.499], s4: [-33.8, 39, 0.35] },
    ".img-2": { s3: [-23.3, -40, 0.499], s4: [-22.7, 51, 0.43] },
    ".img-3": { s3: [23, -40, 0.499], s4: [22.7, 51, 0.43] },
    ".img-4": { s3: [37, 15, 0.499], s4: [33.8, 39, 0.35] },
    ".img-6": { s3: [20, 42, 0.499], s4: [43.5, 43, 0.33] }
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* progress of `t` through [from, to], clamped to 0..1 */
  function span(t, from, to) {
    return clamp((t - from) / (to - from), 0, 1);
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 2);
  }

  function initHero() {
    var hero = $("[data-hero]");
    if (!hero) return;

    var gallery = $("[data-hero-gallery]", hero);
    var text = $("[data-hero-text]", hero);
    var title1 = $("[data-hero-title1]", hero);
    var title2 = $("[data-hero-title2]", hero);
    var cta = $("[data-hero-cta]", hero);
    var hint = $("[data-hero-hint]", hero);
    var centre = $(".img-center", hero);
    var captions = $$(".img-caption", hero);

    var sides = Object.keys(HERO_CARDS).map(function (sel) {
      return { el: $(sel, hero), spec: HERO_CARDS[sel] };
    }).filter(function (o) {
      return o.el;
    });

    var pinned = false;

    function isPinned() {
      return window.innerWidth > 1024 && !reduceMotion;
    }

    /* below the breakpoint the CSS lays the hero out statically, so strip
       every inline transform this function may have written */
    function clearInline() {
      [text, title1, title2, cta, centre].forEach(function (el) {
        if (!el) return;
        el.style.cssText = "";
      });
      sides.forEach(function (o) {
        o.el.style.cssText = "";
      });
      captions.forEach(function (c) {
        c.style.cssText = "";
      });
      if (hint) hint.style.opacity = "";
    }

    function render() {
      if (!isPinned()) {
        if (pinned) {
          clearInline();
          pinned = false;
        }
        return;
      }
      pinned = true;

      var vh = window.innerHeight;
      var vw = window.innerWidth;
      var rect = hero.getBoundingClientRect();
      var distance = hero.offsetHeight - vh;
      var p = distance > 0 ? clamp(-rect.top / distance, 0, 1) : 0;
      var t = p * T_END;

      /* scene 1 — centre card rises (100% of its own height → 0) */
      var rise = easeOut(span(t, 0, SCENE3));
      var s3 = span(t, SCENE3, SCENE4);
      var s4 = span(t, SCENE4, T_END);

      if (centre) {
        var cy, cx = 0, cs = 1;
        if (t < SCENE3) {
          cy = lerp(centre.offsetHeight, 0, rise);
        } else if (t < SCENE4) {
          cy = lerp(0, -0.35 * vh, s3);
          cs = lerp(1, 0.499, s3);
        } else {
          cy = lerp(-0.35 * vh, 0.56 * vh, s4);
          cs = lerp(0.499, 1.27, s4);
        }
        centre.style.opacity = String(rise);
        centre.style.transform =
          "translate3d(" + cx + "px," + cy + "px,0) scale(" + cs + ")";
      }

      /* scene 2 — the six side cards appear and fan out */
      sides.forEach(function (o) {
        var el = o.el;
        if (t < SCENE3) {
          el.style.opacity = "0";
          el.style.transform = "translate3d(0," + el.offsetHeight + "px,0)";
          return;
        }
        el.style.opacity = "1";
        var a = o.spec.s3;
        var b = o.spec.s4;
        var x, y, sc;
        if (t < SCENE4) {
          x = lerp(0, (a[0] / 100) * vw, s3);
          y = lerp(0, (a[1] / 100) * vh, s3);
          sc = lerp(1, a[2], s3);
        } else {
          x = lerp((a[0] / 100) * vw, (b[0] / 100) * vw, s4);
          y = lerp((a[1] / 100) * vh, (b[1] / 100) * vh, s4);
          sc = lerp(a[2], b[2], s4);
        }
        el.style.transform =
          "translate3d(" + x + "px," + y + "px,0) scale(" + sc + ")";
      });

      /* headline swap */
      if (title1) {
        title1.style.opacity = String(1 - s3);
        title1.style.transform =
          "translate(-50%,-50%) translateY(" + -0.1 * vh * s3 + "px)";
      }
      if (title2) {
        title2.style.opacity = String(s3);
        title2.style.visibility = s3 > 0 ? "visible" : "hidden";
        title2.style.transform =
          "translate(" + -50 * s3 + "%," + -20 * s3 + "%)";
      }

      /* captions fade in with the fan, back out as the row settles */
      var capOpacity = s3 * (1 - s4);
      var capScale = lerp(0.8, 1, s3);
      captions.forEach(function (c) {
        c.style.opacity = String(capOpacity);
        c.style.transform =
          "translateX(-50%) scale(" + capScale + ")";
      });

      /* scene 3 — copy lifts, CTA arrives */
      if (text) {
        text.style.transform =
          "translate(-50%,-50%) translateY(" + -0.3 * vh * s4 + "px)";
      }
      if (cta) {
        cta.style.opacity = String(s4);
        cta.style.visibility = s4 > 0 ? "visible" : "hidden";
      }
      if (hint) hint.style.opacity = String(clamp(1 - p * 6, 0, 1));
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        render();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    render();
  }

  /* 4. Reveal animations --------------------------------------------------- */

  /* `.wow` elements are hidden until they scroll in, then `.animated` starts
     whichever named keyframe animation their class names to. */
  function initReveals() {
    var targets = $$(".wow, .reveal");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("animated", "is-visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("animated", "is-visible");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* 5. Circular gallery fan-out -------------------------------------------- */

  function initWheel() {
    var wheel = $("[data-wheel]");
    if (!wheel) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      wheel.classList.add("is-fanned");
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-fanned");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );
    io.observe(wheel);
  }

  /* 6. Sticky header ------------------------------------------------------- */

  function initHeader() {
    var header = $(".header");
    if (!header) return;
    var last = 0;

    window.addEventListener(
      "scroll",
      function () {
        var y = window.scrollY;
        header.classList.toggle("is-stuck", y > 40);
        // hide on the way down, reveal on the way up
        header.classList.toggle("is-hidden", y > 400 && y > last);
        last = y;
      },
      { passive: true }
    );
  }

  /* 7. Mobile drawer ------------------------------------------------------- */

  function initDrawer() {
    var drawer = $("[data-drawer]");
    var backdrop = $("[data-backdrop]");
    var openBtn = $("[data-drawer-open]");
    if (!drawer || !backdrop || !openBtn) return;

    function setOpen(open) {
      drawer.setAttribute("data-open", String(open));
      backdrop.setAttribute("data-open", String(open));
      openBtn.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("is-locked", open);
      if (open) {
        var first = drawer.querySelector("a, button");
        if (first) first.focus();
      } else {
        openBtn.focus();
      }
    }

    openBtn.addEventListener("click", function () {
      setOpen(drawer.getAttribute("data-open") !== "true");
    });
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });
    $$("[data-drawer-close]", drawer).forEach(function (el) {
      el.addEventListener("click", function () {
        setOpen(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.getAttribute("data-open") === "true") {
        setOpen(false);
      }
    });
  }

  /* 8. FAQ accordion ------------------------------------------------------- */

  function initAccordion() {
    $$("[data-accordion]").forEach(function (root) {
      var items = $$(".accordion__item", root);

      root.addEventListener("click", function (e) {
        var trigger = e.target.closest(".accordion__trigger");
        if (!trigger || !root.contains(trigger)) return;

        var item = trigger.closest(".accordion__item");
        var willOpen = item.getAttribute("data-open") !== "true";

        items.forEach(function (other) {
          var open = other === item && willOpen;
          other.setAttribute("data-open", String(open));
          var btn = $(".accordion__trigger", other);
          var sign = $(".accordion__sign", other);
          btn.setAttribute("aria-expanded", String(open));
          if (sign) sign.textContent = open ? "−" : "+";
        });
      });
    });
  }

  /* 9. Highlights carousel ------------------------------------------------- */

  function initCarousel() {
    $$("[data-carousel]").forEach(function (root) {
      var track = $("[data-carousel-track]", root);
      var slides = track ? track.children : [];
      if (!track || !slides.length) return;

      var scope = root.closest("section") || document;
      var prev = $("[data-carousel-prev]", scope);
      var next = $("[data-carousel-next]", scope);
      var index = 0;

      function perView() {
        var viewport = $(".carousel__viewport", root);
        return Math.max(
          1,
          Math.round(
            viewport.getBoundingClientRect().width /
              slides[0].getBoundingClientRect().width
          )
        );
      }

      function maxIndex() {
        return Math.max(0, slides.length - perView());
      }

      function render() {
        index = Math.min(index, maxIndex());
        var gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
        var step = slides[0].getBoundingClientRect().width + gap;
        track.style.transform = "translate3d(" + -index * step + "px,0,0)";
        if (prev) prev.disabled = index === 0;
        if (next) next.disabled = index >= maxIndex();
      }

      function go(delta) {
        index = clamp(index + delta, 0, maxIndex());
        render();
      }

      if (prev) prev.addEventListener("click", function () { go(-1); });
      if (next) next.addEventListener("click", function () { go(1); });

      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      });

      var startX = null;
      root.addEventListener("touchstart", function (e) {
        startX = e.touches[0].clientX;
      }, { passive: true });
      root.addEventListener("touchend", function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        startX = null;
      }, { passive: true });

      var timer;
      window.addEventListener("resize", function () {
        clearTimeout(timer);
        timer = setTimeout(render, 150);
      });

      render();
    });
  }

  /* 10. Looping tour columns ------------------------------------------------ */

  /* The CSS animation translates each track by -50%, so the markup needs the
     cards duplicated once for the loop to be seamless. Cloning here keeps the
     HTML free of copy-pasted duplicates. */
  function initTicker() {
    if (reduceMotion) return;

    $$("[data-ticker-track]").forEach(function (track) {
      Array.prototype.slice.call(track.children).forEach(function (node) {
        var clone = node.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        $$("a", clone).forEach(function (a) {
          a.setAttribute("tabindex", "-1");
        });
        /* The track scrolls under its own animation rather than with the page,
           so a lazy clone can still be undecoded when it slides into view and
           flash as an empty card. Load clones straight away. */
        $$("img", clone).forEach(function (img) {
          img.setAttribute("loading", "eager");
        });
        track.appendChild(clone);
      });
    });
  }

  /* 11. Newsletter form ---------------------------------------------------- */

  function initNewsletter() {
    var form = $("[data-newsletter]");
    var note = $("[data-newsletter-note]");
    if (!form || !note) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input[type=email]", form);
      var value = (input.value || "").trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        note.textContent = "Please enter a valid email address.";
        note.style.color = "#ff9b8a";
        input.focus();
        return;
      }

      /* No backend on a static build — wire this to your mail service. */
      note.textContent = "Thanks! We'll be in touch at " + value + ".";
      note.style.color = "var(--lime)";
      form.reset();
    });
  }

  /* 12. Back-to-top + current year ----------------------------------------- */

  function initChrome() {
    var btn = $("[data-to-top]");
    if (btn) {
      var onScroll = function () {
        btn.setAttribute("data-visible", String(window.scrollY > 600));
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      btn.addEventListener("click", function () {
        scrollToY(0);
      });
      onScroll();
    }

    var year = $("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* boot ------------------------------------------------------------------- */

  function init() {
    initSmoothScroll();
    initAnchors();
    initPreloader();
    initHero();
    initReveals();
    initWheel();
    initHeader();
    initDrawer();
    initAccordion();
    initTicker();
    initCarousel();
    initNewsletter();
    initChrome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
