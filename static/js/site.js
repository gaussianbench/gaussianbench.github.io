/* ---- GaussianBench page interactions ----
 *
 * Scroll chrome (sticky bar, progress, active section), reveal-on-scroll, the
 * per-scene results matrix, the tolerance-sensitivity slider, BibTeX copy and the
 * figure lightbox. Results data are transcribed from Tables 7-9 of the paper.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------ data */

  var SYSTEMS = ["PhysGaussian", "GaussianFluent", "OmniPhysGS", "PhysDreamer", "Physics3D", "GASP"];

  var SCENES = {
    mech: {
      note: "A1a/A1b report relative linear-momentum drift; A2, A3, A5 and M1 report relative error; A6 the larger COM position/velocity error; B1 the largest regional-strain or interface-traction error. A1a is a strict float32 precision diagnostic that no MPM entrant passes.",
      cols: [
        { id: "A1a", name: "Conservation, isolated body", metric: "relative momentum drift", tol: "Δp < 10⁻⁶" },
        { id: "A1b", name: "Conservation, translating body", metric: "relative momentum drift", tol: "Δp < 10⁻³" },
        { id: "A2", name: "Euler–Bernoulli beam", metric: "beam-frequency error", tol: "< 10%" },
        { id: "A3", name: "Stress-wave speed", metric: "wave-speed error", tol: "< 15%" },
        { id: "A5", name: "Poisson contraction", metric: "lateral-contraction error", tol: "< 10%" },
        { id: "A6", name: "Free fall", metric: "COM position/velocity error", tol: "< 10%" },
        { id: "B1", name: "Bimaterial series bar", metric: "largest regional-strain or traction error", tol: "< 15%" },
        { id: "M1", name: "ASTM D412 rubber", metric: "median Cauchy-stress error", tol: "< 15%" }
      ],
      rows: {
        PhysGaussian: ["F 8.95×10⁻⁶", "P 1.02×10⁻⁶", "P 4.23%", "P 7.71%", "P 2.17%", "", "", "P 5.40%"],
        GaussianFluent: ["F 1.73×10⁻²", "F 3.04×10⁻³", "F 76.9%", "F no arrival", "P 0.263%", "", "", ""],
        OmniPhysGS: ["F 4.16×10⁻⁶", "", "P 8.06%", "P 9.04%", "P 8.18%", "", "F 105%", ""],
        PhysDreamer: ["F 2.35×10⁻⁵", "", "P 8.61%", "P 9.04%", "P 7.79%", "", "F 106%", ""],
        Physics3D: ["F 8.56×10⁻⁶", "P 1.00×10⁻⁶", "P 4.23%", "P 7.71%", "P 2.17%", "P 7.60%", "", ""],
        GASP: ["", "", "", "", "", "P 2.34%", "", ""]
      }
    },
    rep: {
      note: "C1 and C2-s report median kinematic / transport error. C2-s is INVALID when the prescribed shear is never realized, even though conditional covariance transport passes; C1 instead grades realization of its smaller affine map. C5–C8 are triangle-state scenes entered by GASP’s native representation.",
      cols: [
        { id: "C1", name: "Affine push-forward", metric: "median kinematic / transport error", tol: "kin. < 5%, transport < 0.1%" },
        { id: "C2-s", name: "Peak shear", metric: "median kinematic / transport error", tol: "regime-guarded; same transport limits" },
        { id: "C3", name: "Render round trip", metric: "PSNR", tol: "≥ 35 dB, SSIM ≥ 0.97" },
        { id: "C4", name: "Captured beam", metric: "frequency error", tol: "< 20%" },
        { id: "C5", name: "Triangle identity", metric: "area-error p95", tol: "edge < 1/5%, area < 2/10%" },
        { id: "C6", name: "Galilean transport", metric: "path straightness", tol: "< 2%" },
        { id: "C7", name: "Static equilibrium", metric: "post-settle COM drift", tol: "< 2% body scale" },
        { id: "C8", name: "Impact recovery", metric: "tail edge / area recovery error", tol: "tail median < 5/10%" }
      ],
      rows: {
        PhysGaussian: ["P 0.866 / 0.0136%", "I 45.3 / 0.0747%", "F 31.63 dB", "P 0.691%", "", "", "", ""],
        GaussianFluent: ["P 0.864 / 0.0112%", "I 12.4 / 0.0815%", "", "", "", "", "", ""],
        OmniPhysGS: ["P 1.11 / 3.56×10⁻⁶%", "I 22.7 / 4.01×10⁻⁶%", "", "P 6.82%", "", "", "", ""],
        PhysDreamer: ["P 1.11 / 0.00827%", "I 22.7 / 0.0265%", "", "P 7.45%", "", "", "", ""],
        Physics3D: ["P 0.866 / 0.0136%", "I 45.3 / 0.0747%", "", "P 0.691%", "", "", "", ""],
        GASP: ["", "", "", "", "P 0.0302%", "P 0.000848%", "P 1.41%", "P 1.05 / 0.912%"]
      }
    }
  };

  var VERDICT = { P: "pass", F: "fail", I: "invalid" };
  var VERDICT_WORD = { pass: "PASS", fail: "FAIL", invalid: "INVALID", na: "NA" };

  // Table 7: pass/fail/invalid at each tolerance multiplier.
  var MULTIPLIERS = ["0.5×", "0.75×", "1×", "1.25×", "2×"];
  var TOLERANCE = {
    PhysGaussian: [[6, 3, 1], [7, 2, 1], [7, 2, 1], [7, 2, 1], [7, 2, 1]],
    GaussianFluent: [[2, 4, 1], [2, 4, 1], [2, 4, 1], [2, 4, 1], [2, 4, 1]],
    OmniPhysGS: [[2, 5, 1], [3, 4, 1], [5, 2, 1], [5, 2, 1], [5, 2, 1]],
    PhysDreamer: [[2, 5, 1], [3, 4, 1], [5, 2, 1], [5, 2, 1], [5, 2, 1]],
    Physics3D: [[5, 3, 1], [6, 2, 1], [7, 1, 1], [7, 1, 1], [7, 1, 1]],
    GASP: [[4, 1, 0], [5, 0, 0], [5, 0, 0], [5, 0, 0], [5, 0, 0]]
  };
  var TOL_NOTES = [
    "At 0.5× (half the allowed error) ten nominal passes flip to fail: PhysGaussian A3, OmniPhysGS A2/A3/A5, PhysDreamer A2/A3/A5, Physics3D A3/A6 and GASP C7. No failure becomes a pass.",
    "At 0.75× five borderline passes flip to fail: OmniPhysGS A2/A5, PhysDreamer A2/A5 and Physics3D A6.",
    "Nominal frozen tolerances. Validity gates (minimum travel, prescribed-face realization, small-deflection bounds) never move with the multiplier.",
    "At 1.25× no verdict changes.",
    "Doubling every error budget changes zero of the 47 external verdicts: none of the failures or invalid outcomes is created by the nominal cutoff."
  ];

  /* ------------------------------------------------------------ helpers */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // Stacked pass/fail/invalid bar; widths are proportional to counts out of `scale`.
  function buildBar(host, counts, scale) {
    host.textContent = "";
    host.style.width = (counts.n / scale) * 100 + "%";
    host.setAttribute("role", "img");
    ["pass", "fail", "invalid"].forEach(function (kind) {
      host.appendChild(el("span", "seg " + kind));
    });
    updateBar(host, counts);
  }

  function updateBar(host, counts) {
    var vals = [counts.p, counts.f, counts.i];
    var segs = host.children;
    var visible = [];
    for (var i = 0; i < 3; i++) {
      segs[i].style.flexGrow = vals[i];
      segs[i].textContent = vals[i] ? vals[i] : "";
      segs[i].classList.toggle("is-zero", !vals[i]);
      segs[i].style.flexBasis = "0";
      if (vals[i]) visible.push(segs[i]);
    }
    // Round only the outer ends of the visible run.
    for (var j = 0; j < 3; j++) segs[j].style.borderRadius = "0";
    if (visible.length) {
      visible[0].style.borderTopLeftRadius = visible[0].style.borderBottomLeftRadius = "5px";
      var last = visible[visible.length - 1];
      last.style.borderTopRightRadius = last.style.borderBottomRightRadius = "5px";
    }
    host.setAttribute("aria-label", counts.p + " pass, " + counts.f + " fail, " + counts.i + " invalid");
  }

  /* ------------------------------------------------------------ scroll chrome */

  function initScrollChrome() {
    var bar = document.getElementById("topbar");
    var progress = document.getElementById("progress-bar");
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.classList.toggle("is-scrolled", y > 40);
      if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    // Highlight the section currently in view.
    var links = Array.prototype.slice.call(document.querySelectorAll(".topnav a"));
    if (!("IntersectionObserver" in window) || !links.length) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("is-active"); });
        var link = byId[entry.target.id];
        if (link) link.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  /* ------------------------------------------------------------ reveal & count-up */

  function countUp(node) {
    var target = parseInt(node.getAttribute("data-count"), 10);
    if (reduceMotion || !target) return;
    var start = null;
    var dur = 1100;
    function frame(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      node.textContent = Math.round(target * eased);
      if (k < 1) window.requestAnimationFrame(frame);
    }
    node.textContent = "0";
    window.requestAnimationFrame(frame);
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    // Stagger siblings that enter together.
    Array.prototype.forEach.call(items, function (item) {
      var parent = item.parentElement;
      var siblings = Array.prototype.filter.call(parent.children, function (c) { return c.classList.contains("reveal"); });
      var idx = siblings.indexOf(item);
      if (idx > 0) item.style.setProperty("--delay", Math.min(idx, 5) * 80 + "ms");
    });

    if (!("IntersectionObserver" in window) || reduceMotion) {
      Array.prototype.forEach.call(items, function (i) { i.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        Array.prototype.forEach.call(entry.target.querySelectorAll("[data-count]"), countUp);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(items, function (i) { io.observe(i); });
  }

  /* ------------------------------------------------------------ summary bars */

  function initSummaryBars() {
    Array.prototype.forEach.call(document.querySelectorAll(".summary .sbar"), function (host) {
      var counts = {
        p: +host.getAttribute("data-p"),
        f: +host.getAttribute("data-f"),
        i: +host.getAttribute("data-i"),
        n: +host.getAttribute("data-n")
      };
      buildBar(host, counts, 10);
    });
  }

  /* ------------------------------------------------------------ matrix */

  function initMatrix() {
    var body = document.getElementById("matrix-body");
    var note = document.getElementById("matrix-note");
    var detail = document.getElementById("cell-detail");
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabs [role=tab]"));
    if (!body) return;
    var current = null;

    function show(cell, sys, col, kind, value) {
      if (current) current.classList.remove("is-current");
      current = cell;
      if (cell) cell.classList.add("is-current");
      detail.textContent = "";
      var badge = el("span", "badge sm " + kind, VERDICT_WORD[kind]);
      var head = el("strong", null, sys + " · " + col.id + " " + col.name);
      detail.appendChild(badge);
      detail.appendChild(head);
      var text = kind === "na"
        ? "Not entered: the release does not expose the required state or capability."
        : col.metric + ": " + value + " (tolerance " + col.tol + ")";
      detail.appendChild(el("span", "muted", text));
    }

    function render(setKey) {
      var set = SCENES[setKey];
      var table = el("table", "matrix matrix-fade");
      var thead = el("thead");
      var hr = el("tr");
      var corner = el("th", null, "System");
      corner.scope = "col";
      hr.appendChild(corner);
      set.cols.forEach(function (c) {
        var th = el("th", null, c.id);
        th.scope = "col";
        th.title = c.name;
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);

      var tbody = el("tbody");
      SYSTEMS.forEach(function (sys) {
        var tr = el("tr");
        var th = el("th", null, sys);
        th.scope = "row";
        tr.appendChild(th);
        set.rows[sys].forEach(function (raw, ci) {
          var td = el("td");
          var col = set.cols[ci];
          var cell;
          if (!raw) {
            cell = el("span", "cell na");
            cell.appendChild(el("b", null, "NA"));
            cell.setAttribute("aria-label", sys + " " + col.id + ": NA");
            cell.addEventListener("mouseenter", function () { show(null, sys, col, "na"); });
          } else {
            var kind = VERDICT[raw.charAt(0)];
            var value = raw.slice(2);
            cell = el("button", "cell " + kind);
            cell.type = "button";
            cell.appendChild(el("b", null, VERDICT_WORD[kind]));
            cell.appendChild(el("span", null, value));
            cell.setAttribute("aria-label", sys + " " + col.id + ": " + VERDICT_WORD[kind] + ", " + value);
            var handler = function () { show(cell, sys, col, kind, value); };
            cell.addEventListener("mouseenter", handler);
            cell.addEventListener("focus", handler);
            cell.addEventListener("click", handler);
          }
          td.appendChild(cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      body.textContent = "";
      body.appendChild(table);
      note.textContent = set.note;
      current = null;
      detail.innerHTML = '<span class="cell-detail-hint">Hover or tap a cell for the scene, the metric and its value.</span>';
    }

    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      body.setAttribute("aria-labelledby", tab.id);
      render(tab.getAttribute("data-set"));
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        select(next);
      });
    });

    render("mech");
  }

  /* ------------------------------------------------------------ tolerance slider */

  function initTolerance() {
    var input = document.getElementById("tol");
    var out = document.getElementById("tol-out");
    var chart = document.getElementById("tol-chart");
    var note = document.getElementById("tol-note");
    if (!input || !chart) return;
    var NOMINAL = 2;
    var bars = {};
    var deltas = {};

    SYSTEMS.forEach(function (sys) {
      var row = el("div", "tol-row");
      row.appendChild(el("span", "tol-name", sys));
      var track = el("div");
      var bar = el("div", "sbar");
      track.appendChild(bar);
      row.appendChild(track);
      var delta = el("span", "tol-delta");
      row.appendChild(delta);
      chart.appendChild(row);
      var v = TOLERANCE[sys][NOMINAL];
      buildBar(bar, { p: v[0], f: v[1], i: v[2], n: v[0] + v[1] + v[2] }, 10);
      bars[sys] = bar;
      deltas[sys] = delta;
    });

    function update() {
      var k = +input.value;
      out.textContent = k === NOMINAL ? "1× nominal" : MULTIPLIERS[k];
      input.setAttribute("aria-valuetext", out.textContent);
      SYSTEMS.forEach(function (sys) {
        var v = TOLERANCE[sys][k];
        var base = TOLERANCE[sys][NOMINAL];
        updateBar(bars[sys], { p: v[0], f: v[1], i: v[2] });
        var moved = base[0] - v[0];
        deltas[sys].textContent = moved ? moved + " flipped" : "no change";
        deltas[sys].classList.toggle("changed", moved !== 0);
      });
      note.textContent = TOL_NOTES[k];
    }

    input.addEventListener("input", update);
    update();
  }

  /* ------------------------------------------------------------ BibTeX copy */

  function initCopy() {
    var btn = document.getElementById("copy-btn");
    var code = document.getElementById("bibtex-content");
    if (!btn || !code) return;
    var label = btn.querySelector("span");
    var icon = btn.querySelector("i");
    var timer;

    function done() {
      btn.classList.add("copied");
      icon.className = "fas fa-check";
      label.textContent = "Copied";
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.classList.remove("copied");
        icon.className = "fas fa-copy";
        label.textContent = "Copy";
      }, 1800);
    }

    function fallback(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* nothing more to try */ }
      document.body.removeChild(ta);
    }

    btn.addEventListener("click", function () {
      var text = code.textContent;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text); });
      } else {
        fallback(text);
      }
    });
  }

  /* ------------------------------------------------------------ lightbox */

  function initLightbox() {
    var box = document.getElementById("lightbox");
    if (!box || typeof box.showModal !== "function") return;
    var img = box.querySelector("img");
    var caption = box.querySelector(".lightbox-caption");

    Array.prototype.forEach.call(document.querySelectorAll(".zoomable img"), function (source) {
      source.setAttribute("tabindex", "0");
      source.setAttribute("role", "button");
      source.setAttribute("aria-label", "Enlarge figure: " + source.alt);
      function open() {
        img.src = source.currentSrc || source.src;
        img.alt = source.alt;
        var fc = source.closest("figure").querySelector("figcaption");
        caption.textContent = fc ? fc.textContent : "";
        box.showModal();
      }
      source.addEventListener("click", open);
      source.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });

    box.querySelector(".lightbox-close").addEventListener("click", function () { box.close(); });
    // A click on the backdrop lands on the dialog element itself.
    box.addEventListener("click", function (e) {
      if (e.target === box) box.close();
    });
  }

  /* ------------------------------------------------------------ boot */

  function boot() {
    initScrollChrome();
    initSummaryBars();
    initMatrix();
    initTolerance();
    initReveal();
    initCopy();
    initLightbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
