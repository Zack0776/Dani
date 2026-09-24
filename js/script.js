/* =========================================================
   DANI PINHEIRO — CONSULTORIA CORPORATIVA
   script.js — preloader, smooth scroll, menu, animações
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- PRELOADER ---------- */
  window.addEventListener("load", function () {
    var pre = document.getElementById("preloader");
    var label = document.getElementById("preloader-label");
    setTimeout(function () { if (label) label.textContent = "Dani Pinheiro"; }, 550);
    setTimeout(function () {
      pre.classList.add("done");
      document.body.style.overflow = "";
    }, 1100);
  });
  document.body.style.overflow = "hidden";
  setTimeout(function(){ document.body.style.overflow = ""; }, 2200);

  /* ---------- SMOOTH SCROLL (Lenis) ---------- */
  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- HEADER SCROLL STATE ---------- */
  var header = document.getElementById("site-header");
  function onScroll() {
    if (window.scrollY > 60) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- MOBILE MENU ---------- */
  var toggle = document.getElementById("menu-toggle");
  var navLinks = document.querySelector(".nav-links");
  toggle.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll("[data-nav]").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("open");
      toggle.classList.remove("open");
    });
  });

  /* ---------- SMOOTH ANCHOR SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -20 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- WRAP LINES FOR REVEAL-BY-LINE ---------- */
  document.querySelectorAll("[data-reveal-lines]").forEach(function (block) {
    block.querySelectorAll(".line").forEach(function (line) {
      var text = line.textContent;
      line.textContent = "";
      var inner = document.createElement("span");
      inner.className = "js-line-inner";
      inner.textContent = text;
      line.appendChild(inner);
    });
  });

  /* ---------- INTERSECTION REVEAL ---------- */
  var revealTargets = document.querySelectorAll("[data-reveal], [data-reveal-lines], [data-mask-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- HERO ENTRANCE (orchestrated, once) ---------- */
  window.addEventListener("load", function () {
    if (reduceMotion || !window.gsap) {
      document.querySelectorAll("#hero [data-reveal]").forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var tl = gsap.timeline({ delay: 1.0, defaults: { ease: "power3.out" } });
    tl.to("#hero-img", { scale: 1, duration: 2.2, ease: "power2.out" }, 0)
      .add(function () {
        document.querySelectorAll("#hero [data-reveal-lines] .js-line-inner").forEach(function (el, i) {
          gsap.to(el, { y: "0%", duration: 1.1, delay: i * 0.08, ease: "power3.out" });
        });
      }, 0.2)
      .to(".hero-dap-mark", { opacity: 1, y: 0, duration: 0.8 }, 0.05)
      .to(".hero-signature", { opacity: 1, y: 0, duration: 0.9 }, 0.15)
      .to(".hero-sub", { opacity: 1, y: 0, duration: 0.9 }, 0.75)
      .to(".hero-actions", { opacity: 1, y: 0, duration: 0.9 }, 0.95);

    gsap.set(".hero-dap-mark, .hero-signature, .hero-sub, .hero-actions", { opacity: 0, y: 20 });
    tl.eventCallback("onStart", function () {
      gsap.set(".hero-dap-mark, .hero-signature, .hero-sub, .hero-actions", { opacity: 0, y: 20 });
    });
  });

  /* ---------- PARALLAX + SUBTLE ZOOM (GSAP ScrollTrigger) ---------- */
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("[data-parallax] img").forEach(function (img) {
      gsap.fromTo(
        img,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: img,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    });

    document.querySelectorAll(".exp-card img, .servico-card, .quote-media img").forEach(function (el) {
      gsap.fromTo(
        el,
        { scale: 1.06 },
        {
          scale: 1,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%" }
        }
      );
    });

    ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: function (self) {
        gsap.set(".hero-media img", { scale: 1.08 + self.progress * 0.08 });
      }
    });

    /* ---------- DAP METHOD: step-by-step reveal ---------- */
    document.querySelectorAll("[data-dap-step]").forEach(function (step) {
      ScrollTrigger.create({
        trigger: step,
        start: "top 65%",
        end: "bottom 55%",
        onEnter: function () { step.classList.add("is-active"); },
        onEnterBack: function () { step.classList.add("is-active"); },
        onLeave: function () { step.classList.remove("is-active"); },
        onLeaveBack: function () { step.classList.remove("is-active"); }
      });
    });

    gsap.to(".dap-mark-bg", {
      yPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: "#dap", start: "top bottom", end: "bottom top", scrub: true }
    });
  } else {
    document.querySelectorAll("[data-dap-step]").forEach(function (step) { step.classList.add("is-active"); });
  }
})();
