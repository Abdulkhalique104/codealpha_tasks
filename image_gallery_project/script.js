(function () {
  "use strict";

  const gallery = document.getElementById("gallery");
  const cards = Array.from(gallery.querySelectorAll(".card"));
  const thumbs = Array.from(gallery.querySelectorAll(".thumb"));
  const filterBar = document.getElementById("filters");
  const filterBtns = Array.from(filterBar.querySelectorAll(".filter"));
  const statusEl = document.getElementById("filterStatus");

  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbTitle = document.getElementById("lbTitle");
  const lbTag = document.getElementById("lbTag");
  const lbCounter = document.getElementById("lbCounter");
  const btnPrev = lightbox.querySelector(".lb-nav--prev");
  const btnNext = lightbox.querySelector(".lb-nav--next");
  const btnClose = lightbox.querySelector(".lb-close");

  const items = thumbs.map((btn) => {
    const img = btn.querySelector("img");
    const card = btn.closest(".card");
    return {
      full: btn.dataset.full,
      alt: img ? (img.getAttribute("alt") || "") : "",
      title: btn.dataset.title || "",
      tag: btn.dataset.tag || "",
      cat: card ? card.dataset.cat : ""
    };
  });

  if (!items.length) return;


  thumbs.forEach((thumb) => {
    const img = thumb.querySelector("img");
    if (!img) return;
    const done = () => {
      img.classList.add("is-loaded");
      thumb.classList.add("is-loaded");
    };
    if (img.complete) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  });

  cards.forEach((card, i) => card.style.setProperty("--i", i));
  requestAnimationFrame(() => requestAnimationFrame(() => gallery.classList.remove("is-leaving")));

  let visible = [];
  function rebuildVisible() {
    visible = [];
    thumbs.forEach((thumb, i) => {
      const card = thumb.closest(".card");
      if (card && !card.classList.contains("is-hidden")) visible.push(i);
    });
  }
  rebuildVisible();

  let activeFilter = "all";
  let filterToken = 0;
  let current = 0;
  let lastFocused = null;
  let navToken = 0;
  let fadeTimer = null;

  function applyFilter(cat) {
    if (cat === activeFilter) return;
    activeFilter = cat;
    filterBtns.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.filter === cat));
    });

    const token = ++filterToken;
    gallery.classList.add("is-leaving");

    setTimeout(() => {
      if (token !== filterToken) return;
      cards.forEach((card) => {
        const show = cat === "all" || card.dataset.cat === cat;
        card.classList.toggle("is-hidden", !show);
      });

      let n = 0;
      cards.forEach((card) => {
        if (!card.classList.contains("is-hidden")) card.style.setProperty("--i", n++);
      });

      rebuildVisible();
      if (current >= visible.length) current = 0;

      if (statusEl) {
        statusEl.textContent = cat === "all"
          ? "Showing all " + visible.length + " photos"
          : "Showing " + visible.length + " " + cat + (visible.length === 1 ? " photo" : " photos");
      }

      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token === filterToken) gallery.classList.remove("is-leaving");
      }));
    }, 190);
  }

  filterBar.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter");
    if (btn) applyFilter(btn.dataset.filter);
  });

  const cache = new Map();
  function preload(pos) {
    if (!visible.length) return;
    const item = items[visible[(pos + visible.length) % visible.length]];
    if (!item || cache.has(item.full)) return;
    const img = new Image();
    img.decoding = "async";
    img.src = item.full;
    cache.set(item.full, img);
  }

  function paint() {
    if (!visible.length) return;
    const item = items[visible[current]];
    const token = ++navToken;

    lbTitle.textContent = item.title;
    lbTag.textContent = item.tag;
    lbCounter.textContent = (current + 1) + " / " + visible.length;

    if (!lbImg.getAttribute("src")) {
      lbImg.src = item.full;
      lbImg.alt = item.alt;
      preload(current + 1);
      preload(current - 1);
      return;
    }

    clearTimeout(fadeTimer);
    lbImg.classList.add("is-fading");
    fadeTimer = setTimeout(() => {
      if (token !== navToken) return;
      const reveal = () => {
        if (token !== navToken) return;
        requestAnimationFrame(() => lbImg.classList.remove("is-fading"));
      };
      lbImg.onload = reveal;
      lbImg.onerror = reveal;
      lbImg.src = item.full;
      lbImg.alt = item.alt;
      if (lbImg.complete && lbImg.naturalWidth > 0) reveal();
      preload(current + 1);
      preload(current - 1);
    }, 140);
  }

  function open(pos) {
    current = pos;
    lastFocused = document.activeElement;
    paint();
    document.documentElement.classList.add("is-locked");
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    btnClose.focus();
  }

  function close() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("is-locked");
    clearTimeout(fadeTimer);
    navToken++;
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    lastFocused = null;
  }

  function go(step) {
    if (visible.length < 2) return;
    current = (current + step + visible.length) % visible.length;
    paint();
  }

  thumbs.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const pos = visible.indexOf(i);
      if (pos !== -1) open(pos);
    });
  });

  btnNext.addEventListener("click", () => go(1));
  btnPrev.addEventListener("click", () => go(-1));
  btnClose.addEventListener("click", close);

  lightbox.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) close();
    else if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  });

  function trapFocus(event) {
    const focusables = [btnClose, btnPrev, btnNext];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  let touchStartX = null;
  lightbox.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX = null;
  }, { passive: true });

  preload(0);
  preload(1);
  preload(items.length - 1);
})();
