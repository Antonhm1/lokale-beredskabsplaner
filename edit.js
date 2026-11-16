// Simpel inline-tekstredigering.
// Gør intet for almindelige besøgende. Hvis man er logget ind via login.html (GitHub-token i
// localStorage), kan alle elementer med attributten `data-edit` redigeres, og "Gem" laver et
// commit direkte i GitHub-repoet. GitHub Pages udgiver ændringen efter ca. 1 minut.
(function () {
  var REPO = 'Antonhm1/lokale-beredskabsplaner';
  var TOKEN_KEY = 'lb-edit-token';

  var token = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
  if (!token) return;

  var isInBlog = location.pathname.indexOf('/blog/') !== -1;
  var prefix = isInBlog ? '../' : '';

  function norm(s) {
    return String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  }
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function decodeHtml(html) {
    return new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html').body.textContent;
  }

  function filePath() {
    var p = decodeURIComponent(location.pathname).replace(/^\/+/, '');
    if (p === '' || p.endsWith('/')) p += 'index.html';
    else if (!/\.html?$/.test(p)) p += '.html';
    return p;
  }

  function b64ToUtf8(b64) {
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  // Finder alle elementer med data-edit i kildeteksten: [{innerStart, innerEnd}]
  function findEditable(src) {
    var re = /<([a-zA-Z][\w-]*)(\s[^>]*)?>/g;
    var found = [];
    var m;
    while ((m = re.exec(src))) {
      if (!m[2] || !/\sdata-edit(?=[\s=>\/]|$)/.test(m[2])) continue;
      var innerStart = m.index + m[0].length;
      var innerEnd = src.toLowerCase().indexOf('</' + m[1].toLowerCase() + '>', innerStart);
      if (innerEnd === -1) throw new Error('Mangler lukketag for <' + m[1] + '>');
      found.push({ innerStart: innerStart, innerEnd: innerEnd });
    }
    return found;
  }

  function api(method, url, body) {
    return fetch('https://api.github.com/repos/' + REPO + url, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      if (res.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
        alertBar('Login er udløbet – log ind igen.', true);
        setTimeout(function () { location.href = prefix + 'login.html'; }, 1500);
        throw new Error('401');
      }
      if (!res.ok) {
        return res.text().then(function (t) { throw new Error('GitHub svarede ' + res.status + ': ' + t.slice(0, 200)); });
      }
      return res.json();
    });
  }

  // ---------- UI ----------
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-edit]'));
  els.forEach(function (el) {
    el.dataset.editOriginal = el.textContent;
    el.setAttribute('contenteditable', 'plaintext-only');
    if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'true');
  });

  var bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML =
    '<span class="edit-bar-label">Redigeringstilstand</span>' +
    '<span class="edit-bar-status" aria-live="polite">Klik på en tekst for at rette den.</span>' +
    '<button type="button" class="edit-bar-save" disabled>Gem ændringer</button>' +
    '<button type="button" class="edit-bar-undo" disabled>Fortryd</button>' +
    '<button type="button" class="edit-bar-logout">Log ud</button>';
  document.body.appendChild(bar);
  document.body.classList.add('edit-mode');

  var saveBtn = bar.querySelector('.edit-bar-save');
  var undoBtn = bar.querySelector('.edit-bar-undo');
  var statusEl = bar.querySelector('.edit-bar-status');

  function alertBar(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('edit-bar-error', !!isError);
  }

  function changed() {
    return els.filter(function (el) { return norm(el.textContent) !== norm(el.dataset.editOriginal); });
  }

  function refresh() {
    var n = changed().length;
    saveBtn.disabled = n === 0;
    undoBtn.disabled = n === 0;
    saveBtn.textContent = n ? 'Gem ændringer (' + n + ')' : 'Gem ændringer';
    els.forEach(function (el) {
      el.classList.toggle('edit-changed', norm(el.textContent) !== norm(el.dataset.editOriginal));
    });
  }

  document.addEventListener('input', function (e) {
    if (e.target.closest && e.target.closest('[data-edit]')) refresh();
  });

  // Enter = færdig med feltet (ingen linjeskift)
  document.addEventListener('keydown', function (e) {
    var el = e.target.closest && e.target.closest('[data-edit]');
    if (el && e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (!saveBtn.disabled) save(); }
  });

  // Indsæt altid som ren tekst (for browsere uden plaintext-only)
  document.addEventListener('paste', function (e) {
    if (!(e.target.closest && e.target.closest('[data-edit]'))) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });

  // Klik i en redigerbar tekst inde i et link må ikke skifte side
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-edit]');
    if (el && (el.tagName === 'A' || el.closest('a'))) e.preventDefault();
  }, true);

  window.addEventListener('beforeunload', function (e) {
    if (changed().length) { e.preventDefault(); e.returnValue = ''; }
  });

  undoBtn.addEventListener('click', function () {
    changed().forEach(function (el) { el.textContent = el.dataset.editOriginal; });
    refresh();
    alertBar('Ændringerne er fortrudt.');
  });

  bar.querySelector('.edit-bar-logout').addEventListener('click', function () {
    if (changed().length && !window.confirm('Du har ændringer, der ikke er gemt. Log ud alligevel?')) return;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    location.reload();
  });

  saveBtn.addEventListener('click', save);

  function save() {
    var path = filePath();
    var toSave = changed();
    if (!toSave.length) return;
    saveBtn.disabled = true;
    alertBar('Gemmer …');

    api('GET', '/contents/' + encodeURI(path)).then(function (file) {
      var src = b64ToUtf8(file.content);
      var found = findEditable(src);
      if (found.length !== els.length) throw new Error('STALE');

      var replacements = [];
      toSave.forEach(function (el) {
        var i = els.indexOf(el);
        var f = found[i];
        if (norm(decodeHtml(src.slice(f.innerStart, f.innerEnd))) !== norm(el.dataset.editOriginal)) {
          throw new Error('STALE');
        }
        replacements.push({ f: f, text: escapeHtml(norm(el.textContent)) });
      });
      // erstat bagfra, så positionerne passer
      replacements.sort(function (a, b) { return b.f.innerStart - a.f.innerStart; });
      replacements.forEach(function (r) {
        src = src.slice(0, r.f.innerStart) + r.text + src.slice(r.f.innerEnd);
      });

      return api('PUT', '/contents/' + encodeURI(path), {
        message: 'Tekst opdateret via editor: ' + path,
        content: utf8ToB64(src),
        sha: file.sha
      });
    }).then(function () {
      toSave.forEach(function (el) { el.dataset.editOriginal = el.textContent = norm(el.textContent); });
      refresh();
      alertBar('Gemt ✓ – siden på nettet er opdateret om ca. 1 minut.');
    }).catch(function (err) {
      if (err.message === '401') return;
      if (err.message === 'STALE' || /\b409\b/.test(err.message)) {
        alertBar('Siden er blevet ændret, siden du åbnede den. Kopiér din tekst, genindlæs siden og prøv igen.', true);
      } else {
        alertBar('Kunne ikke gemme: ' + err.message, true);
      }
      refresh();
    });
  }
})();
