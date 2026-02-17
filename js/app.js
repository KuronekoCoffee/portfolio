/* =========================================================
  ✅ EDIT ZONE（ここだけ覚えればOK）
  1) レール自動スクロール速度 → SPEED
  2) 操作後に自動再開までの時間 → RESUME_DELAY_MS
  3) Works詳細ページの背景ループON → detail-bg-loop（自動付与）
========================================================= */

const SPEED = 0.5;
const RESUME_DELAY_MS = 1200;

/* Boot Intro */
const intro = document.getElementById("intro");
const pageRoot = document.getElementById("pageRoot");

const INTRO_HOLD_MS = 850;
const INTRO_OUT_MS = 720;
const ENTER_DONE_MS = 900;

let bootSkipped = false;

function enterMain() {
  document.body.classList.remove("is-boot");
  document.body.classList.add("is-enter");

  pageRoot?.setAttribute("aria-hidden", "false");

  closeWorks();

  setTimeout(() => {
    document.body.classList.add("is-entered");
  }, ENTER_DONE_MS);

  setTimeout(() => {
    intro?.remove();
  }, INTRO_OUT_MS + 60);

  updateNavState();
}

function skipBoot() {
  if (bootSkipped) return;
  bootSkipped = true;
  enterMain();
}

window.addEventListener("keydown", skipBoot, { once: true });
window.addEventListener("pointerdown", skipBoot, { once: true });

window.addEventListener("load", () => {
  setTimeout(() => {
    if (!bootSkipped) enterMain();
  }, INTRO_HOLD_MS);
});

/* Rail / Featured / About */
const viewport = document.getElementById("viewport");
const track = document.getElementById("track");

const featured = document.getElementById("featured");
const featuredTitle = document.getElementById("featuredTitle");
const featuredSub = document.getElementById("featuredSub");
const bgA = document.getElementById("featuredBgA");
const bgB = document.getElementById("featuredBgB");

const homeBtn = document.getElementById("homeBtn");
const aboutBtn = document.getElementById("aboutBtn");
const worksBtn = document.getElementById("worksBtn");

const aboutClose = document.getElementById("aboutClose");
const aboutDim = document.getElementById("aboutDim");
const aboutView = document.getElementById("aboutView");

const leftCol = document.getElementById("leftCol");
const worksRight = document.getElementById("worksRight");

const isIndexPage = !!pageRoot && !!leftCol;
const isWorksDetail = !isIndexPage;

/* 作品詳細ページの背景を自然ループに */
if (isWorksDetail) {
  document.body.classList.add("detail-bg-loop");
}

/* ===== Nav active ===== */
function setNavActive(key) {
  const all = [homeBtn, aboutBtn, worksBtn].filter(Boolean);
  for (const b of all) b.classList.remove("is-active");

  if (key === "home") homeBtn?.classList.add("is-active");
  if (key === "about") aboutBtn?.classList.add("is-active");
  if (key === "works") worksBtn?.classList.add("is-active");
}

function updateNavState() {
  if (isAboutOpen()) setNavActive("about");
  else if (isIndexPage && isWorksOpen()) setNavActive("works");
  else if (isWorksDetail) setNavActive("works");
  else setNavActive("home");
}

/* ===== Brand reuse / Inject ===== */
const brandKeep = document.getElementById("brandKeep");
const aboutViewInner = aboutView?.querySelector?.(".about-view-inner") ?? null;

const brandHomeParent = brandKeep?.parentNode ?? null;
const brandHomeNext = brandKeep?.nextSibling ?? null;

let aboutBrandInjected = null;

function buildAboutBrandNode() {
  const wrap = document.createElement("div");
  wrap.className = "brand keep-on-top is-in-about about-brand-injected";
  wrap.setAttribute("aria-hidden", "true");

  wrap.innerHTML = `
    <h1 class="title keep-title">Kuroneko<br>Coffee</h1>
    <img
      src="images/KuronekoCoffeeLogo.png"
      alt="KuronekoCoffee Logo"
      class="brand-logo"
      draggable="false"
    >
  `;
  return wrap;
}

function ensureAboutBrand() {
  if (!aboutViewInner) return null;

  if (brandKeep) return brandKeep;

  if (!aboutBrandInjected) {
    aboutBrandInjected = buildAboutBrandNode();
  }

  if (!aboutBrandInjected.parentNode) {
    aboutViewInner.insertBefore(aboutBrandInjected, aboutViewInner.firstChild);
  }

  return aboutBrandInjected;
}

function moveBrandToAbout() {
  if (!aboutViewInner) return;

  if (brandKeep) {
    brandKeep.classList.add("is-in-about");
    aboutViewInner.insertBefore(brandKeep, aboutViewInner.firstChild);
  } else {
    ensureAboutBrand();
  }
}

