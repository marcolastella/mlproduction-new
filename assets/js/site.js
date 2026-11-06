/* ML Production — interazioni */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- header: solido dopo lo scroll, si nasconde scendendo ---------- */
  var top = document.querySelector(".top");
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    if (top) {
      top.classList.toggle("is-solid", y > 40);
      var hide = y > 400 && y > lastY && !doc.classList.contains("menu-open");
      top.classList.toggle("is-hidden", hide);
    }
    lastY = y;
  }
  var wa = document.querySelector(".wa");
  var hasSpot = !!document.querySelector("[data-spot]");
  function onWa() { if (wa) wa.classList.toggle("is-away", hasSpot && window.scrollY < window.innerHeight * 0.7); }
  window.addEventListener("scroll", onWa, { passive: true });
  onWa();
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- menu mobile ---------- */
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector(".drawer");
  function setMenu(open) {
    doc.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { var first = drawer.querySelector("a"); if (first) first.focus(); }
  }
  if (burger && drawer) {
    burger.addEventListener("click", function () { setMenu(!doc.classList.contains("menu-open")); });
    drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && doc.classList.contains("menu-open")) { setMenu(false); burger.focus(); }
    });
  }

  /* ---------- occhio di bue ----------
     Strati: foto al buio, foto illuminata (maschera radiale), fascio volumetrico
     (canvas a bassa risoluzione + sfocatura CSS = bordi morbidi, fumo in movimento),
     polvere che brilla solo dentro il fascio. */
  var TUNG = "255,206,156";

  function makeNoise() {
    // fumo: rumore a macchie, scalato più volte e sovrapposto
    var c = document.createElement("canvas"); c.width = c.height = 256;
    var x = c.getContext("2d");
    [6, 12, 24, 48].forEach(function (n, i) {
      var t = document.createElement("canvas"); t.width = t.height = n;
      var tx = t.getContext("2d"), d = tx.createImageData(n, n);
      for (var k = 0; k < d.data.length; k += 4) { var v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = 255; d.data[k + 3] = v; }
      tx.putImageData(d, 0, 0);
      x.globalAlpha = [0.7, 0.45, 0.3, 0.2][i];
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(t, 0, 0, 256, 256);
    });
    // alpha minima: il fascio non sparisce mai del tutto
    x.globalAlpha = 1; x.globalCompositeOperation = "destination-over";
    x.fillStyle = "rgba(255,255,255,.5)"; x.fillRect(0, 0, 256, 256);
    return c;
  }

  function initSpot(spot) {
    var page = spot.classList.contains("spot--page");
    var ox = parseFloat(spot.getAttribute("data-x") || "0.6");
    var oy = parseFloat(spot.getAttribute("data-y") || "0.42");
    var cx = ox, cy = oy, tx = cx, ty = cy;
    var r = 0, targetR = 0, lastMove = -1e9, visible = true, lit = false;
    var t0 = performance.now() - Math.random() * 20000;
    var W = 0, H = 0;

    var beam = document.createElement("canvas"); beam.className = "spot__beam"; beam.setAttribute("aria-hidden", "true");
    var dust = document.createElement("canvas"); dust.className = "spot__dust"; dust.setAttribute("aria-hidden", "true");
    var haze = spot.querySelector(".spot__haze");
    spot.insertBefore(beam, haze); spot.insertBefore(dust, haze);
    var bx = beam.getContext("2d"), dx = dust.getContext("2d");
    var BS = 0.25;                                  // risoluzione del fascio
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var noise = makeNoise(), pattern = bx.createPattern(noise, "repeat");
    var parts = [];

    function size() {
      W = spot.clientWidth; H = spot.clientHeight;
      beam.width = Math.max(1, Math.round(W * BS)); beam.height = Math.max(1, Math.round(H * BS));
      dust.width = Math.round(W * DPR); dust.height = Math.round(H * DPR);
      var n = Math.round(W * H / (reduce ? 14000 : 7000));
      parts = [];
      for (var i = 0; i < n; i++) parts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.03 - Math.random() * 0.12,
        s: 0.5 + Math.pow(Math.random(), 3) * 2.6, p: Math.random() * 6.28, f: 0.4 + Math.random() * 1.4
      });
      if (lit) targetR = baseR();
    }
    function baseR() {
      var m = Math.min(W, H);
      return Math.max(160, m * (W < 760 ? 0.5 : page ? 0.42 : 0.37));
    }
    // sorgente: torre luci in alto a destra, fuori campo
    function source() { return { x: W * 0.9, y: -H * 0.18 }; }

    function geometry() {
      var S = source(), px = cx * W, py = cy * H;
      var ddx = px - S.x, ddy = py - S.y, len = Math.hypot(ddx, ddy) || 1;
      return { S: S, C: { x: px, y: py }, ux: ddx / len, uy: ddy / len, len: len, a: W * 0.006 + 4, R: r * 0.7 };
    }

    function drawBeam(g, now) {
      var k = BS, S = g.S, C = g.C, nx = -g.uy, ny = g.ux;
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.globalCompositeOperation = "source-over";
      bx.clearRect(0, 0, beam.width, beam.height);
      if (r < 2) return;
      bx.setTransform(k, 0, 0, k, 0, 0);
      var grad = bx.createLinearGradient(S.x, S.y, C.x, C.y);
      grad.addColorStop(0, "rgba(" + TUNG + ",1)");
      grad.addColorStop(0.08, "rgba(" + TUNG + ",0.5)");
      grad.addColorStop(0.55, "rgba(" + TUNG + ",0.34)");
      grad.addColorStop(0.9, "rgba(" + TUNG + ",0.1)");
      grad.addColorStop(1, "rgba(" + TUNG + ",0.04)");
      // più passate di larghezza crescente: il bordo sfuma invece di tagliare
      [[1.55, 0.22], [1.25, 0.32], [1.0, 0.45], [0.7, 0.55], [0.4, 0.45]].forEach(function (pp) {
        var R = g.R * pp[0], a = g.a * pp[0];
        bx.globalAlpha = pp[1];
        bx.fillStyle = grad;
        bx.beginPath();
        bx.moveTo(S.x + nx * a, S.y + ny * a);
        bx.lineTo(C.x + nx * R, C.y + ny * R);
        bx.arc(C.x, C.y, R, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
        bx.lineTo(S.x - nx * a, S.y - ny * a);
        bx.closePath();
        bx.fill();
      });
      // fumo che scorre dentro il fascio
      var t = (now - t0) / 1000;
      bx.globalAlpha = 1;
      bx.globalCompositeOperation = "destination-in";
      if (pattern && pattern.setTransform && window.DOMMatrix) {
        pattern.setTransform(new DOMMatrix().translate(t * 9 % 2048, -t * 14 % 2048).scale(1.5));
        bx.fillStyle = pattern;
        bx.fillRect(0, 0, W, H);
        bx.globalCompositeOperation = "source-over";
      }
      bx.globalCompositeOperation = "source-over";
    }

    function inBeam(g, x, y) {
      var px = x - g.S.x, py = y - g.S.y;
      var along = px * g.ux + py * g.uy;
      if (along < 0) return 0;
      var tt = along / g.len;
      if (tt > 1.08) return 0;
      var lat = Math.abs(px * -g.uy + py * g.ux);
      var half = g.a + (g.R * 1.1 - g.a) * Math.min(tt, 1);
      var e = lat / half;
      if (e >= 1) return 0;
      var soft = 1 - e * e;
      return soft * (0.35 + 0.65 * Math.min(tt, 1));
    }

    function drawDust(g, now, dt) {
      dx.setTransform(1, 0, 0, 1, 0, 0);
      dx.clearRect(0, 0, dust.width, dust.height);
      if (r < 2) return;
      dx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var t = now / 1000;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!reduce) {
          p.x += (p.vx + Math.sin(t * 0.3 + p.p) * 0.05) * dt;
          p.y += p.vy * dt;
          if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
          if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        }
        var b = inBeam(g, p.x, p.y);
        if (b < 0.02) continue;
        var tw = 0.55 + 0.45 * Math.sin(t * p.f + p.p);
        dx.fillStyle = "rgba(255,232,205," + (b * tw).toFixed(3) + ")";
        dx.beginPath(); dx.arc(p.x, p.y, p.s, 0, 6.2832); dx.fill();
      }
    }

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(3, (now - last) / 16.7); last = now;
      if (visible) {
        var idle = now - lastMove > 2600 || !finePointer;
        if (idle) {
          // l'operatore cerca l'artista: percorso lento e organico
          var t = (now - t0) / 1000, amp = page ? 0.12 : 0.2;
          tx = ox + Math.sin(t * 0.37) * amp + Math.sin(t * 0.91) * 0.03;
          ty = oy + Math.sin(t * 0.53 + 1.2) * amp * 0.55;
        }
        var kk = idle ? 0.03 : 0.12;
        cx += (tx - cx) * kk * dt; cy += (ty - cy) * kk * dt;
        r += (targetR - r) * Math.min(1, 0.09 * dt);
        spot.style.setProperty("--x", (cx * 100).toFixed(2) + "%");
        spot.style.setProperty("--y", (cy * 100).toFixed(2) + "%");
        spot.style.setProperty("--r", r.toFixed(1) + "px");
        var g = geometry();
        drawBeam(g, now);
        drawDust(g, now, dt);
      }
      if (!reduce) requestAnimationFrame(frame);
    }

    function strike() {
      if (reduce) {
        lit = true; targetR = r = baseR(); spot.classList.add("is-lit"); frame(performance.now()); return;
      }
      // accensione: la lampada sfarfalla, poi si stabilizza
      var seq = [0.3, 0, 0.55, 0.12, 1], i = 0;
      (function step() {
        var v = seq[i++];
        targetR = baseR() * v; r = targetR * (v ? 0.9 : 0);
        if (i < seq.length) setTimeout(step, i < 3 ? 80 : 130);
        else { lit = true; spot.classList.add("is-lit"); }
      })();
    }

    spot.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var b = spot.getBoundingClientRect();
      tx = (e.clientX - b.left) / b.width; ty = (e.clientY - b.top) / b.height;
      lastMove = performance.now();
    });
    window.addEventListener("resize", size);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(spot);

    size();
    if (reduce) strike();
    else { requestAnimationFrame(frame); setTimeout(strike, page ? 250 : 450); }
  }
  document.querySelectorAll("[data-spot]").forEach(initSpot);

  /* ---------- foto "sul campo": si accendono al centro dello schermo ---------- */
  document.querySelectorAll(".reel").forEach(function (reel) {
    var figs = reel.querySelectorAll("figure"), tr = reel.querySelector(".reel__track"), queued = false;
    function upd() {
      queued = false;
      var vw = window.innerWidth;
      figs.forEach(function (f) {
        var b = f.getBoundingClientRect();
        var d = Math.abs(b.left + b.width / 2 - vw / 2) / (vw * 0.55);
        var l = Math.max(0, Math.min(1, 1.25 - d));
        f.style.setProperty("--lit", l.toFixed(3));
      });
    }
    function q() { if (!queued) { queued = true; requestAnimationFrame(upd); } }
    tr.addEventListener("scroll", q, { passive: true });
    window.addEventListener("resize", q);
    upd();
  });

  /* ---------- scritta del footer illuminata dal cursore ---------- */
  var word = document.querySelector(".foot__word");
  if (word && finePointer) {
    var foot = word.closest("footer");
    foot.addEventListener("mousemove", function (e) {
      var b = word.getBoundingClientRect();
      word.style.setProperty("--fx", (e.clientX - b.left) + "px");
      word.style.setProperty("--fy", (e.clientY - b.top) + "px");
    });
    foot.addEventListener("mouseleave", function () { word.style.setProperty("--fx", "-999px"); });
  }

  /* ---------- servizi: anteprima che segue il cursore ---------- */
  var faders = document.querySelector(".faders");
  var peek = document.querySelector(".peek");
  if (faders && peek && finePointer) {
    var px = 0, py = 0, qx = 0, qy = 0, running = false;
    function loop() {
      qx += (px - qx) * (reduce ? 1 : 0.18);
      qy += (py - qy) * (reduce ? 1 : 0.18);
      peek.style.left = qx + "px";
      peek.style.top = qy + "px";
      if (running) requestAnimationFrame(loop);
    }
    faders.querySelectorAll(".fader").forEach(function (row) {
      row.addEventListener("mouseenter", function (e) {
        var id = row.getAttribute("data-peek");
        peek.querySelectorAll("img").forEach(function (im) { im.classList.toggle("is-on", im.getAttribute("data-peek") === id); });
        if (!running) { qx = px = e.clientX; qy = py = e.clientY; running = true; requestAnimationFrame(loop); }
        peek.classList.add("is-on");
      });
    });
    faders.addEventListener("mousemove", function (e) { px = e.clientX + 60; py = e.clientY; });
    faders.addEventListener("mouseleave", function () { peek.classList.remove("is-on"); running = false; });
  }

  /* ---------- striscia foto: trascina + frecce ---------- */
  document.querySelectorAll(".reel").forEach(function (reel) {
    var track = reel.querySelector(".reel__track");
    var down = false, startX = 0, startS = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = e.clientX; startS = track.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-drag"); }
      track.scrollLeft = startS - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false; track.classList.remove("is-drag");
    });
    track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    reel.querySelectorAll("[data-dir]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = parseInt(b.getAttribute("data-dir"), 10);
        track.scrollBy({ left: d * track.clientWidth * 0.7, behavior: reduce ? "auto" : "smooth" });
      });
    });
  });

  /* ---------- lightbox ---------- */
  var lb = document.querySelector(".lb");
  if (lb && typeof lb.showModal === "function") {
    var lbImg = lb.querySelector("img"), lbCap = lb.querySelector("p");
    document.querySelectorAll("[data-full]").forEach(function (b) {
      b.addEventListener("click", function () {
        var im = b.querySelector("img");
        lbImg.src = b.getAttribute("data-full");
        lbImg.alt = im ? im.alt : "";
        lbCap.textContent = im ? im.alt : "";
        lb.showModal();
      });
    });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.closest(".icon-btn")) lb.close(); });
  }

  /* ---------- modulo contatti: compone il messaggio per WhatsApp o email ---------- */
  var form = document.querySelector("[data-brief]");
  if (form) {
    var err = form.querySelector(".form__err");
    function compose() {
      var f = new FormData(form);
      var name = (f.get("nome") || "").toString().trim();
      var lines = [
        "Ciao ML Production, sono " + name + ".",
        "Tipo di evento: " + (f.get("tipo") || "da definire"),
        f.get("data") ? "Data: " + f.get("data") : "",
        f.get("luogo") ? "Luogo: " + f.get("luogo") : "",
        "",
        (f.get("messaggio") || "").toString().trim()
      ];
      return { name: name, text: lines.filter(function (l, i) { return l !== "" || i === 4; }).join("\n").trim() };
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.querySelectorAll("[data-send]").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = compose();
        if (!m.name) {
          err.hidden = false;
          err.textContent = "Scrivi il tuo nome, così sappiamo chi ci contatta.";
          form.querySelector("[name=nome]").focus();
          return;
        }
        err.hidden = true;
        var url = b.getAttribute("data-send") === "wa"
          ? "https://wa.me/393273740925?text=" + encodeURIComponent(m.text)
          : "mailto:info@mlproduction.it?subject=" + encodeURIComponent("Richiesta preventivo da " + m.name) + "&body=" + encodeURIComponent(m.text);
        window.location.href = url;
      });
    });
  }

  /* anno nel footer */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
