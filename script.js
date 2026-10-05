/* ==========================================================
   1. ELEMENT REFERENCES
   ========================================================== */
const filterButtons = document.querySelectorAll('.filter-btn');
const cards = Array.from(document.querySelectorAll('.card'));

const lightbox = document.getElementById('lightbox');
const lbImage = document.getElementById('lbImage');
const lbTitle = document.getElementById('lbTitle');
const lbCategory = document.getElementById('lbCategory');
const lbCounter = document.getElementById('lbCounter');
const lbDesc = document.getElementById('lbDesc');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
const lbClose = document.getElementById('lbClose');

/* ==========================================================
   2. STATE
   ========================================================== */
let visibleCards = [...cards]; // only the cards in the active filter
let currentIndex = 0;          // index inside visibleCards
let lastFocused = null;        // element to refocus after closing
let filterTimer = null;

/* ==========================================================
   3. HELPERS
   ========================================================== */
const pad = (n) => String(n).padStart(2, '0');

// Use a larger version of the Unsplash image inside the lightbox
const fullSize = (url) => url.replace('w=1200', 'w=1800');

// Fallback image if a remote photo ever fails to load
function attachFallback(img, seed) {
  img.addEventListener('error', () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = 'true';
    img.src = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/900`;
  });
}

// Give each card a stagger index for the entrance animation + fallbacks
cards.forEach((card, i) => {
  card.style.setProperty('--i', i);
  const img = card.querySelector('img');
  attachFallback(img, card.dataset.title);
});
attachFallback(lbImage, 'gallery');

/* ==========================================================
   4. CATEGORY FILTERING
   ========================================================== */
function applyFilter(category) {
  clearTimeout(filterTimer);

  // Update active button + accessibility state
  filterButtons.forEach((btn) => {
    const active = btn.dataset.filter === category;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active);
  });

  // 1) Fade out every card
  cards.forEach((card) => card.classList.add('is-leaving'));

  // 2) After the fade, hide non-matching cards and animate matching ones in
  filterTimer = setTimeout(() => {
    visibleCards = cards.filter(
      (card) => category === 'all' || card.dataset.category === category
    );

    cards.forEach((card) => {
      const match = visibleCards.includes(card);
      card.classList.toggle('is-hidden', !match);
      card.classList.remove('is-leaving');
    });

    // Restart the entrance animation with a fresh stagger
    visibleCards.forEach((card, i) => {
      card.style.setProperty('--i', i);
      card.style.animation = 'none';
      void card.offsetWidth; // force reflow
      card.style.animation = '';
    });
  }, 280);
}

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

/* ==========================================================
   5. LIGHTBOX
   ========================================================== */
function renderLightbox(animate = true) {
  const card = visibleCards[currentIndex];
  const img = card.querySelector('img');

  const update = () => {
    lbImage.removeAttribute('data-fallback');
    lbImage.src = fullSize(img.currentSrc || img.src);
    lbImage.alt = img.alt;
    lbTitle.textContent = card.dataset.title;
    lbCategory.textContent = card.dataset.category;
    lbCategory.dataset.cat = card.dataset.category;
    lbDesc.textContent = card.dataset.desc || '';
    lbCounter.textContent = `${pad(currentIndex + 1)} / ${pad(visibleCards.length)}`;
    lbImage.classList.remove('is-swapping');
  };

  if (animate) {
    lbImage.classList.add('is-swapping');
    setTimeout(update, 180);
  } else {
    update();
  }

  // Hide arrows when only one image is available
  const single = visibleCards.length <= 1;
  lbPrev.hidden = single;
  lbNext.hidden = single;

  preloadNeighbours();
}

function preloadNeighbours() {
  const total = visibleCards.length;
  [1, -1].forEach((step) => {
    const neighbour = visibleCards[(currentIndex + step + total) % total];
    new Image().src = fullSize(neighbour.querySelector('img').src);
  });
}

function openLightbox(card) {
  currentIndex = visibleCards.indexOf(card);
  if (currentIndex === -1) return;

  lastFocused = document.activeElement;
  renderLightbox(false);

  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  lbClose.focus();
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  if (lastFocused) lastFocused.focus();
}

function showNext() {
  currentIndex = (currentIndex + 1) % visibleCards.length; // wraps within filtered set
  renderLightbox();
}

function showPrev() {
  currentIndex = (currentIndex - 1 + visibleCards.length) % visibleCards.length;
  renderLightbox();
}

const isOpen = () => lightbox.classList.contains('is-open');

/* ==========================================================
   6. EVENT LISTENERS
   ========================================================== */
// Open from a gallery card
cards.forEach((card) => {
  card.querySelector('.card__btn').addEventListener('click', () => openLightbox(card));
});

lbNext.addEventListener('click', showNext);
lbPrev.addEventListener('click', showPrev);
lbClose.addEventListener('click', closeLightbox);

// Click on the dark backdrop (outside the panel and arrows) closes the lightbox
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Keyboard navigation + simple focus trap
document.addEventListener('keydown', (e) => {
  if (!isOpen()) return;

  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowRight') showNext();
  else if (e.key === 'ArrowLeft') showPrev();
  else if (e.key === 'Tab') {
    const focusable = [lbClose, lbPrev, lbNext].filter((el) => !el.hidden);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Swipe support on touch devices
let touchStartX = 0;
lightbox.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 60) (dx < 0 ? showNext : showPrev)();
}, { passive: true });
