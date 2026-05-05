/* UKUMARI — interacciones generales */

// Navbar con sombra al hacer scroll
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.uku-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

// Reveal-on-scroll
document.addEventListener('DOMContentLoaded', () => {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
});

// Contadores numéricos animados
document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const dur = 1400; const start = performance.now();
    const suffix = el.dataset.suffix || '';
    const isFloat = target % 1 !== 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      el.textContent = (isFloat ? v.toFixed(1) : Math.floor(v).toLocaleString()) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = (isFloat ? target.toFixed(1) : target.toLocaleString()) + suffix;
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.4 });
  counters.forEach(c => io.observe(c));
});

// Swiper home
document.addEventListener('DOMContentLoaded', () => {
  const swiperEl = document.querySelector('.uku-swiper');
  if (swiperEl && window.Swiper) {
    new Swiper(swiperEl, {
      loop: true,
      autoplay: { delay: 5000, disableOnInteraction: false },
      pagination: { el: '.uku-swiper .swiper-pagination', clickable: true },
      navigation: { nextEl: '.uku-swiper .swiper-button-next', prevEl: '.uku-swiper .swiper-button-prev' },
      slidesPerView: 1,
      spaceBetween: 16,
      breakpoints: { 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } }
    });
  }

  // Botón "Agregar" carta
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = {
        id: parseInt(btn.dataset.id, 10),
        nombre: btn.dataset.nombre,
        precio: parseFloat(btn.dataset.precio),
        qty: 1
      };
      Cart.add(p);
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `${p.nombre} agregado`,
        showConfirmButton: false, timer: 1600, timerProgressBar: true
      });
    });
  });

  // Filtros + buscador en la carta digital
  const search = document.getElementById('menuSearch');
  const searchClear = document.getElementById('menuSearchClear');
  const searchEmpty = document.getElementById('searchEmpty');
  let activeCat = 'all';

  function applyMenuFilter() {
    const q = (search?.value || '').trim().toLowerCase();
    let totalVisible = 0;
    document.querySelectorAll('.menu-cat').forEach(sec => {
      const catMatch = (activeCat === 'all' || sec.dataset.cat === activeCat);
      let visibleInCat = 0;
      sec.querySelectorAll('.menu-item-wrap').forEach(item => {
        const matches = !q
          || item.dataset.name.includes(q)
          || (item.dataset.desc && item.dataset.desc.includes(q));
        const show = catMatch && matches;
        item.style.display = show ? '' : 'none';
        if (show) visibleInCat++;
      });
      sec.style.display = (catMatch && visibleInCat > 0) ? '' : 'none';
      totalVisible += visibleInCat;
    });
    if (searchEmpty) searchEmpty.style.display = (q && totalVisible === 0) ? 'block' : 'none';
  }

  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      e.preventDefault();
      activeCat = pill.dataset.cat;
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyMenuFilter();
    });
  });

  if (search) {
    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyMenuFilter, 80); });
    searchClear?.addEventListener('click', () => {
      search.value = '';
      applyMenuFilter();
      search.focus();
    });
  }

  // Scroll-spy: resalta la píldora de la categoría visible (solo si filtro = "all")
  const catSections = document.querySelectorAll('.menu-cat');
  const pills = document.querySelectorAll('.cat-pill');
  if (catSections.length && pills.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      if (activeCat !== 'all') return; // sólo cuando se ven todas
      entries.forEach(en => {
        if (en.isIntersecting) {
          const cat = en.target.dataset.cat;
          pills.forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
        }
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    catSections.forEach(s => spy.observe(s));
  }
});
