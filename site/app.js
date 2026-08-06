/* =====================================================================
   redblueskills — TTY site behaviour.
   Vanilla, no deps. Owns: status bars, copy, catalog tables, ASCII gauges,
   the coverage tape, and keyboard navigation (j/k/↵//,esc,g/G).
   reader.js owns the #/skill and #/doc routes and reads window.RBS.
   ===================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ─────────────────────────────────────────────────────────────────
     STATUS BARS — clock + scroll position
     ───────────────────────────────────────────────────────────────── */
  var clock = $('[data-clock]');
  if (clock) {
    (function tick() {
      var d = new Date();
      clock.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
      setTimeout(tick, 1000);
    })();
  }

  var posNode = $('[data-pos]');
  var nav = $('#nav');
  var scrollTick = false;

  window.addEventListener('scroll', function () {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      if (posNode) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
        posNode.textContent = pct <= 0 ? 'TOP' : (pct >= 100 ? 'BOT' : pct + '%');
      }
      markCurrentSection();
      scrollTick = false;
    });
  }, { passive: true });

  /* which section the reader is in — highlights the matching tab */
  /* contribute has no tab — including it clears the highlight once past doctrine */
  var sectionIds = ['library', 'attack', 'start', 'doctrine', 'contribute'];
  function markCurrentSection() {
    var here = '';
    sectionIds.forEach(function (id) {
      var node = document.getElementById(id);
      if (node && node.getBoundingClientRect().top <= 140) here = id;
    });
    $$('.tabbar__tabs a').forEach(function (a) {
      a.classList.toggle('is-here', a.getAttribute('href') === '#' + here);
    });
  }

  /* mobile menu */
  var burger = $('[data-burger]');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.tabbar__tabs a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────
     COPY
     ───────────────────────────────────────────────────────────────── */
  var toast = $('[data-toast]');
  var toastTimer;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 1600);
  }

  function legacyCopy(text) {
    var ta = el('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    document.body.removeChild(ta);
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');

    function done() {
      showToast('copied: ' + text);
      btn.classList.add('is-done');
      setTimeout(function () { btn.classList.remove('is-done'); }, 1600);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else {
      legacyCopy(text);
      done();
    }
  });

  /* ─────────────────────────────────────────────────────────────────
     CATALOG
     ───────────────────────────────────────────────────────────────── */
  var ledgerBody = $('[data-ledger]');
  var flatBody = $('[data-flat]');
  var pairsPanel = $('[data-panel="pairs"]');
  var flatPanel = $('[data-panel="flat"]');

  var state = {
    skills: [],
    pairs: [],
    view: 'pairs',
    team: 'all',
    vertical: 'all',
    q: '',
    cursor: -1
  };

  var STAGE_ORDER = ['recon', 'initial-access', 'execution', 'privilege-escalation',
    'credential-access', 'lateral-movement', 'collection', 'exfiltration', 'impact',
    'detect', 'harden', 'respond', 'recover', 'hunt'];

  fetch('./catalog.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { boot(d.skills || []); })
    .catch(function () {
      return fetch('../catalog.json')
        .then(function (r) { return r.json(); })
        .then(function (d) { boot(d.skills || []); });
    })
    .catch(function () {
      if (ledgerBody) {
        ledgerBody.innerHTML = '';
        ledgerBody.appendChild(el('p', 'empty',
          'catalog.json not found — run `make catalog` and copy it beside index.html.'));
      }
    });

  function boot(skills) {
    state.skills = skills;

    // reader.js pulls skill metadata from here for its panel chips
    window.RBS = window.RBS || {};
    window.RBS.skillByName = function (name) {
      for (var i = 0; i < skills.length; i++) {
        if (skills[i].name === name) return skills[i];
      }
      return null;
    };

    state.pairs = buildPairs(skills);

    var verticals = {};
    var red = 0, blue = 0, validated = 0;
    skills.forEach(function (s) {
      verticals[s.app_type] = (verticals[s.app_type] || 0) + 1;
      if (s.team === 'red') red++;
      if (s.team === 'blue') blue++;
      if (s.maturity === 'validated') validated++;
    });

    var total = skills.length;
    gauge('count', total, total);
    gauge('pairs', state.pairs.length, total);
    gauge('red', red, total);
    gauge('blue', blue, total);
    gauge('validated', validated, total);

    setText('[data-sb-count]', total);
    setText('[data-boot-skills]', total);
    setText('[data-boot-pairs]', state.pairs.length);
    setText('[data-boot-val]', validated + '/' + total);

    setText('[data-c-vert-all]', total);
    Object.keys(verticals).forEach(function (v) {
      setText('[data-c-vert-' + v + ']', verticals[v]);
    });

    buildTape(skills);
    wireControls();
    wireKeys();
    render();
    markCurrentSection();

    // Deep link to a skill: reader.js may have already rendered the panel before
    // this catalog landed, in which case it drew the body with no meta chips
    // (they come from skillByName above). Re-fire the route now that we can answer.
    if (window.RBS.content && /^#\/skill\//.test(location.hash)) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }

  function setText(sel, val) {
    var node = $(sel);
    if (node) node.textContent = String(val);
  }

  /* ── ASCII gauge: a count plus a proportional bar of █ and ░ ──────── */
  function gauge(key, value, total) {
    var num = $('[data-stat="' + key + '"]');
    var bar = $('[data-bar="' + key + '"]');
    var WIDTH = 14;
    var filled = total > 0 ? Math.max(1, Math.round((value / total) * WIDTH)) : 0;

    if (bar) {
      bar.innerHTML = '';
      if (key === 'pairs') {
        // the pairs bar is literally half offense, half defense
        var half = Math.ceil(filled / 2);
        bar.appendChild(el('i', 'r', repeat('█', half)));
        bar.appendChild(el('i', 'b', repeat('█', filled - half)));
      } else {
        var tone = key === 'red' ? 'r' : (key === 'blue' || key === 'validated' ? 'b' : '');
        bar.appendChild(el('i', tone, repeat('█', filled)));
      }
      bar.appendChild(document.createTextNode(repeat('░', WIDTH - filled)));
    }
    if (!num) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      num.textContent = pad2(value);
      return;
    }

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(num, value);
        seen.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    seen.observe(num);
  }

  function repeat(ch, n) {
    var out = '';
    for (var i = 0; i < n; i++) out += ch;
    return out;
  }

  function countUp(node, target) {
    var dur = 700, t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      node.textContent = pad2(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /**
   * buildPairs — collapse the flat skill list into red⟷blue pairs.
   * Every red skill here has exactly one blue counterpart, but tolerate
   * stragglers: an unpaired skill still gets a row with one empty side.
   */
  function buildPairs(skills) {
    var byName = {};
    skills.forEach(function (s) { byName[s.name] = s; });

    var pairs = [];
    var claimed = {};

    skills.forEach(function (s) {
      if (s.team !== 'red') return;
      var partner = (s.pairs_with || [])[0];
      var blue = partner ? byName[partner] : null;
      claimed[s.name] = true;
      if (blue) claimed[blue.name] = true;
      pairs.push({ red: s, blue: blue || null });
    });

    skills.forEach(function (s) {
      if (claimed[s.name]) return;
      pairs.push(s.team === 'red' ? { red: s, blue: null } : { red: null, blue: s });
    });

    pairs.sort(function (a, b) {
      var sa = a.red || a.blue, sb = b.red || b.blue;
      // web-app before api: it is the larger, flagship vertical
      var va = sa.app_type === 'web-app' ? 0 : 1;
      var vb = sb.app_type === 'web-app' ? 0 : 1;
      if (va !== vb) return va - vb;
      var ia = STAGE_ORDER.indexOf(sa.stage), ib = STAGE_ORDER.indexOf(sb.stage);
      if (ia !== ib) return ia - ib;
      return String(sa.name).localeCompare(String(sb.name));
    });

    return pairs;
  }

  /* ── coverage tape ────────────────────────────────────────────────── */
  var KIND_LABEL = { attack: 'attack', cwe: 'cwe', owasp: 'owasp', d3fend: 'd3fend', capec: 'capec' };

  function buildTape(skills) {
    var kinds = ['attack', 'cwe', 'owasp', 'd3fend', 'capec'];
    var seen = {};
    var items = [];

    skills.forEach(function (s) {
      kinds.forEach(function (k) {
        ((s.techniques || {})[k] || []).forEach(function (id) {
          var key = k + ':' + id;
          if (seen[key]) return;
          seen[key] = true;
          items.push({ kind: k, id: id });
        });
      });
    });

    if (!items.length) return;
    var half = Math.ceil(items.length / 2);
    fillTape('a', items.slice(0, half));
    fillTape('b', items.slice(half));
  }

  function fillTape(name, items) {
    var track = $('[data-tape="' + name + '"]');
    if (!track || !items.length) return;

    // duplicate the run so the -50% marquee loops seamlessly
    for (var pass = 0; pass < 2; pass++) {
      items.forEach(function (it) {
        var node = el('span', 'tape__i');
        node.setAttribute('data-k', it.kind);
        node.setAttribute('aria-hidden', pass === 1 ? 'true' : 'false');
        node.appendChild(el('b', null, KIND_LABEL[it.kind] + ':'));
        node.appendChild(document.createTextNode(' '));
        node.appendChild(el('em', null, it.id));
        track.appendChild(node);
      });
    }
  }

  /* ── controls ─────────────────────────────────────────────────────── */
  function wireControls() {
    $$('[data-filter]').forEach(function (group) {
      var key = group.getAttribute('data-filter');
      $$('.chk', group).forEach(function (chk) {
        chk.addEventListener('click', function () {
          $$('.chk', group).forEach(function (c) { c.classList.toggle('is-on', c === chk); });
          state[key] = chk.getAttribute('data-val');
          if (key === 'view') {
            pairsPanel.hidden = state.view !== 'pairs';
            flatPanel.hidden = state.view !== 'flat';
          }
          state.cursor = -1;
          render();
        });
      });
    });

    var search = $('[data-search]');
    if (search) {
      search.addEventListener('input', function () {
        state.q = search.value.trim().toLowerCase();
        state.cursor = -1;
        render();
      });
    }
  }

  /* ── keyboard: j/k move, ↵ open, / search, esc clear, g/G ends ────── */
  function wireKeys() {
    var search = $('[data-search]');

    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      var readerOpen = document.body.classList.contains('reader-open');

      if (e.key === 'Escape') {
        if (typing && search && document.activeElement === search) {
          search.value = '';
          state.q = '';
          search.blur();
          render();
        }
        return;
      }

      if (typing || readerOpen || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') { e.preventDefault(); if (search) search.focus(); return; }

      var rows = currentRows();
      if (!rows.length) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        moveCursor(Math.min(state.cursor + 1, rows.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveCursor(Math.max(state.cursor - 1, 0));
      } else if (e.key === 'g') {
        e.preventDefault();
        moveCursor(0);
      } else if (e.key === 'G') {
        e.preventDefault();
        moveCursor(rows.length - 1);
      } else if (e.key === 'Enter' && state.cursor >= 0) {
        var link = rows[state.cursor].querySelector('a[href^="#/skill/"]');
        if (link) { e.preventDefault(); location.hash = link.getAttribute('href'); }
      }
    });
  }

  function currentRows() {
    var body = state.view === 'pairs' ? ledgerBody : flatBody;
    return body ? $$(state.view === 'pairs' ? '.pair' : '.flat', body) : [];
  }

  function moveCursor(next) {
    var rows = currentRows();
    rows.forEach(function (r) { r.classList.remove('is-cursor'); });
    state.cursor = next;
    var row = rows[next];
    if (!row) return;
    row.classList.add('is-cursor');
    var box = row.getBoundingClientRect();
    if (box.top < 90 || box.bottom > window.innerHeight - 60) {
      row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ── matching ─────────────────────────────────────────────────────── */
  function haystack(s) {
    if (s._hay) return s._hay;
    var t = s.techniques || {};
    s._hay = [
      s.name, s.description, s.stage, s.team, s.app_type, s.risk,
      (t.attack || []).join(' '), (t.cwe || []).join(' '), (t.owasp || []).join(' '),
      (t.capec || []).join(' '), (t.d3fend || []).join(' '),
      (s.pairs_with || []).join(' ')
    ].join(' ').toLowerCase();
    return s._hay;
  }

  function skillMatches(s) {
    if (!s) return false;
    if (state.vertical !== 'all' && s.app_type !== state.vertical) return false;
    if (state.q && haystack(s).indexOf(state.q) === -1) return false;
    return true;
  }

  /* A pair is listed when either half matches. The team filter dims a side
     rather than removing rows — hiding one side would defeat the view. */
  function pairMatches(p) {
    var anchor = p.red || p.blue;
    if (state.vertical !== 'all' && anchor.app_type !== state.vertical) return false;
    if (!state.q) return true;
    return skillMatches(p.red) || skillMatches(p.blue);
  }

  /* ── render ───────────────────────────────────────────────────────── */
  function render() {
    if (state.view === 'pairs') renderPairs();
    else renderFlat();
  }

  function renderPairs() {
    if (!ledgerBody) return;

    var rows = state.pairs.filter(pairMatches);
    var table = ledgerBody.closest('.table');
    table.classList.toggle('solo-red', state.team === 'red');
    table.classList.toggle('solo-blue', state.team === 'blue');

    setText('[data-count]', '[ ' + rows.length + ' / ' + state.pairs.length + ' pairs ]');

    ledgerBody.innerHTML = '';
    if (!rows.length) {
      ledgerBody.appendChild(el('p', 'empty', 'no pairs match — clear the filter or search'));
      return;
    }

    var frag = document.createDocumentFragment();
    rows.forEach(function (p, i) { frag.appendChild(pairRow(p, i + 1)); });
    ledgerBody.appendChild(frag);
  }

  function pairRow(p, idx) {
    var row = el('div', 'pair');
    var anchor = p.red || p.blue;

    row.appendChild(el('span', 'pair__idx', pad2(idx)));
    row.appendChild(pairSide(p.red, 'red'));

    // the bond: an ASCII connector, filled in on hover/cursor
    row.appendChild(el('span', 'pair__bond', p.red && p.blue ? '◄────────►' : '── none ──'));

    row.appendChild(pairSide(p.blue, 'blue'));

    var risk = (p.red || anchor).risk || '—';
    var meta = el('div', 'pair__meta');
    meta.appendChild(el('b', null, anchor.app_type));

    var line = el('span');
    var riskNode = el('span', 'risk' + (risk === 'high' || risk === 'critical' ? ' risk--high' : ''), risk);
    line.appendChild(riskNode);
    line.appendChild(document.createTextNode(' · '));
    var date = el('span', isStale(anchor.last_validated) ? 'stale' : null,
      fmtDate(anchor.last_validated) || 'unvalidated');
    line.appendChild(date);
    meta.appendChild(line);
    row.appendChild(meta);

    return row;
  }

  function pairSide(skill, team) {
    if (!skill) {
      var blank = el('span', 'pair__side pair__side--' + team);
      blank.appendChild(el('span', 'pair__name', '—'));
      return blank;
    }

    var a = document.createElement('a');
    a.className = 'pair__side pair__side--' + team;
    a.href = '#/skill/' + encodeURIComponent(skill.name);

    a.appendChild(el('span', 'pair__stage', skill.stage));

    var name = el('span', 'pair__name');
    name.appendChild(el('span', 'mark mark--' + team, team === 'red' ? 'RED' : 'BLU'));
    name.appendChild(el('span', null, skill.name));
    a.appendChild(name);

    var t = skill.techniques || {};
    var ids = (t.attack || []).slice(0, 2)
      .concat((t.owasp || []).slice(0, 1))
      .concat((t.cwe || []).slice(0, 1));

    if (ids.length) {
      var tags = el('span', 'pair__tags');
      ids.forEach(function (id) { tags.appendChild(el('span', null, id)); });
      a.appendChild(tags);
    }
    return a;
  }

  function renderFlat() {
    if (!flatBody) return;

    var rows = state.skills.filter(function (s) {
      if (state.team !== 'all' && s.team !== state.team) return false;
      return skillMatches(s);
    });

    rows.sort(function (a, b) {
      var va = a.app_type === 'web-app' ? 0 : 1;
      var vb = b.app_type === 'web-app' ? 0 : 1;
      if (va !== vb) return va - vb;
      var t = String(a.team).localeCompare(String(b.team));
      if (t) return t;
      var ia = STAGE_ORDER.indexOf(a.stage), ib = STAGE_ORDER.indexOf(b.stage);
      if (ia !== ib) return ia - ib;
      return String(a.name).localeCompare(String(b.name));
    });

    setText('[data-count]', '[ ' + rows.length + ' / ' + state.skills.length + ' skills ]');

    flatBody.innerHTML = '';
    if (!rows.length) {
      flatBody.appendChild(el('p', 'empty', 'no skills match — clear the filter or search'));
      return;
    }

    var frag = document.createDocumentFragment();
    rows.forEach(function (s, i) { frag.appendChild(flatRow(s, i + 1)); });
    flatBody.appendChild(frag);
  }

  function flatRow(s, idx) {
    var a = document.createElement('a');
    a.className = 'flat';
    a.href = '#/skill/' + encodeURIComponent(s.name);

    a.appendChild(el('span', 'flat__idx', pad2(idx)));
    a.appendChild(el('span', 'mark mark--' + (s.team === 'red' ? 'red' : 'blue'),
      s.team === 'red' ? 'RED' : 'BLU'));
    a.appendChild(el('span', 'flat__name', s.name));
    a.appendChild(el('span', 'flat__stage', s.stage));
    a.appendChild(el('span', 'flat__risk' + (s.risk === 'high' || s.risk === 'critical' ? ' flat__risk--high' : ''), s.risk));
    a.appendChild(el('span', 'flat__pair', '◄► ' + ((s.pairs_with || [])[0] || '—')));

    return a;
  }

  /* ── dates ────────────────────────────────────────────────────────── */
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    return m[1] + '-' + MONTHS[+m[2] - 1] + '-' + m[3];
  }

  /* the repo flags a skill stale six months after its last validation */
  function isStale(iso) {
    if (!iso) return true;
    var then = Date.parse(iso);
    if (isNaN(then)) return true;
    return (Date.now() - then) > 1000 * 60 * 60 * 24 * 183;
  }

  /* ─────────────────────────────────────────────────────────────────
     SCROLL REVEAL — sections and panels fade-in as they enter the viewport.
     Uses IntersectionObserver for performance. Respects prefers-reduced-motion.
     ───────────────────────────────────────────────────────────────── */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    /* inject the CSS for the reveal animation once, via a <style> tag */
    var revealStyle = document.createElement('style');
    revealStyle.textContent =
      /* initial hidden state — elements start invisible and slightly below */
      '.reveal{opacity:0;transform:translateY(18px);transition:opacity .55s ease-out,transform .55s ease-out}' +
      /* revealed state — elements become fully visible and move to their natural position */
      '.reveal.is-visible{opacity:1;transform:none}' +
      /* stagger delays for child elements within a revealed container */
      '.reveal-d1{transition-delay:.08s}' +
      '.reveal-d2{transition-delay:.16s}' +
      '.reveal-d3{transition-delay:.24s}';
    document.head.appendChild(revealStyle);

    /* mark all sections, panels, and major content blocks for reveal */
    $$('.sect__head, .panel, .pipe, .tenets, .ex, .steps, .foot__warn, .foot__cta, .foot__grid, .foot__sigil').forEach(function (el) {
      el.classList.add('reveal');
    });

    /* create an observer that triggers the reveal when elements are 15% visible */
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          /* add the visible class to trigger the CSS transition */
          entry.target.classList.add('is-visible');
          /* stop observing once revealed — no need to re-animate */
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    /* observe all marked elements */
    $$('.reveal').forEach(function (el) { revealObs.observe(el); });
  }

})();
