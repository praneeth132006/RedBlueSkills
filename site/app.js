/* RedBlueSkills site — no framework, no deps. */
(function () {
  'use strict';

  var GH_SKILL = 'https://github.com/Security-Environment/RedBlueSkills/blob/main/';

  // ---- copy-to-clipboard buttons ----
  var toast = document.querySelector('[data-toast]');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg || 'copied';
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 1400);
  }
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { showToast('copied  ·  ' + text); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---- animate a number up ----
  function animateTo(el, target) {
    if (!el) return;
    var start = 0, dur = 900, t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(start + (target - start) * eased)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---- scroll reveal ----
  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12 })
    : null;
  function reveal(el) { if (!el) return; el.classList.add('reveal'); if (io) io.observe(el); else el.classList.add('in'); }
  document.querySelectorAll('.section-head, .install__grid, .flow__step, .doctrine__grid article, .stats').forEach(reveal);

  // ---- load catalog & render ----
  var grid = document.querySelector('[data-grid]');
  var state = { skills: [], team: 'all', q: '', showAll: false };

  fetch('./catalog.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { boot(data.skills || []); })
    .catch(function () {
      // fallback: repo root (when the whole repo is served)
      fetch('../catalog.json').then(function (r) { return r.json(); })
        .then(function (d) { boot(d.skills || []); })
        .catch(function () {
          if (grid) grid.innerHTML = '<p class="grid__loading">catalog.json not found — run <code>make catalog</code> and copy it beside index.html.</p>';
        });
    });

  function boot(skills) {
    state.skills = skills;
    // stats
    var red = skills.filter(function (s) { return s.team === 'red'; }).length;
    var blue = skills.filter(function (s) { return s.team === 'blue'; }).length;
    var pairs = 0, seen = {};
    skills.forEach(function (s) {
      (s.pairs_with || []).forEach(function (p) {
        var key = [s.name, p].sort().join('::');
        if (!seen[key]) { seen[key] = 1; pairs++; }
      });
    });
    setStat('count', skills.length); setStat('red', red); setStat('blue', blue); setStat('pairs', pairs);
    var heroCount = document.querySelector('[data-count-hero]');
    if (heroCount) heroCount.textContent = skills.length + ' SKILLS';
    var total = document.querySelector('[data-total]');
    if (total) total.textContent = String(skills.length);

    wireFilters();
    render();
  }

  // most-recently validated first, then name
  function byLatest(a, b) {
    var d = String(b.last_validated || '').localeCompare(String(a.last_validated || ''));
    return d || String(a.name).localeCompare(String(b.name));
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2] - 1];
    return mon + ' ' + (+m[3]) + ', ' + m[1];
  }

  function setStat(key, val) {
    var el = document.querySelector('[data-stat="' + key + '"]');
    if (el) {
      if (io) {
        var once = new IntersectionObserver(function (en) {
          en.forEach(function (e) { if (e.isIntersecting) { animateTo(el, val); once.unobserve(e.target); } });
        }, { threshold: 0.5 });
        once.observe(el);
      } else { el.textContent = String(val).padStart(2, '0'); }
    }
  }

  function wireFilters() {
    document.querySelectorAll('[data-filter-group="team"] .chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-filter-group="team"] .chip').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        state.team = btn.getAttribute('data-team');
        render();
      });
    });
    var search = document.querySelector('[data-search]');
    if (search) search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); render(); });

    var toggle = document.querySelector('[data-toggle-all]');
    if (toggle) toggle.addEventListener('click', function () {
      state.showAll = !state.showAll;
      toggle.textContent = state.showAll ? 'Show latest only' : 'Show all skills';
      render();
    });
  }

  function matches(s) {
    if (state.team !== 'all' && s.team !== state.team) return false;
    if (!state.q) return true;
    var hay = [s.name, s.description, s.stage, s.team,
      ((s.techniques || {}).attack || []).join(' '),
      ((s.techniques || {}).cwe || []).join(' '),
      ((s.techniques || {}).owasp || []).join(' '),
      (s.pairs_with || []).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(state.q) !== -1;
  }

  var STAGE_ORDER = ['recon', 'initial-access', 'execution', 'privilege-escalation',
    'credential-access', 'lateral-movement', 'collection', 'exfiltration', 'impact',
    'detect', 'harden', 'respond', 'recover', 'hunt'];

  function byStage(a, b) {
    var d = (a.team || '').localeCompare(b.team || '');
    if (d) return d;
    var sa = STAGE_ORDER.indexOf(a.stage), sb = STAGE_ORDER.indexOf(b.stage);
    if (sa !== sb) return sa - sb;
    return String(a.name).localeCompare(String(b.name));
  }

  function render() {
    if (!grid) return;
    var filtered = state.skills.filter(matches);
    // A filter/search or the "show all" toggle switches to the full browsable view;
    // otherwise show the 6 most-recently validated as a featured teaser.
    var isBrowsing = state.showAll || state.team !== 'all' || !!state.q;
    var rows = isBrowsing ? filtered.slice().sort(byStage) : filtered.slice().sort(byLatest).slice(0, 6);

    var cnt = document.querySelector('[data-visible-count]');
    if (cnt) cnt.textContent = '[ ' + rows.length + ' of ' + state.skills.length + ' ]';

    var toggle = document.querySelector('[data-toggle-all]');
    if (toggle) toggle.style.display = (state.team !== 'all' || state.q) ? 'none' : '';

    grid.innerHTML = '';
    if (!rows.length) { grid.innerHTML = '<p class="grid__loading">no skills match — clear the filter or search.</p>'; return; }
    rows.forEach(function (s) { grid.appendChild(cardFor(s)); });
  }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function cardFor(s) {
    var a = document.createElement('a');
    a.className = 'card card--' + s.team;
    a.href = GH_SKILL + s.path;
    a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('data-name', s.name);
    a.setAttribute('data-pairs', (s.pairs_with || []).join(','));

    var top = el('div', 'card__top');
    top.appendChild(el('span', 'card__team', '<span class="dot"></span>' + s.team));
    top.appendChild(el('span', 'card__risk', s.risk)).setAttribute('data-r', s.risk);
    a.appendChild(top);

    a.appendChild(el('h3', 'card__name', s.name));
    a.appendChild(el('p', 'card__desc', escapeHtml(s.description || '')));

    var attack = ((s.techniques || {}).attack || []);
    var owasp = ((s.techniques || {}).owasp || []);
    if (attack.length || owasp.length) {
      var tags = el('div', 'card__tags');
      attack.slice(0, 3).forEach(function (t) { tags.appendChild(el('span', 'tag', t)); });
      owasp.slice(0, 1).forEach(function (t) { tags.appendChild(el('span', 'tag', t)); });
      a.appendChild(tags);
    }

    var foot = el('div', 'card__foot');
    foot.appendChild(el('span', 'card__stage', s.stage));
    var pair = el('span', 'card__pair');
    pair.innerHTML = '↔&nbsp;<b>' + escapeHtml((s.pairs_with || [])[0] || '—') + '</b>';
    foot.appendChild(pair);
    a.appendChild(foot);

    if (s.last_validated) {
      var stamp = el('div', 'card__val');
      stamp.innerHTML = '<span class="card__valdot"></span>validated · ' + escapeHtml(fmtDate(s.last_validated));
      a.appendChild(stamp);
    }

    // pairing highlight
    a.addEventListener('mouseenter', function () { highlightPairs(s, true); });
    a.addEventListener('mouseleave', function () { highlightPairs(s, false); });
    return a;
  }

  function highlightPairs(s, on) {
    if (!on) {
      document.querySelectorAll('.card').forEach(function (c) { c.classList.remove('is-paired', 'is-dim'); });
      return;
    }
    var partners = (s.pairs_with || []);
    document.querySelectorAll('.card').forEach(function (c) {
      var name = c.getAttribute('data-name');
      if (name === s.name || partners.indexOf(name) !== -1) c.classList.add('is-paired');
      else c.classList.add('is-dim');
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
})();
