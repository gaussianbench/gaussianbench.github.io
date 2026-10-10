/* GaussianBench page interactions: verdict bars, the per-scene results table,
 * the tolerance slider, active-section highlighting, BibTeX copy and the figure
 * lightbox. Results data are transcribed from Tables 7-9 of the paper.
 */
(function () {
  "use strict";

  var SYSTEMS = ["PhysGaussian", "GaussianFluent", "OmniPhysGS", "PhysDreamer", "Physics3D", "GASP"];
  var MAX_SCENES = 10;

  var SCENES = {
    mech: {
      note: "A1a/A1b report relative linear-momentum drift; A2, A3, A5 and M1 report relative error; A6 the larger COM position/velocity error; B1 the largest regional-strain or interface-traction error. A1a is a strict float32 precision diagnostic that no MPM entrant passes.",
      cols: [
        { id: "A1a", name: "Conservation, isolated body", metric: "relative momentum drift", tol: "< 10⁻⁶" },
        { id: "A1b", name: "Conservation, translating body", metric: "relative momentum drift", tol: "< 10⁻³" },
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
      note: "C1 and C2-s report median kinematic / transport error. C2-s is INVALID when the prescribed shear is never realized, even though conditional covariance transport passes; C1 instead grades realization of its smaller affine map. C5–C8 are triangle-state scenes entered through GASP’s native representation.",
      cols: [
        { id: "C1", name: "Affine push-forward", metric: "median kinematic / transport error", tol: "kinematic < 5%, transport < 0.1%" },
        { id: "C2-s", name: "Peak shear", metric: "median kinematic / transport error", tol: "regime-guarded; same transport limits" },
        { id: "C3", name: "Render round trip", metric: "PSNR", tol: "≥ 35 dB, SSIM ≥ 0.97" },
        { id: "C4", name: "Captured beam", metric: "frequency error", tol: "< 20%" },
        { id: "C5", name: "Triangle identity", metric: "area-error p95", tol: "edge < 1/5%, area < 2/10%" },
        { id: "C6", name: "Galilean transport", metric: "path straightness", tol: "< 2%" },
        { id: "C7", name: "Static equilibrium", metric: "post-settle COM drift", tol: "< 2% of body scale" },
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

  var KIND = { P: "pass", F: "fail", I: "invalid" };
  var WORD = { pass: "PASS", fail: "FAIL", invalid: "INVALID" };

  // Table 7: pass/fail/invalid at each tolerance multiplier.
  var MULTIPLIERS = ["0.5×", "0.75×", "1× nominal", "1.25×", "2×"];
  var NOMINAL = 2;
  var TOLERANCE = {
    PhysGaussian: [[6, 3, 1], [7, 2, 1], [7, 2, 1], [7, 2, 1], [7, 2, 1]],
    GaussianFluent: [[2, 4, 1], [2, 4, 1], [2, 4, 1], [2, 4, 1], [2, 4, 1]],
    OmniPhysGS: [[2, 5, 1], [3, 4, 1], [5, 2, 1], [5, 2, 1], [5, 2, 1]],
    PhysDreamer: [[2, 5, 1], [3, 4, 1], [5, 2, 1], [5, 2, 1], [5, 2, 1]],
    Physics3D: [[5, 3, 1], [6, 2, 1], [7, 1, 1], [7, 1, 1], [7, 1, 1]],
    GASP: [[4, 1, 0], [5, 0, 0], [5, 0, 0], [5, 0, 0], [5, 0, 0]]
  };
  var TOL_NOTES = [
    "At half the allowed error, ten nominal passes become failures: PhysGaussian A3, OmniPhysGS A2/A3/A5, PhysDreamer A2/A3/A5, Physics3D A3/A6 and GASP C7. No failure becomes a pass.",
    "At 0.75×, five borderline passes become failures: OmniPhysGS A2/A5, PhysDreamer A2/A5 and Physics3D A6.",
    "Nominal frozen tolerances. Validity gates (minimum travel, prescribed-face realization, small-deflection bounds) never move with the multiplier.",
    "At 1.25×, no verdict changes.",
    "Doubling every error budget changes none of the 47 external verdicts: no failure or invalid outcome is an artifact of the nominal cutoff."
  ];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---- stacked verdict bars ---- */

  function makeBar(host) {
    host.textContent = "";
    ["pass", "fail", "invalid"].forEach(function (kind) {
      host.appendChild(el("span", "seg " + kind));
    });
  }

  function setBar(host, p, f, i) {
    var vals = [p, f, i];
    host.style.width = ((p + f + i) / MAX_SCENES) * 100 + "%";
    for (var k = 0; k < 3; k++) {
      host.children[k].style.flex = vals[k] + " 1 0";
      host.children[k].style.display = vals[k] ? "" : "none";
    }
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", p + " pass, " + f + " fail, " + i + " invalid");
  }

  function initSummaryBars() {
    Array.prototype.forEach.call(document.querySelectorAll(".summary .sbar"), function (host) {
      makeBar(host);
      setBar(host, +host.dataset.p, +host.dataset.f, +host.dataset.i);
    });
  }

  /* ---- per-scene table ---- */

  function initMatrix() {
    var body = document.getElementById("matrix-body");
    var note = document.getElementById("matrix-note");
    var detail = document.getElementById("cell-detail");
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabs [role=tab]"));
    if (!body) return;
    var current = null;

    function hint() {
      detail.textContent = "";
      detail.appendChild(el("span", "hint", "Hover or tap a cell for the scene, its metric and the tolerance."));
    }

    function show(cell, sys, col, kind, value) {
      if (current) current.classList.remove("is-current");
      current = cell;
      cell.classList.add("is-current");
      detail.textContent = "";
      detail.appendChild(el("strong", null, sys + " · " + col.id + " " + col.name + "  "));
      detail.appendChild(el("span", "v " + kind, WORD[kind]));
      detail.appendChild(document.createTextNode("  " + col.metric + " " + value + ", tolerance " + col.tol));
    }

    function render(key) {
      var set = SCENES[key];
      var table = el("table", "matrix");
      var thead = el("thead");
      var hr = el("tr");
      hr.appendChild(el("th", null, "System"));
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
        set.rows[sys].forEach(function (raw, i) {
          var col = set.cols[i];
          var td = el("td");
          if (!raw) {
            var na = el("span", "cell na", "NA");
            na.setAttribute("aria-label", sys + " " + col.id + ": not applicable");
            td.appendChild(na);
          } else {
            var kind = KIND[raw.charAt(0)];
            var value = raw.slice(2);
            var cell = el("button", "cell " + kind);
            cell.type = "button";
            cell.appendChild(el("b", null, WORD[kind]));
            cell.appendChild(document.createTextNode(value));
            cell.setAttribute("aria-label", sys + " " + col.id + ": " + WORD[kind] + ", " + value);
            var handler = function () { show(cell, sys, col, kind, value); };
            cell.addEventListener("mouseenter", handler);
            cell.addEventListener("focus", handler);
            cell.addEventListener("click", handler);
            td.appendChild(cell);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      body.textContent = "";
      body.appendChild(table);
      note.textContent = set.note;
      current = null;
      hint();
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

  /* ---- tolerance slider ---- */

  function initTolerance() {
    var input = document.getElementById("tol");
    var out = document.getElementById("tol-out");
    var chart = document.getElementById("tol-chart");
    var note = document.getElementById("tol-note");
    if (!input || !chart) return;
    var rows = {};

    SYSTEMS.forEach(function (sys) {
      var row = el("div", "tol-row");
      row.appendChild(el("span", "tol-name", sys));
      var track = el("div");
      var bar = el("div", "sbar");
      makeBar(bar);
      track.appendChild(bar);
      row.appendChild(track);
      var count = el("span", "tol-count");
      row.appendChild(count);
      chart.appendChild(row);
      rows[sys] = { bar: bar, count: count };
    });

    function update() {
      var k = +input.value;
      out.textContent = MULTIPLIERS[k];
      input.setAttribute("aria-valuetext", MULTIPLIERS[k]);
      SYSTEMS.forEach(function (sys) {
        var v = TOLERANCE[sys][k];
        var changed = v[0] !== TOLERANCE[sys][NOMINAL][0];
        setBar(rows[sys].bar, v[0], v[1], v[2]);
        rows[sys].count.textContent = v[0] + " / " + v[1] + " / " + v[2];
        rows[sys].count.classList.toggle("changed", changed);
      });
      note.textContent = TOL_NOTES[k];
    }

    input.addEventListener("input", update);
    update();
  }

  /* ---- highlight the section in view ---- */

  function initActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".topnav a"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("is-active"); });
        var link = byId[entry.target.id];
        if (link) link.classList.add("is-active");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  /* ---- BibTeX copy ---- */

  function initCopy() {
    var btn = document.getElementById("copy-btn");
    var code = document.getElementById("bibtex-content");
    if (!btn || !code) return;
    var timer;

    function done() {
      btn.textContent = "Copied";
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = "Copy"; }, 1500);
    }

    function fallback(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* text stays selectable */ }
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

  /* ---- figure lightbox ---- */

  function initLightbox() {
    var box = document.getElementById("lightbox");
    if (!box || typeof box.showModal !== "function") return;
    var img = box.querySelector("img");
    var caption = box.querySelector(".lightbox-caption");

    Array.prototype.forEach.call(document.querySelectorAll(".figure img"), function (source) {
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
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target === img) box.close();
    });
  }

  function boot() {
    initSummaryBars();
    initMatrix();
    initTolerance();
    initActiveNav();
    initCopy();
    initLightbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