function restoreBrandFromAbout() {
  if (brandKeep && brandHomeParent) {
    brandKeep.classList.remove("is-in-about");

    if (brandHomeNext && brandHomeNext.parentNode === brandHomeParent) {
      brandHomeParent.insertBefore(brandKeep, brandHomeNext);
    } else {
      brandHomeParent.appendChild(brandKeep);
    }
  }
}

/* Works */
function isWorksOpen() {
  return document.body.classList.contains("works-open");
}
function setWorksA11y(open) {
  featured?.setAttribute("aria-hidden", open ? "false" : "true");
  viewport?.setAttribute("aria-hidden", open ? "false" : "true");
  worksRight?.setAttribute("aria-hidden", open ? "false" : "true");
}
function openWorks() {
  if (isAboutOpen()) closeAbout();
  document.body.classList.add("works-open");
  worksBtn?.setAttribute("aria-expanded", "true");
  setWorksA11y(true);
  updateNavState();
}
function closeWorks() {
  document.body.classList.remove("works-open");
  worksBtn?.setAttribute("aria-expanded", "false");
  setWorksA11y(false);
  updateNavState();
}
function toggleWorks() {
  if (isWorksOpen()) closeWorks();
  else openWorks();
}

/* Rail Auto Scroll */
const reduceMotion =
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

let y = 0;
let last = performance.now();
let loopHeight = 0;
let originalCount = 0;

let showA = false;
let currentKey = "";
let currentLink = "";

let lastManualAt = 0;

let dragging = false;
let lastPointerY = 0;
let suppressClickUntil = 0;

function nowMs() {
  return performance.now();
}
function getGapPx() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--gap")
    .trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 22;
}

function getLoopHeight() {
  if (!track) return 0;

  const originals = [...track.querySelectorAll(".game-card:not(.is-clone)")];
  const count = originalCount || originals.length;
  if (count === 0) return 0;

  const cardH = originals[0].getBoundingClientRect().height;
  return (cardH + getGapPx()) * count;
}

function normalizeY() {
  if (!loopHeight || loopHeight < 10) return;
  while (-y >= loopHeight) y += loopHeight;
  while (y > 0) y -= loopHeight;
}
function applyY() {
  if (!track) return;
  track.style.transform = `translateY(${y}px)`;
}

/* Pick center card -> Featured */
function pickCenterCard() {
  if (!viewport || !track) return;
  const rect = viewport.getBoundingClientRect();
  const centerY = rect.top + rect.height * 0.35;

  const cards = [...track.querySelectorAll(".game-card")];
  if (cards.length === 0) return;

  let best = null;
  let bestDist = Infinity;

  for (const c of cards) {
    const r = c.getBoundingClientRect();
    const cy = r.top + r.height * 0.5;
    const d = Math.abs(cy - centerY);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  if (!best) return;

  const title = best.dataset.title ?? "";
  const sub = best.dataset.sub ?? "";
  const img = best.dataset.img ?? "";
  const link = best.dataset.link ?? "";

  const key = `${title}|${sub}|${img}|${link}`;
  if (key === currentKey) return;
  currentKey = key;
  currentLink = link;

  if (featuredTitle) featuredTitle.textContent = title;
  if (featuredSub) featuredSub.textContent = sub;

  const next = showA ? bgB : bgA;
  const prev = showA ? bgA : bgB;
  if (next) {
    next.style.backgroundImage = img ? `url(${img})` : "";
    next.classList.add("is-show");
  }
  if (prev) prev.classList.remove("is-show");
  showA = !showA;

  for (const c of cards) c.classList.remove("is-active");
  best.classList.add("is-active");
}

/* 画像反映（Worksレール用） */
function applyCardBackgrounds() {
  if (!track) return;
  const cards = [...track.querySelectorAll(".game-card")];
  for (const c of cards) {
    const img = c.dataset.img ?? "";
    c.style.backgroundImage = img ? `url(${img})` : "";
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "button");
    c.setAttribute("aria-label", c.dataset.title ?? "Work");
  }
}

/* Loop / Clone */
function setupLoop() {
  if (!track) return;

  const originals = [...track.querySelectorAll(".game-card:not(.is-clone)")];
  if (originals.length === 0) return;

  originalCount = originals.length;

  const clones = [...track.querySelectorAll(".game-card.is-clone")];
  for (const c of clones) c.remove();

  for (const o of originals) {
    const c = o.cloneNode(true);
    c.classList.add("is-clone");
    track.appendChild(c);
  }

  applyCardBackgrounds();

  loopHeight = getLoopHeight();
  normalizeY();
  applyY();
  pickCenterCard();
}

