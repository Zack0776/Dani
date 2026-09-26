/* =========================================================
   DANI PINHEIRO — CONSULTORIA CORPORATIVA / DAP
   script.js — motor de experiência (vanilla JS, sem libs)
   Arquitetura adaptada de um sistema de referência cinematográfico:
   loading, split-text, reveals com máscara, parallax, cursor
   contextual, botões magnéticos, cards com tilt e navegação —
   tudo redesenhado para a identidade DAP (sem 3D roxo, sem grid de
   trabalho). Cada bloco é isolado: se um falhar, o site continua.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  function guard(fn) { try { fn(); } catch (e) { if (window.console && console.warn) console.warn('[dap]', e); } }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var light = !fine || window.innerWidth < 700; // modo leve: celulares e telas pequenas

  var S = { sy: 0, vh: window.innerHeight, vw: window.innerWidth, tx: 0, ty: 0, mx: 0, my: 0, cx: 0, cy: 0, px: 0, py: 0, vel: 0, speed: 0, last: 0 };

  /* ---------- Texto dividido em palavras / letras (máscara) ---------- */
  function splitText(el, mode) {
    var full = el.textContent.replace(/\s+/g, ' ').trim();
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var txt = ch.textContent;
          if (!txt.trim()) return;
          var frag = document.createDocumentFragment();
          if (mode === 'chars') {
            Array.from(txt.trim()).forEach(function (chr) {
              var s = document.createElement('span');
              s.className = 'c'; s.style.setProperty('--i', i++); s.setAttribute('aria-hidden', 'true'); s.textContent = chr;
              frag.appendChild(s);
            });
          } else {
            txt.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
              var wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = part;
              w.appendChild(wi); frag.appendChild(w);
            });
          }
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
          walk(ch);
        }
      });
    })(el);
    el.classList.add('split');
    if (mode === 'chars') el.classList.add('split--chars');
    var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
    el.appendChild(sr);
  }

  /* ---------- Reveal ao rolar (fade/blur, linha, split, máscara de imagem) ---------- */
  function initReveal() {
    var targets = $$('[data-reveal],[data-line],[data-split]:not([data-hero]),[data-mask-reveal]');
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('in', e.isIntersecting); });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  }

  function initStagger() {
    $$('[data-stagger]').forEach(function (g) {
      var n = parseInt(g.getAttribute('data-stagger'), 10) || 3;
      Array.prototype.slice.call(g.children).forEach(function (c, i) { c.style.setProperty('--i', i % n); });
    });
  }

  /* ---------- Listas com progresso (DAP steps / Benefícios / Método) ---------
     Mesmo princípio: uma trilha vertical que se preenche conforme o bloco
     é rolado, com o item ativo destacado. Reutilizado em 3 seções. ---------- */
  var progressLists = [];
  function registerProgress(containerSel, itemSel, activeClass) {
    var container = $(containerSel);
    if (!container) return;
    var items = $$(itemSel, container);
    if (!items.length) return;
    progressLists.push({ container: container, items: items, activeClass: activeClass || 'is-active', lastP: -1 });
  }
  function updateProgress(now) {
    for (var i = 0; i < progressLists.length; i++) {
      var pl = progressLists[i];
      var r = pl.container.getBoundingClientRect();
      if (r.bottom < -200 || r.top > S.vh + 200) continue;
      var p = clamp((S.vh * 0.8 - r.top) / (r.height + S.vh * 0.1), 0, 1);
      if (Math.abs(p - pl.lastP) < 0.0008) continue;
      pl.lastP = p;
      pl.container.style.setProperty('--p', p.toFixed(4));
      var n = pl.items.length;
      pl.items.forEach(function (el, idx) {
        el.classList.toggle(pl.activeClass, p >= idx / n + 0.006 || (idx === 0 && p > 0.01));
      });
    }
  }

  /* ---------- Parallax por scroll (translateY sutil) ---------- */
  var par = [];
  function measurePar() {
    par.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      p.top = r.top + window.scrollY - p.ty;
      p.h = r.height;
    });
  }
  function initParallax() {
    if (reduced) return;
    $$('[data-parallax]').forEach(function (el) {
      var sk = parseFloat(el.getAttribute('data-parallax-scale')) || 0;
      par.push({ el: el, k: parseFloat(el.getAttribute('data-parallax')) || 0.06, sk: sk, ty: 0, top: 0, h: 0, visible: true });
    });
    measurePar();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { par.forEach(function (p) { if (p.el === e.target) p.visible = e.isIntersecting; }); });
      }, { rootMargin: '200px' });
      par.forEach(function (p) { io.observe(p.el); });
    }
  }

  /* ---------- Scroll suave (sem biblioteca) ---------- */
  var smooth = { on: false, target: 0, current: 0 };
  function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function locked() { return root.classList.contains('is-loading') || root.classList.contains('menu-open'); }
  function initSmooth() {
    if (reduced || !fine) return;
    smooth.on = true;
    smooth.target = smooth.current = window.scrollY;
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented || locked()) return;
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      smooth.target = clamp(smooth.target + dy, 0, maxScroll());
    }, { passive: false });
    window.addEventListener('scroll', function () {
      if (Math.abs(window.scrollY - smooth.current) > 3) { smooth.target = smooth.current = window.scrollY; }
    }, { passive: true });
  }
  function scrollToY(y) {
    y = clamp(y, 0, maxScroll());
    if (smooth.on) smooth.target = y;
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ---------- Cursor contextual (Ver / Abrir / Conhecer) ---------- */
  var cur = null;
  function initCursor() {
    if (!fine || reduced) return;
    root.classList.add('has-cursor');
    var ring = document.createElement('div'); ring.className = 'cursor';
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    document.body.appendChild(ring); document.body.appendChild(dot);
    cur = { ring: ring, dot: dot, x: -100, y: -100, rx: -100, ry: -100 };
    window.addEventListener('pointermove', function (e) {
      cur.x = e.clientX; cur.y = e.clientY;
      dot.style.transform = 'translate3d(' + cur.x + 'px,' + cur.y + 'px,0)';
      root.classList.add('cursor-on');
    }, { passive: true });
    document.addEventListener('mouseleave', function () { root.classList.remove('cursor-on'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) { ring.classList.add('is-link'); ring.textContent = t.getAttribute('data-cursor') || ''; }
    });
    document.addEventListener('pointerout', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]');
      if (t && !t.contains(e.relatedTarget)) { ring.classList.remove('is-link'); ring.textContent = ''; }
    });
  }

  /* ---------- Botões magnéticos ---------- */
  var mags = [];
  function initMagnetic() {
    if (!fine || reduced) return;
    $$('[data-magnetic]').forEach(function (el) {
      var m = { el: el, inner: el.querySelector('.btn__in'), x: 0, y: 0, tx: 0, ty: 0, r: null };
      el.addEventListener('pointerenter', function () { m.r = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', function (e) {
        if (!m.r) m.r = el.getBoundingClientRect();
        m.tx = (e.clientX - (m.r.left + m.r.width / 2)) * 0.24;
        m.ty = (e.clientY - (m.r.top + m.r.height / 2)) * 0.34;
      });
      el.addEventListener('pointerleave', function () { m.tx = m.ty = 0; m.r = null; });
      mags.push(m);
    });
  }
  function updateMagnetic() {
    for (var i = 0; i < mags.length; i++) {
      var m = mags[i];
      if (m.x === m.tx && m.y === m.ty) continue;
      m.x = lerp(m.x, m.tx, 0.16); m.y = lerp(m.y, m.ty, 0.16);
      if (Math.abs(m.x - m.tx) < 0.05) m.x = m.tx;
      if (Math.abs(m.y - m.ty) < 0.05) m.y = m.ty;
      m.el.style.translate = m.x.toFixed(2) + 'px ' + m.y.toFixed(2) + 'px';
      if (m.inner) m.inner.style.translate = (m.x * 0.35).toFixed(2) + 'px ' + (m.y * 0.35).toFixed(2) + 'px';
    }
  }

  /* ---------- Cards com tilt discreto ---------- */
  function initCards() {
    if (!fine || reduced) return;
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card,.tile');
      if (!c) return;
      var r = c.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      if (c.hasAttribute('data-tilt')) {
        c.style.transform = 'rotateX(' + (((y / r.height) - 0.5) * -4).toFixed(2) + 'deg) rotateY(' + (((x / r.width) - 0.5) * 6).toFixed(2) + 'deg)';
      }
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('[data-tilt]');
      if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
    });
  }

  /* ---------- Scroll-fade — elementos que começam apagados/desfocados
     e vão aparecendo de forma contínua conforme o usuário rola até eles ---------- */
  var fadeItems = [];
  function initScrollFade() {
    var els = $$('[data-scroll-fade]');
    if (!els.length) return;
    els.forEach(function (el) {
      if (reduced) { el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none'; return; }
      var item = { el: el, visible: true };
      fadeItems.push(item);
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { item.visible = e.isIntersecting; });
        }, { rootMargin: '90% 0px 15% 0px' });
        io.observe(el);
      }
    });
  }
  function updateScrollFade() {
    if (!fadeItems.length) return;
    fadeItems.forEach(function (item) {
      if (!item.visible) return;
      var r = item.el.getBoundingClientRect();
      var enterStart = S.vh * 0.94, enterEnd = S.vh * 0.4;
      var enter = clamp((enterStart - r.top) / (enterStart - enterEnd), 0, 1);
      var exitFrom = 0, exitTo = -r.height * 0.7 - 40;
      var exit = clamp((r.top - exitTo) / (exitFrom - exitTo), 0, 1);
      var p = Math.min(enter, exit);
      item.el.style.opacity = (0.08 + p * 0.92).toFixed(3);
      var dir = r.top < S.vh * 0.4 ? -1 : 1;
      item.el.style.transform = 'translateY(' + ((1 - p) * 46 * dir).toFixed(1) + 'px) scale(' + (0.96 + p * 0.04).toFixed(3) + ')';
      item.el.style.filter = 'blur(' + ((1 - p) * 6).toFixed(2) + 'px)';
    });
  }

  /* ---------- Navegação, menu mobile, âncoras ---------- */
  var nav = null, menuOpen = false, lastNavY = 0;
  function setMenu(open) {
    menuOpen = open;
    root.classList.toggle('menu-open', open);
    var b = $('#burger'), m = $('#menu');
    if (!b || !m) return;
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    b.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    m.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) nav.classList.remove('is-hidden');
  }
  function initNav() {
    nav = $('#nav');
    var burger = $('#burger');
    if (burger) burger.addEventListener('click', function () { setMenu(!menuOpen); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1000 && menuOpen) setMenu(false); }, { passive: true });

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      scrollToY(id === '#hero' ? 0 : t.getBoundingClientRect().top + window.scrollY - 8);
    });

    if ('IntersectionObserver' in window) {
      var links = $$('.nav__links a[data-nav]');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) {
            if (l.getAttribute('href') === '#' + e.target.id) l.setAttribute('aria-current', 'true');
            else l.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('#sobre,#dap,#servicos,#experiencia,#produtos,#contato').forEach(function (s) { io.observe(s); });
    }
  }
  function updateNav(sy) {
    if (!nav) return;
    nav.classList.toggle('is-solid', sy > 30);
    var d = sy - lastNavY;
    if (Math.abs(d) > 6) {
      if (!menuOpen) nav.classList.toggle('is-hidden', d > 0 && sy > 200);
      lastNavY = sy;
    }
  }

  /* ---------- Loop principal (1 único requestAnimationFrame) ---------- */
  var heroEl = null, heroMouse = [];
  function frame(now) {
    window.requestAnimationFrame(frame);
    try { step(now); } catch (e) {}
  }
  function step(now) {
    var dt = Math.min(64, now - (S.last || now)); S.last = now;

    if (smooth.on) {
      var d = smooth.target - smooth.current;
      if (Math.abs(d) > 0.1) {
        smooth.current += d * (1 - Math.pow(0.915, Math.min(dt, 100) / 16.67));
        window.scrollTo(0, smooth.current);
      }
    }
    var sy = window.scrollY || 0; S.sy = sy;

    S.mx = lerp(S.mx, S.tx, 0.06); S.my = lerp(S.my, S.ty, 0.06);
    S.cx = lerp(S.cx, S.px, 0.1); S.cy = lerp(S.cy, S.py, 0.1);

    if (heroEl && sy < S.vh * 1.2) {
      heroEl.style.setProperty('--lx', (50 + S.cx * 0.01).toFixed(1) + '%');
      heroEl.style.setProperty('--ly', (40 + S.cy * 0.01).toFixed(1) + '%');
      if (!reduced && fine) {
        heroMouse.forEach(function (el) {
          var k = parseFloat(el.getAttribute('data-mouse')) || 0;
          el.style.translate = (S.mx * k).toFixed(2) + 'px ' + (S.my * k * 0.6 - sy * 0.03).toFixed(2) + 'px';
        });
      }
      if (!reduced) {
        var hp = clamp(sy / (S.vh * 0.92), 0, 1);
        heroEl.style.setProperty('--hero-p', hp.toFixed(4));
      }
    }

    updateScrollFade();

    for (var q = 0; q < par.length; q++) {
      var p = par[q];
      if (!p.visible) continue;
      var ty = (sy + S.vh / 2 - (p.top + p.h / 2)) * -p.k;
      p.ty = ty;
      if (p.sk) {
        var s = 1 + Math.min(Math.abs(ty), 260) * p.sk * 0.001;
        p.el.style.transform = 'translateY(' + ty.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
      } else {
        p.el.style.translate = '0 ' + ty.toFixed(1) + 'px';
      }
    }

    updateProgress(now);
    updateMagnetic();
    updateNav(sy);
    if (cur) {
      cur.rx = lerp(cur.rx, cur.x, 0.18); cur.ry = lerp(cur.ry, cur.y, 0.18);
      cur.ring.style.transform = 'translate3d(' + cur.rx.toFixed(1) + 'px,' + cur.ry.toFixed(1) + 'px,0)';
    }
  }

  /* ---------- Loading cinematográfico DAP ---------- */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function runLoader() {
    return new Promise(function (resolve) {
      var ld = $('#loader'), bar = $('#ld-bar'), pct = $('#ld-pct');
      if (!ld || !bar || !pct) { resolve(); return; }
      var dur = light ? 2000 : 2600, t0 = performance.now(), done = false;
      var ease = function (t) { return t < 0.72 ? Math.pow(t / 0.72, 0.85) * 0.8 : 0.8 + (1 - Math.pow(1 - (t - 0.72) / 0.28, 3)) * 0.2; };
      (function tick(now) {
        if (done) return;
        var t = clamp((now - t0) / dur, 0, 1), v = ease(t);
        bar.style.transform = 'scaleX(' + v.toFixed(4) + ')';
        var n = Math.round(v * 100);
        pct.textContent = (n < 10 ? '0' : '') + n + '%';
        if (t < 1) window.requestAnimationFrame(tick);
        else finish();
      })(t0);
      setTimeout(function () { bar.style.transform = 'scaleX(1)'; pct.textContent = '100%'; finish(); }, dur + 1400);

      function finish() {
        if (done) return;
        done = true;
        var fonts = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, sleep(1100)]) : Promise.resolve();
        fonts.then(function () { return sleep(340); }).then(function () {
          ld.classList.add('is-out');
          try { sessionStorage.setItem('dap:loaded', '1'); } catch (e) {}
          return sleep(560);
        }).then(function () {
          resolve();
          return sleep(1200);
        }).then(function () {
          root.classList.remove('is-loading');
          if (ld.parentNode) ld.parentNode.removeChild(ld);
        });
      }
    });
  }

  function setReady() {
    if (window.__dap) window.__dap.ready = true;
    root.classList.add('is-ready');
    $$('[data-hero]').forEach(function (e) { e.classList.add('in'); });
    setTimeout(function () {
      $$('[data-intro]').forEach(function (e) { e.removeAttribute('data-intro'); });
    }, 5000);
  }

  /* ---------- Boot ---------- */
  function boot() {
    if (window.__dap) window.__dap.booted = true;
    try {
      heroEl = $('#hero');
      heroMouse = heroEl ? $$('[data-mouse]', heroEl) : [];
      var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

      guard(function () { $$('[data-split]').forEach(function (el) { splitText(el, el.getAttribute('data-split') === 'chars' ? 'chars' : 'words'); }); });
      guard(initStagger);
      guard(initReveal);
      guard(initParallax);
      guard(initNav);
      guard(initCursor);
      guard(initMagnetic);
      guard(initCards);
      guard(initSmooth);
      guard(initScrollFade);
      guard(function () {
        registerProgress('.dap-steps', '.dap-step', 'is-active');
        registerProgress('.beneficios-list', '.beneficios-list li', 'is-active');
        registerProgress('.metodo-track', '.metodo-stage', 'is-active');
      });

      guard(function () {
        window.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          S.px = e.clientX; S.py = e.clientY;
          S.tx = (e.clientX / S.vw - 0.5) * 2;
          S.ty = (e.clientY / S.vh - 0.5) * 2;
        }, { passive: true });
        S.px = S.cx = S.vw / 2; S.py = S.cy = S.vh * 0.46;
        window.addEventListener('resize', function () {
          S.vw = window.innerWidth; S.vh = window.innerHeight;
          guard(measurePar);
        }, { passive: true });
        window.addEventListener('load', function () { guard(measurePar); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { guard(measurePar); });
      });

      window.requestAnimationFrame(frame);
    } catch (e) {
      if (window.__dap && window.__dap.safe) window.__dap.safe();
    }

    /* abertura (loading) e entrada do hero: independentes do resto */
    try {
      var needLoader = root.classList.contains('is-loading') && !reduced && !root.classList.contains('safe');
      if (needLoader) {
        window.scrollTo(0, 0);
        runLoader().then(setReady);
      } else {
        root.classList.remove('is-loading');
        var l = $('#loader'); if (l && l.parentNode) l.parentNode.removeChild(l);
        setTimeout(setReady, 100);
      }
    } catch (e) {
      if (window.__dap && window.__dap.safe) window.__dap.safe();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
