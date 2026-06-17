(function () {
  var path = window.location.pathname;
  var isInBlog = path.indexOf('/blog/') !== -1;
  var prefix = isInBlog ? '../' : '';
  var filename = path.split('/').pop() || '';

  var isKontakt = filename === 'kontakt.html';
  var isVideo = /^video-/.test(filename);
  var isPlan = isInBlog && !isVideo;
  var isIndex = !isKontakt && !isInBlog;

  function a(cond) { return cond ? ' class="active"' : ''; }

  var headerEl = document.querySelector('header');
  if (!headerEl) return;

  headerEl.innerHTML =
    '<a class="logo" href="' + prefix + 'index.html">' +
      '<img src="' + prefix + 'img/logos/lokalt-beredskab-icon.png" alt="Lokalt Beredskab logo">' +
      '<span class="logo-text">Lokalt<br>Beredskab</span>' +
    '</a>' +
    '<button class="burger" aria-label="Åbn menu" aria-expanded="false">' +
      '<span></span><span></span><span></span>' +
    '</button>' +
    '<nav>' +
      '<a href="' + prefix + 'index.html"' + a(isIndex) + '>Hjem</a>' +
      '<a href="' + prefix + 'index.html#beredskabsplaner"' + a(isPlan) + '>Planer</a>' +
      '<a href="' + prefix + 'index.html#videoer"' + a(isVideo) + '>Videoer</a>' +
      '<a href="' + prefix + 'index.html#ekstremvejr">Ekstremvejr</a>' +
      '<a href="' + prefix + 'index.html#om">Om</a>' +
      '<a href="' + prefix + 'kontakt.html"' + a(isKontakt) + '>Kontakt</a>' +
    '</nav>';

  var burger = headerEl.querySelector('.burger');

  burger.addEventListener('click', function () {
    var open = headerEl.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  headerEl.querySelectorAll('nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      headerEl.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  if (!isIndex) return;

  // Scroll-driven active state on index.html
  var navLinks = Array.from(headerEl.querySelectorAll('nav a'));
  var sectionIds = ['beredskabsplaner', 'videoer', 'ekstremvejr', 'om'];

  function setActive(hash) {
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      var match = hash ? href === 'index.html' + hash : href === 'index.html';
      link.classList.toggle('active', match);
    });
  }

  setActive(window.location.hash);

  window.addEventListener('hashchange', function () {
    setActive(window.location.hash);
  });

  function setupObserver() {
    var visible = new Set();

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visible.add(entry.target.id);
        } else {
          visible.delete(entry.target.id);
        }
      });
      var activeId = null;
      for (var i = 0; i < sectionIds.length; i++) {
        if (visible.has(sectionIds[i])) { activeId = sectionIds[i]; break; }
      }
      setActive(activeId ? '#' + activeId : '');
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });

    sectionIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  if ('IntersectionObserver' in window) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupObserver);
    } else {
      setupObserver();
    }
  }
})();
