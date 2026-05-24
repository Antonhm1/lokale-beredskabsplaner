(function () {
  var lb, lbImg, lbPrev, lbNext, slides, current;

  function buildLightbox() {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML =
      '<button class="lb-prev" aria-label="Forrige">&#8249;</button>' +
      '<img class="lb-img" alt="">' +
      '<button class="lb-next" aria-label="Næste">&#8250;</button>';
    document.body.appendChild(lb);

    lbImg  = lb.querySelector('.lb-img');
    lbPrev = lb.querySelector('.lb-prev');
    lbNext = lb.querySelector('.lb-next');

    lbPrev.addEventListener('click', function (e) { e.stopPropagation(); go(current - 1); });
    lbNext.addEventListener('click', function (e) { e.stopPropagation(); go(current + 1); });

    lb.addEventListener('click', function (e) {
      if (e.target === lb) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape')      close();
      if (e.key === 'ArrowLeft')   go(current - 1);
      if (e.key === 'ArrowRight')  go(current + 1);
    });
  }

  function open(index) {
    current = index;
    lbImg.src = slides[current];
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateNav();
  }

  function close() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function go(index) {
    current = (index + slides.length) % slides.length;
    lbImg.src = slides[current];
    updateNav();
  }

  function updateNav() {
    var show = slides.length > 1 ? 'visible' : 'hidden';
    lbPrev.style.visibility = show;
    lbNext.style.visibility = show;
  }

  function initSlides() {
    var grid = document.querySelector('.slides-grid');
    if (!grid) return;

    var links = Array.from(grid.querySelectorAll('a'));
    slides = links.map(function (a) { return a.href; });

    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        open(i);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildLightbox();
    initSlides();
  });
})();
