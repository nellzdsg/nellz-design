/* ==========================================================================
   NELLZ DESIGN — логика сайта
   Без зависимостей. Всё, что можно, деградирует корректно: если JS выключен,
   страница остаётся читаемой, FAQ работает (нативные <details>), галерея видна.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* ------------------------------------------------------------------ шапка */

  function initHeader() {
    const header = $("#site-header");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = $("#nav-toggle");
    if (!toggle) return;

    const setOpen = (open) => {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      const panel = $("#nav-panel");
      if (panel) panel.hidden = !open;
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    $$("#nav-panel a").forEach((link) => link.addEventListener("click", () => setOpen(false)));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1024) setOpen(false);
    });
  }

  /* ------------------------------------------------- появление при прокрутке */

  function initReveal() {
    const targets = $$(".reveal, .reveal-group");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------- анимированные эмодзи */

  const lottiePlayers = new Map();

  function initLottie() {
    const holders = $$("[data-lottie]");
    if (!holders.length || !window.lottie) return;

    // Анимации создаём лениво: только когда плитка приближается к экрану
    const start = (el) => {
      if (el.dataset.lottieStarted) return;
      el.dataset.lottieStarted = "1";
      const animation = window.lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: el.dataset.lottie,
      });
      lottiePlayers.set(el, animation);
    };

    if (!("IntersectionObserver" in window)) {
      holders.forEach(start);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          start(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "200px" }
    );

    holders.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------- лайтбокс */

  function initLightbox() {
    const box = $("#lightbox");
    if (!box) return;

    const stage = $("#lightbox-stage");
    const counter = $("#lightbox-counter");
    const prevBtn = $("#lightbox-prev");
    const nextBtn = $("#lightbox-next");
    if (!stage) return;

    const animationHost = document.createElement("div");
    animationHost.className = "lightbox-emoji";
    animationHost.hidden = true;
    stage.appendChild(animationHost);

    // Список пересчитываем при каждом открытии: скрытые фильтром работы не листаются
    const visibleItems = () => $$("[data-lightbox-item]").filter((el) => !el.hidden);

    let items = [];
    let current = 0;
    let currentAnimation = null;
    let lastFocused = null;

    const clearStage = () => {
      if (currentAnimation) {
        currentAnimation.destroy();
        currentAnimation = null;
      }
      const existing = $("img", stage);
      if (existing) existing.remove();
      animationHost.hidden = true;
    };

    const render = () => {
      clearStage();
      const item = items[current];
      if (!item) return;

      const lottiePath = item.dataset.lottieSrc;
      if (lottiePath) {
        animationHost.hidden = false;
        if (window.lottie) {
          currentAnimation = window.lottie.loadAnimation({
            container: animationHost,
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: lottiePath,
          });
        }
      } else {
        const img = document.createElement("img");
        img.src = item.dataset.full || "";
        img.alt = item.dataset.alt || "";
        img.decoding = "async";
        stage.insertBefore(img, animationHost);
      }

      if (counter) counter.textContent = `${current + 1} / ${items.length}`;
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === items.length - 1;
    };

    const open = (item) => {
      items = visibleItems();
      const index = items.indexOf(item);
      if (index === -1) return;
      current = index;
      lastFocused = document.activeElement;
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      render();
      const closeBtn = $("#lightbox-close");
      if (closeBtn) closeBtn.focus();
    };

    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      clearStage();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    const step = (delta) => {
      const next = current + delta;
      if (next < 0 || next >= items.length) return;
      current = next;
      render();
    };

    $$("[data-lightbox-item]").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        open(item);
      });
    });

    if (prevBtn) prevBtn.addEventListener("click", () => step(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => step(1));
    const closeBtn = $("#lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", close);

    box.addEventListener("click", (event) => {
      if (event.target === box) close();
    });

    document.addEventListener("keydown", (event) => {
      if (!box.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    });
  }

  /* -------------------------------------------------------------- фильтры */

  function initFilters() {
    const chips = $$("[data-filter]");
    const items = $$("[data-category]");
    if (!chips.length || !items.length) return;

    const counter = $("#filter-count");
    const empty = $("#filter-empty");

    const apply = (filter) => {
      let visible = 0;
      items.forEach((item) => {
        const match = filter === "all" || item.dataset.category === filter;
        item.hidden = !match;
        if (match) visible += 1;
      });
      chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.filter === filter)));
      if (counter) counter.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;
      if (window.lottie && window.lottie.resize) window.lottie.resize();
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", () => apply(chip.dataset.filter));
    });

    apply("all");
  }

  /* --------------------------------------------------------- калькулятор */

  function initCalculator() {
    const calc = $("#calc");
    if (!calc) return;

    const rows = $$("[data-calc-key]", calc);
    if (!rows.length) return;

    const discountFrom = Number(calc.dataset.discountFrom || 3);
    const discountRate = Number(calc.dataset.discountRate || 0.2);
    const currency = calc.dataset.currency || "$";
    const itemTemplate = calc.dataset.msgItem || "{name} × {qty} — {sum}";

    const totalEl = $("#calc-total");
    const subtotalEl = $("#calc-subtotal");
    const subtotalRow = $("#calc-subtotal-row");
    const badge = $("#calc-discount");
    const badgeText = $("#calc-discount-text");
    const noteEl = $("#calc-note");
    const sendBtn = $("#calc-send");
    const copyBtn = $("#calc-copy");

    const state = new Map();
    rows.forEach((row) => state.set(row.dataset.calcKey, 0));

    const money = (value) => {
      const rounded = Math.round(value * 100) / 100;
      return currency + (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2));
    };

    const build = () => {
      const lines = [];
      let subtotal = 0;
      let count = 0;

      rows.forEach((row) => {
        const qty = state.get(row.dataset.calcKey);
        if (qty <= 0) return;
        const price = Number(row.dataset.price);
        const sum = qty * price;
        subtotal += sum;
        count += qty;
        lines.push(
          itemTemplate
            .replace("{name}", row.dataset.name)
            .replace("{qty}", String(qty))
            .replace("{sum}", money(sum))
        );
      });

      const hasDiscount = count >= discountFrom;
      const total = hasDiscount ? Math.round(subtotal * (1 - discountRate) * 100) / 100 : subtotal;
      return { lines, subtotal, total, hasDiscount, count };
    };

    const render = () => {
      const { lines, subtotal, total, hasDiscount } = build();

      if (totalEl) totalEl.textContent = money(total);

      if (subtotalRow) subtotalRow.hidden = !hasDiscount;
      if (subtotalEl) subtotalEl.textContent = money(subtotal);

      if (badge) badge.classList.toggle("is-on", hasDiscount);
      if (badge && badgeText) {
        badgeText.textContent = (calc.dataset.msgDiscount || "Скидка").replace("{percent}", String(discountRate * 100));
      }

      const ready = lines.length > 0;

      if (sendBtn) {
        if (ready) {
          sendBtn.removeAttribute("aria-disabled");
          const text = [calc.dataset.msgIntro || "", ...lines, ""]
            .concat(hasDiscount ? [`${calc.dataset.msgSubtotal || "Subtotal"}: ${money(subtotal)}`] : [])
            .concat([`${calc.dataset.msgTotal || "Total"}: ${money(total)}`])
            .filter((line) => line !== undefined)
            .join("\n");
          sendBtn.href = `${calc.dataset.telegram}?text=${encodeURIComponent(text)}`;
        } else {
          sendBtn.setAttribute("aria-disabled", "true");
          sendBtn.href = calc.dataset.telegram;
        }
      }

      if (noteEl) {
        noteEl.textContent = ready ? calc.dataset.noteReady : calc.dataset.noteEmpty;
      }
    };

    rows.forEach((row) => {
      const countEl = $("[data-calc-count]", row);
      const setValue = (value) => {
        const next = Math.max(0, Math.min(99, value));
        state.set(row.dataset.calcKey, next);
        if (countEl) countEl.textContent = String(next);
        render();
      };

      const minus = $("[data-calc-minus]", row);
      const plus = $("[data-calc-plus]", row);
      if (minus) minus.addEventListener("click", () => setValue(state.get(row.dataset.calcKey) - 1));
      if (plus) plus.addEventListener("click", () => setValue(state.get(row.dataset.calcKey) + 1));
      setValue(0);
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const { lines, subtotal, total, hasDiscount } = build();
        if (!lines.length) return;

        const text = [calc.dataset.msgIntro || "", ...lines, ""]
          .concat(hasDiscount ? [`${calc.dataset.msgSubtotal || "Subtotal"}: ${money(subtotal)}`] : [])
          .concat([`${calc.dataset.msgTotal || "Total"}: ${money(total)}`])
          .join("\n");

        const original = copyBtn.textContent;
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = calc.dataset.copyDone || "OK";
        } catch (error) {
          copyBtn.textContent = calc.dataset.copyFail || "—";
        }
        window.setTimeout(() => {
          copyBtn.textContent = original;
        }, 1800);
      });
    }

    render();
  }

  /* ----------------------------------------------- подсветка активной секции */

  function initNavHighlight() {
    const links = $$("[data-nav-section]");
    if (!links.length || !("IntersectionObserver" in window)) return;

    const sections = links
      .map((link) => $(link.getAttribute("href")))
      .filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => {
            const active = link.getAttribute("href") === `#${entry.target.id}`;
            if (active) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ----------------------------------------------- копирование по кнопке */

  function initCopy() {
    $$("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.dataset.copy || "";
        const done = btn.dataset.copyDone || "OK";
        const original = btn.innerHTML;
        try {
          await navigator.clipboard.writeText(text);
        } catch (error) {
          return;
        }
        btn.textContent = done;
        window.setTimeout(() => {
          btn.innerHTML = original;
        }, 1800);
      });
    });
  }

  /* ------------------------------------------------------------------ старт */

  function boot() {
    initHeader();
    initReveal();
    initLightbox();
    initFilters();
    initCalculator();
    initLottie();
    initNavHighlight();
    initCopy();

    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
