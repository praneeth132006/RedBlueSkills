/* RedBlueSkills — in-site reader.
   Renders SKILL.md and repo docs inside the page from content.json.
   No framework, no deps, no bouncing the reader out to GitHub.

   Routes:  #/skill/<name>   #/doc/<id>   #/docs  (index)
*/
(function () {
  'use strict';

  var content = null;          // { skills, docs, doc_order }
  var pending = null;          // route requested before the bundle landed
  var lastFocus = null;

  /* ------------------------------------------------------------------ *
   * markdown → html (a deliberately small subset: what SKILL.md uses)
   * ------------------------------------------------------------------ */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // inline: code > bold > italic > links. code spans are pulled out first so
  // their contents are never re-parsed as markup.
  function inline(src) {
    var codes = [];
    var s = String(src).replace(/`([^`]+)`/g, function (_, c) {
      codes.push('<code>' + esc(c) + '</code>');
      return '\u0000' + (codes.length - 1) + '\u0000';
    });

    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, href) {
      return '<a href="' + esc(resolveHref(href)) + '"' + extAttrs(href) + '>' + text + '</a>';
    });
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return codes[+i]; });
    return s;
  }

  // A relative link inside a doc points at a repo file. If that file is in the
  // bundle, keep the reader in-site; otherwise leave it alone.
  function resolveHref(href) {
    if (/^(https?:|mailto:|#)/.test(href)) return href;
    var clean = href.replace(/^\.\//, '').split('#')[0];
    var route = routeForPath(clean);
    return route || href;
  }
  function extAttrs(href) {
    return /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
  }
  function routeForPath(path) {
    if (!content) return null;
    var norm = path.replace(/^\/+/, '');
    for (var name in content.skills) {
      if (content.skills[name].path === norm) return '#/skill/' + name;
    }
    for (var id in content.docs) {
      if (content.docs[id].path === norm) return '#/doc/' + id;
    }
    return null;
  }

  function stripFrontmatter(md) {
    var m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
    return m ? { meta: m[1], body: md.slice(m[0].length) } : { meta: '', body: md };
  }

  function render(md) {
    var lines = md.replace(/\r\n/g, '\n').split('\n');
    var out = [];
    var i = 0;

    function flushList(tag, items) {
      out.push('<' + tag + '>' + items.map(function (li) { return '<li>' + inline(li) + '</li>'; }).join('') + '</' + tag + '>');
    }

    // Consume a list, folding lazy continuation lines (a wrapped item that
    // carries on unindented on the next line) into the item they belong to.
    function eatList(src, at, marker, tag) {
      var items = [];
      while (at < src.length) {
        var l = src[at];
        if (marker.test(l)) { items.push(l.replace(marker, '')); at++; continue; }
        var isBreak = !l.trim() ||
          /^(#{1,6}\s|```|>|\||\s*[-*+]\s|\s*\d+[.)]\s)/.test(l) ||
          /^(-{3,}|\*{3,}|_{3,})\s*$/.test(l);
        if (items.length && !isBreak) { items[items.length - 1] += ' ' + l.trim(); at++; continue; }
        break;
      }
      flushList(tag, items);
      return at;
    }

    while (i < lines.length) {
      var line = lines[i];

      // fenced code
      var fence = /^```(\w*)\s*$/.exec(line);
      if (fence) {
        var lang = fence[1] || '';
        var buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // closing fence
        out.push('<pre class="md-pre" data-lang="' + esc(lang) + '"><code>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // table
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        var head = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
        out.push('<div class="md-tablewrap"><table class="md-table"><thead><tr>' +
          head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          }).join('') +
          '</tbody></table></div>');
        continue;
      }

      // heading
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        var lvl = h[1].length;
        out.push('<h' + lvl + ' id="' + slug(h[2]) + '">' + inline(h[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }

      // horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

      // blockquote
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + render(q.join('\n')) + '</blockquote>');
        continue;
      }

      // unordered list (one level of nesting, which is all the docs use)
      if (/^\s*[-*+]\s+/.test(line)) {
        i = eatList(lines, i, /^\s*[-*+]\s+/, 'ul');
        continue;
      }

      // ordered list
      if (/^\s*\d+[.)]\s+/.test(line)) {
        i = eatList(lines, i, /^\s*\d+[.)]\s+/, 'ol');
        continue;
      }

      // blank
      if (!line.trim()) { i++; continue; }

      // paragraph
      var para = [];
      while (i < lines.length && lines[i].trim() &&
             !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|\|)/.test(lines[i]) &&
             !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
      else i++; // safety: never spin
    }
    return out.join('\n');
  }

  function splitRow(line) {
    return line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
  }
  function slug(s) {
    return String(s).toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  /* ------------------------------------------------------------------ *
   * panel
   * ------------------------------------------------------------------ */

  var panel, panelBody, panelTitle, panelKicker, panelPath, panelMeta;

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'reader';
    panel.setAttribute('hidden', '');
    panel.innerHTML =
      '<div class="reader__scrim" data-close></div>' +
      '<article class="reader__panel" role="dialog" aria-modal="true" aria-labelledby="reader-title" tabindex="-1">' +
        '<header class="reader__head">' +
          '<div class="reader__headtext">' +
            '<span class="reader__kicker" data-kicker></span>' +
            '<h2 class="reader__title" id="reader-title" data-title></h2>' +
            '<code class="reader__path" data-path></code>' +
          '</div>' +
          '<button class="reader__close" type="button" data-close aria-label="Close">esc</button>' +
        '</header>' +
        '<div class="reader__meta" data-meta hidden></div>' +
        '<div class="reader__body md" data-body></div>' +
      '</article>';
    document.body.appendChild(panel);

    panelBody = panel.querySelector('[data-body]');
    panelTitle = panel.querySelector('[data-title]');
    panelKicker = panel.querySelector('[data-kicker]');
    panelPath = panel.querySelector('[data-path]');
    panelMeta = panel.querySelector('[data-meta]');

    panel.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hasAttribute('hidden')) close();
    });
  }

  /* open the reader panel — triggers CSS slide-in animation automatically */
  function open() {
    if (panel.hasAttribute('hidden')) {
      /* save the element that had focus so we can restore it on close */
      lastFocus = document.activeElement;
      /* remove the closing class in case a previous close was interrupted */
      panel.classList.remove('is-closing');
      /* show the panel — CSS animations (panelSlideIn + scrimIn) play immediately */
      panel.removeAttribute('hidden');
      /* lock the body scroll so the page doesn't scroll behind the panel */
      document.body.classList.add('reader-open');
    }
    /* focus the panel for keyboard accessibility */
    panel.querySelector('.reader__panel').focus();
  }

  /* close the reader panel — plays CSS slide-out animation before hiding */
  function close() {
    if (panel.hasAttribute('hidden')) return;
    /* add the closing class which triggers panelSlideOut + scrimOut CSS animations */
    panel.classList.add('is-closing');
    /* listen for the slide-out animation to finish before actually hiding the panel */
    var readerPanel = panel.querySelector('.reader__panel');
    function onAnimEnd() {
      readerPanel.removeEventListener('animationend', onAnimEnd);
      /* now hide the panel in the DOM */
      panel.setAttribute('hidden', '');
      panel.classList.remove('is-closing');
      /* unlock body scroll */
      document.body.classList.remove('reader-open');
      /* clean up the URL hash so navigation state stays consistent */
      if (location.hash.indexOf('#/') === 0) {
        history.pushState('', document.title, location.pathname + location.search);
      }
      /* restore focus to the element that opened the panel */
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    readerPanel.addEventListener('animationend', onAnimEnd);
  }

  function show(kicker, title, path, metaHtml, markdown) {
    panelKicker.textContent = kicker;
    panelTitle.textContent = title;
    panelPath.textContent = path;
    if (metaHtml) { panelMeta.innerHTML = metaHtml; panelMeta.removeAttribute('hidden'); }
    else { panelMeta.innerHTML = ''; panelMeta.setAttribute('hidden', ''); }
    panelBody.innerHTML = render(stripFrontmatter(markdown).body);
    panelBody.scrollTop = 0;
    panel.querySelector('.reader__panel').scrollTop = 0;
    open();
  }

  /* ------------------------------------------------------------------ *
   * views
   * ------------------------------------------------------------------ */

  function skillMeta(entry) {
    if (!entry) return '';
    var t = entry.techniques || {};
    var bits = [];
    function chip(label, val, cls) {
      if (!val) return;
      bits.push('<span class="rmeta ' + (cls || '') + '"><b>' + esc(label) + '</b>' + esc(val) + '</span>');
    }
    chip('team', entry.team, 'rmeta--' + entry.team);
    chip('stage', entry.stage);
    chip('risk', entry.risk, 'rmeta--risk-' + entry.risk);
    chip('auth', entry.authorization);
    chip('maturity', entry.maturity);
    chip('version', entry.version);
    chip('validated', entry.last_validated);
    ['attack', 'cwe', 'owasp', 'capec', 'd3fend'].forEach(function (k) {
      if (t[k] && t[k].length) chip(k, t[k].join(' · '));
    });
    if (entry.pairs_with && entry.pairs_with.length) {
      bits.push('<span class="rmeta"><b>pairs with</b>' + entry.pairs_with.map(function (p) {
        return '<a href="#/skill/' + esc(p) + '">' + esc(p) + '</a>';
      }).join(', ') + '</span>');
    }
    return bits.join('');
  }

  function openSkill(name) {
    var s = content.skills[name];
    if (!s) return notFound('skill', name);
    var entry = (window.RBS && window.RBS.skillByName && window.RBS.skillByName(name)) || null;
    show(entry ? entry.team + ' · ' + entry.stage : 'skill', name, s.path, skillMeta(entry), s.body);
  }

  function openDoc(id) {
    var d = content.docs[id];
    if (!d) return notFound('doc', id);
    show('doc', d.title, d.path, '', d.body);
  }

  function openDocIndex() {
    var items = content.doc_order.map(function (id) {
      var d = content.docs[id];
      return '<li><a href="#/doc/' + esc(id) + '"><b>' + esc(d.title) + '</b><span>' + esc(d.blurb) + '</span>' +
             '<code>' + esc(d.path) + '</code></a></li>';
    }).join('');
    panelKicker.textContent = 'library';
    panelTitle.textContent = 'Documentation';
    panelPath.textContent = 'everything, readable right here';
    panelMeta.innerHTML = ''; panelMeta.setAttribute('hidden', '');
    panelBody.innerHTML = '<ul class="doclist">' + items + '</ul>';
    open();
  }

  function notFound(kind, id) {
    show('404', 'Not found', kind + '/' + id,
      '', 'Nothing in the bundle matches `' + id + '`. Try the [documentation index](#/docs).');
  }

  function openSkillIndex() {
    var items = Object.keys(content.skills).sort().map(function (name) {
      var s = content.skills[name];
      // Try to parse basic meta from the markdown frontmatter for styling
      var teamMatch = s.body.match(/team:\s*(red|blue)/i);
      var teamStr = teamMatch ? teamMatch[1].toLowerCase() : 'red';
      var stageMatch = s.body.match(/stage:\s*([^\r\n]+)/i);
      var stageStr = stageMatch ? stageMatch[1] : '';
      
      return '<a href="#/skill/' + esc(name) + '" class="skill-card skill-card--' + teamStr + '">' +
               '<div class="skill-card__head">' +
                 '<span class="rmeta rmeta--' + teamStr + '"><b>' + teamStr.toUpperCase() + '</b></span>' +
                 '<span class="skill-card__title">' + esc(name) + '</span>' +
               '</div>' +
               '<div class="skill-card__stage">' + esc(stageStr) + '</div>' +
               '<div class="skill-card__path">' + esc(s.path) + '</div>' +
             '</a>';
    }).join('');
    panelKicker.textContent = 'catalog';
    panelTitle.textContent = 'All Skills';
    panelPath.textContent = 'complete index of offensive and defensive capabilities';
    panelMeta.innerHTML = ''; panelMeta.setAttribute('hidden', '');
    panelBody.innerHTML = '<div class="skill-grid">' + items + '</div>';
    open();
  }

  /* ------------------------------------------------------------------ *
   * router
   * ------------------------------------------------------------------ */

  function route() {
    var h = location.hash || '';
    if (h.indexOf('#/') !== 0) { close(); return; }
    if (!content) { pending = h; return; }

    var m;
    if ((m = /^#\/skill\/(.+)$/.exec(h))) return openSkill(decodeURIComponent(m[1]));
    if ((m = /^#\/doc\/(.+)$/.exec(h))) return openDoc(decodeURIComponent(m[1]));
    if (/^#\/docs\/?$/.test(h)) return openDocIndex();
    if (/^#\/skills\/?$/.test(h)) return openSkillIndex();
    close();
  }

  buildPanel();
  window.addEventListener('hashchange', route);

  fetch('./content.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      content = data;
      window.RBS = window.RBS || {};
      window.RBS.content = content;
      document.body.classList.add('has-content');
      if (pending) { pending = null; }
      route();
    })
    .catch(function () {
      // The site still works without the bundle — links just won't open in-page.
      document.body.classList.add('no-content');
      console.warn('[reader] content.json missing — run `make site-build`');
    });
})();