/* Click */
function goToLink(link) {
  if (!link) return;
  window.location.href = link;
}
featured?.addEventListener("click", () => {
  if (!currentLink) return;
  goToLink(currentLink);
});
track?.addEventListener("click", (e) => {
  if (nowMs() < suppressClickUntil) return;
  const card = e.target.closest?.(".game-card");
  if (!card) return;
  const link = card.dataset.link ?? "";
  if (link) goToLink(link);
});

/* Pointer drag */
viewport?.addEventListener("pointerdown", (e) => {
  dragging = true;
  lastPointerY = e.clientY;
  lastManualAt = nowMs();
  suppressClickUntil = nowMs() + 220;
  viewport.setPointerCapture?.(e.pointerId);
});
viewport?.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dy = e.clientY - lastPointerY;
  lastPointerY = e.clientY;

  y += dy;
  normalizeY();
  applyY();
  pickCenterCard();
});
viewport?.addEventListener("pointerup", () => {
  dragging = false;
  lastManualAt = nowMs();
});
viewport?.addEventListener("pointercancel", () => {
  dragging = false;
  lastManualAt = nowMs();
});

/* Wheel */
viewport?.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    lastManualAt = nowMs();
    y -= e.deltaY;
    normalizeY();
    applyY();
    pickCenterCard();
  },
  { passive: false }
);

/* RAF */
function tick(t) {
  const dt = Math.min(32, t - last);
  last = t;

  if (!reduceMotion) {
    const idle = t - lastManualAt > RESUME_DELAY_MS;
    if (idle && isWorksOpen() && !dragging) {
      y -= (SPEED * dt) / 16.666;
      normalizeY();
      applyY();
      pickCenterCard();
    }
  }
  requestAnimationFrame(tick);
}

/* About Overlay */
let isTransitioning = false;

function isAboutOpen() {
  return document.body.classList.contains("about-open");
}

function openAbout() {
  if (isTransitioning) return;
  isTransitioning = true;

  if (isWorksOpen()) closeWorks();

  moveBrandToAbout();

  document.body.classList.add("about-open");
  document.body.classList.remove("about-closing");

  aboutBtn?.setAttribute("aria-expanded", "true");
  aboutView?.setAttribute("aria-hidden", "false");
  if (aboutView) aboutView.scrollTop = 0;

  setTimeout(() => {
    isTransitioning = false;
    aboutClose?.focus?.();
    updateNavState();
  }, 0);
}

function closeAbout() {
  if (isTransitioning) return;
  isTransitioning = true;

  document.body.classList.remove("about-open");
  document.body.classList.remove("about-closing");

  aboutBtn?.setAttribute("aria-expanded", "false");
  aboutView?.setAttribute("aria-hidden", "true");

  restoreBrandFromAbout();

  setTimeout(() => {
    isTransitioning = false;
    aboutBtn?.focus?.();
    updateNavState();
  }, 0);
}

function toggleAbout() {
  if (isAboutOpen()) closeAbout();
  else openAbout();
}

/* Buttons */
aboutBtn?.addEventListener("click", toggleAbout);

worksBtn?.addEventListener("click", () => {
  if (isWorksDetail) {
    window.location.href = "index.html#works";
    return;
  }
  toggleWorks();
  updateNavState();
});

aboutClose?.addEventListener("click", closeAbout);
aboutDim?.addEventListener("click", closeAbout);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (isAboutOpen()) closeAbout();
    else if (isWorksOpen()) closeWorks();
  }
});

/* Home */
homeBtn?.addEventListener("click", () => {
  if (isAboutOpen()) closeAbout();
  if (isWorksOpen()) closeWorks();

  if (leftCol) {
    leftCol.scrollTo?.({ top: 0, behavior: "smooth" });
  } else {
    window.location.href = "index.html";
  }

  homeBtn.blur?.();
  updateNavState();
});

/* Reveal on scroll (Left) */
function setupReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (targets.length === 0) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) ent.target.classList.add("is-in");
      }
    },
    { root: leftCol ?? null, threshold: 0.08 }
  );

  for (const t of targets) io.observe(t);
}

/* Init */
window.addEventListener("load", () => {
  if (isIndexPage && (location.hash === "#works" || location.hash === "#works-open")) {
    openWorks();
  }

  setupLoop();
  setupReveal();
  updateNavState();
  requestAnimationFrame(tick);
});

window.addEventListener("resize", () => {
  loopHeight = getLoopHeight();
  normalizeY();
  applyY();
  pickCenterCard();
});
