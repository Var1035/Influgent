/**
 * INTELLIGENCE DESIGNED TO EVOLVE - MAIN INTERACTION SCRIPT
 */

document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------------
  // 1. MOBILE MENU TOGGLING & ACCESSIBILITY
  // ---------------------------------------------------------------------------
  const burgerBtn = document.querySelector(".burger-btn");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileLinks = document.querySelectorAll(
    ".mobile-nav-link, .mobile-sign-in"
  );
  const desktopNavLinks = document.querySelectorAll(".nav-link");

  function setMenuState(isOpen) {
    if (!burgerBtn || !mobileOverlay) return;

    burgerBtn.setAttribute("aria-expanded", String(isOpen));
    burgerBtn.classList.toggle("open", isOpen);

    if (isOpen) {
      mobileOverlay.removeAttribute("hidden");
      document.body.classList.add("menu-open");
    } else {
      mobileOverlay.setAttribute("hidden", "");
      document.body.classList.remove("menu-open");
    }
  }

  if (burgerBtn) {
    burgerBtn.addEventListener("click", () => {
      const isExpanded = burgerBtn.getAttribute("aria-expanded") === "true";
      setMenuState(!isExpanded);
    });
  }

  // Close on backdrop overlay click (outside sheet)
  if (mobileOverlay) {
    mobileOverlay.addEventListener("click", (e) => {
      if (e.target === mobileOverlay) {
        setMenuState(false);
      }
    });
  }

  // Close on Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setMenuState(false);
    }
  });

  // Close on mobile link click & update active state
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setMenuState(false);
      if (link.classList.contains("mobile-nav-link")) {
        document
          .querySelectorAll(".mobile-nav-link")
          .forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  });

  // Close when window resized beyond mobile breakpoint (720px)
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) {
      setMenuState(false);
    }
  });

  // Desktop nav links active state switching
  desktopNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      desktopNavLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. STATS COUNT-UP ANIMATION
  // ---------------------------------------------------------------------------
  // easeOutCubic function: 1 - (1 - t)^3
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter(el, target, decimals, duration, delay) {
    setTimeout(() => {
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const currentVal = target * easedProgress;

        el.textContent = currentVal.toFixed(decimals);

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = target.toFixed(decimals);
        }
      }

      requestAnimationFrame(update);
    }, delay);
  }

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const statsFooter = document.querySelector(".stats-footer");
  if (statsFooter) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);

            const statItems = entry.target.querySelectorAll(".stat-item");
            statItems.forEach((item, i) => {
              const valEl = item.querySelector(".stat-val");
              if (!valEl) return;

              const target = parseFloat(valEl.getAttribute("data-target"));
              const decimals = parseInt(
                valEl.getAttribute("data-decimals") || "0",
                10
              );

              if (prefersReducedMotion) {
                valEl.textContent = target.toFixed(decimals);
                return;
              }

              // Duration: 1500 + i * 80 ms, Start offset: 480 + i * 90 ms
              const duration = 1500 + i * 80;
              const startOffset = 480 + i * 90;

              animateCounter(valEl, target, decimals, duration, startOffset);
            });
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(statsFooter);
  }

  // ---------------------------------------------------------------------------
  // 3. BACKGROUND VIDEO AUTOPLAY FALLBACK
  // ---------------------------------------------------------------------------
  const video = document.querySelector(".bg-video");
  if (video) {
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy prevented playback, keep muted and retry
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }
});

