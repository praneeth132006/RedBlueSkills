/* ═══════════════════════════════════════════════════════════════════════
   map.js — the coverage map.

   Reads the `coverage` block that build_catalog.py bakes into catalog.json and
   draws (a) a radial "constellation": RedBlueSkills at the centre, one branch per
   surface, a bead per kill-chain stage that has skills — coloured by team mix,
   ringed when the whole cell is validated, dim/dashed for planned surfaces; and
   (b) the same data as a surface × stage matrix. Vanilla, no deps. Self-contained,
   theme is the site's Obsidian-Aurora palette (see styles.css).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var root = document.querySelector('[data-cmap]');
  if (!root) return;
  var svg = root.querySelector('[data-cmap-svg]');
  var tip = root.querySelector('[data-cmap-tip]');
  var matrix = root.querySelector('[data-cmap-matrix]');

  var STAGE_LABEL = {
    'recon': 'recon', 'initial-access': 'init-access', 'execution': 'exec',
    'persistence': 'persist', 'privilege-escalation': 'privesc',
    'defense-evasion': 'evasion', 'credential-access': 'cred-access',
    'lateral-movement': 'lateral', 'collection': 'collect',
    'exfiltration': 'exfil', 'impact': 'impact',
    'harden': 'harden', 'detect': 'detect', 'respond': 'respond',
    'recover': 'recover', 'hunt': 'hunt'
  };
  var SURFACE_LABEL = {
    'web-app': 'web-app', 'api': 'api', 'cloud-native': 'cloud', 'ci-cd': 'ci/cd',
    'mobile': 'mobile', 'network': 'network'
  };

  fetch('./catalog.json')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .catch(function () { return fetch('../catalog.json').then(function (r) { return r.json(); }); })
    .then(function (cat) {
      if (!cat || !cat.coverage) throw new Error('no coverage block — run `make catalog`');
      draw(cat.coverage);
      buildMatrix(cat.coverage);
    })
    .catch(function (e) {
      matrix.innerHTML = '<p class="empty">coverage map unavailable — ' +
        (e && e.message ? e.message : 'run `make catalog`') + '</p>';
    });

  /* ── colour logic per cell ─────────────────────────────────────────── */
  function cellClass(c) {
    if (!c || !c.total) return 'dark';
    if (c.red && c.blue) return 'both';
    if (c.red) return 'red';
    if (c.blue) return 'blue';
    return 'both';
  }
  function el(ns, name, attrs) {
    var n = document.createElementNS(ns, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ── the radial constellation ──────────────────────────────────────── */
  function draw(cov) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 1000, H = 720, cx = W / 2, cy = H / 2;
    var surfaces = cov.surfaces_order;
    var planned = {}; (cov.planned || []).forEach(function (s) { planned[s] = 1; });

    // defs: soft glow + centre gradient
    var defs = el(SVGNS, 'defs');
    defs.innerHTML =
      '<radialGradient id="cmapCore" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#fff" stop-opacity="0.95"/>' +
        '<stop offset="55%" stop-color="#4d9bff" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="#4d9bff" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<filter id="cmapGlow" x="-60%" y="-60%" width="220%" height="220%">' +
        '<feGaussianBlur stdDeviation="3.2" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>';
    svg.appendChild(defs);

    var N = surfaces.length;
    var R = 250;          // branch length
    var r0 = 78;          // where beads start
    var gStages = el(SVGNS, 'g', {});
    svg.appendChild(gStages);

    surfaces.forEach(function (surface, i) {
      var ang = (-90 + i * (360 / N)) * Math.PI / 180;
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var ex = cx + dx * R, ey = cy + dy * R;
      var isPlanned = !!planned[surface];
      var total = (cov.totals[surface] || {}).total || 0;
      var stagesPresent = cov.stage_order.filter(function (st) {
        return cov.cells[surface] && cov.cells[surface][st];
      });

      // branch — gentle curve (control point offset perpendicular)
      var px = -dy, py = dx;                       // perpendicular
      var mxc = cx + dx * (R * 0.55) + px * 26;
      var myc = cy + dy * (R * 0.55) + py * 26;
      var branch = el(SVGNS, 'path', {
        d: 'M ' + cx + ' ' + cy + ' Q ' + mxc + ' ' + myc + ' ' + ex + ' ' + ey,
        fill: 'none',
        class: 'cmap-branch ' + (isPlanned ? 'is-planned' : 'is-live')
      });
      gStages.appendChild(branch);

      // stage beads along the branch
      if (!isPlanned && stagesPresent.length) {
        var span = R - r0;
        stagesPresent.forEach(function (st, j) {
          var t = stagesPresent.length === 1 ? 0.5 : j / (stagesPresent.length - 1);
          var rr = r0 + t * (span - 6);
          // follow the same quadratic curve for organic placement
          var q = quad(cx, cy, mxc, myc, ex, ey, rr / R);
          var c = cov.cells[surface][st];
          var cls = cellClass(c);
          var rad = Math.min(16, 6 + c.total * 2.4);
          var full = c.validated === c.total && c.total > 0;
          var bead = el(SVGNS, 'circle', {
            cx: q.x, cy: q.y, r: rad,
            class: 'cmap-bead cmap-bead--' + cls + (full ? ' is-val' : ''),
            filter: 'url(#cmapGlow)', tabindex: '0', role: 'button'
          });
          bindTip(bead, surface, st, c);
          gStages.appendChild(bead);
          if (full) {                              // validated ring
            gStages.appendChild(el(SVGNS, 'circle', {
              cx: q.x, cy: q.y, r: rad + 4, class: 'cmap-ring', 'pointer-events': 'none'
            }));
          }
        });
      }

      // surface label node at branch end
      var lg = el(SVGNS, 'g', { class: 'cmap-node ' + (isPlanned ? 'is-planned' : 'is-live') });
      var lw = 96, lh = 34;
      var lx = ex - lw / 2, ly = ey - lh / 2;
      // nudge label outward so it clears the last bead
      lx += dx * 14; ly += dy * 14;
      lg.appendChild(el(SVGNS, 'rect', { x: lx, y: ly, width: lw, height: lh, rx: 8, class: 'cmap-node__box' }));
      var t1 = el(SVGNS, 'text', { x: lx + lw / 2, y: ly + 14, class: 'cmap-node__name', 'text-anchor': 'middle' });
      t1.textContent = SURFACE_LABEL[surface] || surface;
      lg.appendChild(t1);
      var t2 = el(SVGNS, 'text', { x: lx + lw / 2, y: ly + 27, class: 'cmap-node__sub', 'text-anchor': 'middle' });
      t2.textContent = isPlanned ? 'planned' : total + ' skills';
      lg.appendChild(t2);
      if (!isPlanned) bindTipSurface(lg, surface, cov);
      gStages.appendChild(lg);
    });

    // centre core
    svg.appendChild(el(SVGNS, 'circle', { cx: cx, cy: cy, r: 66, fill: 'url(#cmapCore)', 'pointer-events': 'none' }));
    svg.appendChild(el(SVGNS, 'circle', { cx: cx, cy: cy, r: 40, class: 'cmap-core' }));
    var core1 = el(SVGNS, 'text', { x: cx, y: cy - 2, class: 'cmap-core__t', 'text-anchor': 'middle' });
    core1.textContent = 'RedBlue';
    svg.appendChild(core1);
    var core2 = el(SVGNS, 'text', { x: cx, y: cy + 14, class: 'cmap-core__t', 'text-anchor': 'middle' });
    core2.textContent = 'Skills';
    svg.appendChild(core2);
  }

  // point on a quadratic bezier at parameter t
  function quad(x0, y0, x1, y1, x2, y2, t) {
    var u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
      y: u * u * y0 + 2 * u * t * y1 + t * t * y2
    };
  }

  /* ── tooltip ───────────────────────────────────────────────────────── */
  function tipHTML(surface, stage, c) {
    var bits = '<b>' + (SURFACE_LABEL[surface] || surface) + '</b> · ' +
      (STAGE_LABEL[stage] || stage) + '<br>';
    bits += '<span class="cmap__tip-r">' + (c.red || 0) + ' red</span> · ' +
      '<span class="cmap__tip-b">' + (c.blue || 0) + ' blue</span>';
    bits += '<br>' + c.validated + '/' + c.total + ' validation stamps';
    return bits;
  }
  function showTip(html, ev) {
    tip.innerHTML = html;
    tip.hidden = false;
    var box = root.querySelector('.cmap__stage').getBoundingClientRect();
    var x = ev.clientX - box.left, y = ev.clientY - box.top;
    tip.style.left = Math.min(box.width - 150, Math.max(8, x + 14)) + 'px';
    tip.style.top = Math.max(8, y - 10) + 'px';
  }
  function hideTip() { tip.hidden = true; }
  function bindTip(node, surface, stage, c) {
    node.addEventListener('mousemove', function (e) { showTip(tipHTML(surface, stage, c), e); });
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('focus', function () { location.hash = '#library'; });
    node.addEventListener('click', function () { location.hash = '#library'; });
  }
  function bindTipSurface(node, surface, cov) {
    var t = cov.totals[surface];
    var html = '<b>' + (SURFACE_LABEL[surface] || surface) + '</b><br>' +
      t.total + ' skills · ' + t.red + ' red / ' + t.blue + ' blue<br>' +
      t.validated + ' validation stamps';
    node.style.cursor = 'pointer';
    node.addEventListener('mousemove', function (e) { showTip(html, e); });
    node.addEventListener('mouseleave', hideTip);
    node.addEventListener('click', function () { location.hash = '#library'; });
  }

  /* ── the matrix ────────────────────────────────────────────────────── */
  function buildMatrix(cov) {
    var used = cov.stage_order.filter(function (st) {
      return cov.surfaces_order.some(function (s) { return cov.cells[s] && cov.cells[s][st]; });
    });
    var html = '<table class="cmap-tbl"><thead><tr><th></th>';
    used.forEach(function (st) { html += '<th>' + (STAGE_LABEL[st] || st) + '</th>'; });
    html += '<th>total</th></tr></thead><tbody>';
    var planned = {}; (cov.planned || []).forEach(function (s) { planned[s] = 1; });
    cov.surfaces_order.forEach(function (s) {
      var isP = !!planned[s];
      html += '<tr class="' + (isP ? 'is-planned' : '') + '"><th>' +
        (SURFACE_LABEL[s] || s) + (isP ? ' <span class="cmap-tag">planned</span>' : '') + '</th>';
      used.forEach(function (st) {
        var c = cov.cells[s] && cov.cells[s][st];
        if (!c) { html += '<td class="c-dark"></td>'; return; }
        var full = c.validated === c.total;
        html += '<td class="c-' + cellClass(c) + (full ? ' is-val' : '') +
          '" title="' + c.red + ' red / ' + c.blue + ' blue · ' + c.validated + '/' + c.total + ' stamped">' +
          c.total + (full ? '<i>✓</i>' : '') + '</td>';
      });
      var tot = (cov.totals[s] || {}).total || 0;
      html += '<td class="c-total">' + (tot || '·') + '</td></tr>';
    });
    html += '</tbody></table>';
    matrix.innerHTML = html;
  }
})();
