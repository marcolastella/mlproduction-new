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

  /* ---------- occhio di bue ---------- */
  var spot = document.querySelector("[data-spot]");
  if (spot) {
    var cx = 0.62, cy = 0.42;        // posizione attuale (0..1)
    var tx = cx, ty = cy;            // obiettivo
    var r = 0, targetR = 0;
    var lastMove = -1e9, visible = true;
    var t0 = performance.now();

    function baseR() {
      var w = spot.clientWidth, h = spot.clientHeight;
      return Math.max(170, Math.min(w, h) * (w < 760 ? 0.48 : 0.36));
    }

    function frame(now) {
      if (visible) {
        var idle = now - lastMove > 2600 || !finePointer;
        if (idle) {
          // l'operatore cerca il cantante: percorso lento e organico
          var t = (now - t0) / 1000;
          tx = 0.58 + Math.sin(t * 0.37) * 0.2 + Math.sin(t * 0.91) * 0.04;
          ty = 0.40 + Math.sin(t * 0.53 + 1.2) * 0.12;
        }
        var k = idle ? 0.03 : 0.12;
        cx += (tx - cx) * k;
        cy += (ty - cy) * k;
        r += (targetR - r) * 0.08;
        spot.style.setProperty("--x", (cx * 100).toFixed(2) + "%");
        spot.style.setProperty("--y", (cy * 100).toFixed(2) + "%");
        spot.style.setProperty("--r", r.toFixed(1) + "px");
        // fascio: dalla torre in alto a destra al cerchio di luce
        var w = spot.clientWidth, h = spot.clientHeight;
        var sx = w * 0.92, sy = -h * 0.12, px = cx * w, py = cy * h;
        var dx = px - sx, dy = py - sy, len = Math.hypot(dx, dy) || 1;
        var nx = -dy / len, ny = dx / len, rr = r * 0.62;
        spot.style.setProperty("--beam", "polygon(" +
          (sx + nx * 8).toFixed(0) + "px " + (sy + ny * 8).toFixed(0) + "px," +
          (sx - nx * 8).toFixed(0) + "px " + (sy - ny * 8).toFixed(0) + "px," +
          (px - nx * rr).toFixed(0) + "px " + (py - ny * rr).toFixed(0) + "px," +
          (px + nx * rr).toFixed(0) + "px " + (py + ny * rr).toFixed(0) + "px)");
      }
      requestAnimationFrame(frame);
    }

    function strike() {
      // accensione: tremolio della lampada, poi pieno
      if (reduce) {
        targetR = baseR(); r = targetR;
        spot.style.setProperty("--r", r + "px");
        spot.classList.add("is-lit");
        return;
      }
      var seq = [0.25, 0, 0.5, 0.1, 1];
      var i = 0;
      (function step() {
        var v = seq[i++];
        targetR = baseR() * v;
        r = targetR * (v ? 0.92 : 0);
        if (i < seq.length) setTimeout(step, i < 3 ? 90 : 140);
        else spot.classList.add("is-lit");
      })();
    }

    spot.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var b = spot.getBoundingClientRect();
      tx = (e.clientX - b.left) / b.width;
      ty = (e.clientY - b.top) / b.height;
      lastMove = performance.now();
    });
    window.addEventListener("resize", function () { if (spot.classList.contains("is-lit")) targetR = baseR(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(spot);
    }

    if (reduce) {
      strike();
    } else {
      requestAnimationFrame(frame);
      setTimeout(strike, 450);
    }
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
    faders.addEventListener("mousemove", function (e) { px = e.clientX + 40; py = e.clientY; });
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
