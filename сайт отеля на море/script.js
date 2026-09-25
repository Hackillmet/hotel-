
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORAGE = "yuan_reviews_v2";
  const initial = Array.isArray(window.INITIAL_REVIEWS) ? window.INITIAL_REVIEWS : [];
  let allReviews = [];
  let filter = "all";
  let shown = 6;

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function stars(n) {
    n = Math.max(1, Math.min(5, Number(n) || 5));
    return "★".repeat(n) + "☆".repeat(5-n);
  }
  function avatar(name) {
    const clean = String(name || "Г").trim();
    return esc(clean.slice(0,1).toUpperCase());
  }
  function getReviews() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE));
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return initial.map(x => ({...x}));
  }
  function saveReviews(items) {
    localStorage.setItem(STORAGE, JSON.stringify(items));
  }
  function filtered() {
    return filter === "all" ? allReviews : allReviews.filter(r => Number(r.rating) === Number(filter));
  }
  function render() {
    const list = $("#reviewsList");
    const items = filtered();
    const visible = items.slice(0, shown);
    $("#reviewCount").textContent = items.length;
    if (!visible.length) {
      list.innerHTML = `<div class="empty-review">По этому фильтру отзывов пока нет.</div>`;
      $("#showMore").style.display = "none";
      return;
    }
    list.innerHTML = visible.map((r,i) => `
      <article class="review-card ${i < 2 ? "new" : ""}">
        <div class="review-top">
          <div class="review-author">
            <div class="avatar">${avatar(r.name)}</div>
            <div><div class="review-name">${esc(r.name)}</div><div class="review-date">${esc(r.date)}</div></div>
          </div>
          <div class="mini-stars">${stars(r.rating)}</div>
        </div>
        <div class="review-stars">${stars(r.rating)}</div>
        <p>${esc(r.text)}</p>
        <div class="source">${esc(r.source || "Отзыв гостя")}</div>
      </article>
    `).join("");
    $("#showMore").style.display = items.length > shown ? "inline-flex" : "none";

    // The review list is rendered dynamically, so the IntersectionObserver
    // may have already fired before these cards existed. Reveal them here
    // after every render instead of leaving them at opacity: 0.
    const cards = [...list.querySelectorAll(".review-card")];
    requestAnimationFrame(() => {
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add("card-visible"), i * 55);
      });
    });
  }

  // Header + mobile menu
  $("#burger").addEventListener("click", () => $(".nav").classList.toggle("menu-open"));
  $$('nav a').forEach(a => a.addEventListener("click", () => $(".nav").classList.remove("menu-open")));

  // Scroll progress
  const progress = $("#progress");
  addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${h ? scrollY / h * 100 : 0}%`;
  }, {passive:true});

  // Reveal animations
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:.12});
  $$(".reveal").forEach(el => observer.observe(el));

  // Gallery lightbox
  const lightbox = $("#lightbox");
  $$(".photo").forEach(card => card.addEventListener("click", () => {
    $("#lightboxImg").src = card.dataset.image;
    $("#lightboxTitle").textContent = card.dataset.title;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden","false");
  }));
  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden","true");
  }
  $("#closeLightbox").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });

  // Reviews
  allReviews = getReviews();
  render();

  $$(".filter").forEach(btn => btn.addEventListener("click", () => {
    $$(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    shown = 6;
    render();
  }));
  $("#showMore").addEventListener("click", () => { shown += 6; render(); });

  // Modal
  const modal = $("#reviewModal");
  function openModal() { modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
  function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
  $("#openReview").addEventListener("click", openModal);
  $("#closeReview").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if(e.target === modal) closeModal(); });

  // Star picker
  const starButtons = $$("#starPicker button");
  const ratingInput = $('#reviewForm input[name="rating"]');
  starButtons.forEach(btn => btn.addEventListener("click", () => {
    const value = Number(btn.dataset.value);
    ratingInput.value = value;
    starButtons.forEach(b => b.classList.toggle("selected", Number(b.dataset.value) <= value));
  }));

  // New reviews. On a static site localStorage is used; when the site is put behind a server,
  // this can be replaced by a shared database/API without changing the UI.
  $("#reviewForm").addEventListener("submit", e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const text = String(fd.get("text") || "").trim();
    const rating = Number(fd.get("rating") || 5);
    if (!name || !text) return;
    const review = {
      name, text, rating,
      date: new Date().toLocaleDateString("ru-RU", {day:"numeric", month:"long", year:"numeric"}),
      source: "Отзыв на сайте"
    };
    allReviews.unshift(review);
    saveReviews(allReviews);
    filter = "all"; shown = 6;
    $$(".filter").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
    render();
    e.currentTarget.reset();
    ratingInput.value = 5;
    starButtons.forEach(b => b.classList.toggle("selected", Number(b.dataset.value) <= 5));
    $("#formMessage").textContent = "Спасибо! Ваш отзыв добавлен.";
    setTimeout(closeModal, 900);
    setTimeout(() => $("#reviews").scrollIntoView({behavior:"smooth"}), 1050);
  });

  // ESC closes overlays
  addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      closeLightbox();
    }
  });
})();

/* ===== CINEMATIC NAVIGATION ===== */
(() => {
  const curtain = document.getElementById('pageCurtain');
  const sections = [...document.querySelectorAll('main > section')];
  const navLinks = [...document.querySelectorAll('.nav nav a')];

  // reveal sections with a cinematic entrance
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, {threshold: .16, rootMargin: '-8% 0px -8% 0px'});
  sections.forEach(s => sectionObserver.observe(s));

  // nav transition: dark curtain sweeps across, then lands on the target
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      document.querySelector('.nav')?.classList.remove('menu-open');
      curtain?.classList.remove('play');
      void curtain?.offsetWidth;
      curtain?.classList.add('play');
      setTimeout(() => target.scrollIntoView({behavior:'smooth', block:'start'}), 270);
    });
  });

  // active chapter in the top navigation
  const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, {threshold:.42});
  sections.forEach(s => activeObserver.observe(s));

  // subtle vertical parallax for the hero image
  const hero = document.querySelector('.hero');
  const heroImg = document.querySelector('.hero-image-wrap img');
  if (hero && heroImg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    addEventListener('scroll', () => {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const shift = Math.max(-18, Math.min(18, -rect.top * .035));
      heroImg.style.transform = `translateY(${shift}px) scale(1.025)`;
    }, {passive:true});
  }

})();
