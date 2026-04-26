/* =====================================================
   Portfolio — interactions & animations
   ===================================================== */

(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Current year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Navbar state ---------- */
  const navbar = document.getElementById("navbar");
  const menuToggle = document.querySelector(".menu-toggle");

  const onScroll = () => {
    if (window.scrollY > 20) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const open = navbar.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav-links a").forEach((a) => {
      a.addEventListener("click", () => {
        navbar.classList.remove("menu-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = document.querySelectorAll(".reveal, .skill-card, .project-card, .timeline-item, .stat");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------- Animated stat counters ---------- */
  const stats = document.querySelectorAll(".stat-num");
  const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const suffix = el.dataset.suffix || "+";
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toString() + suffix;
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    stats.forEach((el) => countIO.observe(el));
  } else {
    stats.forEach((el) => (el.textContent = el.dataset.target));
  }

  /* ---------- Skill card cursor glow ---------- */
  document.querySelectorAll(".skill-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    });
  });

  /* ---------- Contact form ---------- */
  const form = document.getElementById("contact-form");
  const note = document.getElementById("form-note");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      if (!name || !email || !message) {
        note.style.color = "#ff7b9a";
        note.textContent = "Please fill in all fields.";
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.style.color = "#ff7b9a";
        note.textContent = "That email doesn't look right.";
        return;
      }

      note.style.color = "";
      note.textContent = "Thanks — message sent. I'll reply within 24h.";
      form.reset();
    });
  }

  /* ---------- Night-sky background ---------- */
  const canvas = document.getElementById("neural-bg");
  if (canvas && !prefersReduced) initNightSky(canvas);
  else if (canvas && prefersReduced) {
    // Static fallback: paint a moon + a few stars without animation
    initNightSky(canvas, true);
  }

  function initNightSky(canvas, staticOnly = false) {
    const ctx = canvas.getContext("2d");
    let width, height, dpr;
    let stars = [];
    let drifters = [];
    let shootingStars = [];
    let moon = null;
    let lastShoot = 0;
    let nextShootDelay = 4000;

    const seed = () => {
      const area = width * height;
      const starCount = Math.min(360, Math.max(120, Math.floor(area / 3600)));

      stars = Array.from({ length: starCount }, () => {
        const tier = Math.random();
        let r;
        if (tier < 0.78) r = Math.random() * 0.5 + 0.18;
        else if (tier < 0.96) r = Math.random() * 0.8 + 0.7;
        else r = Math.random() * 0.9 + 1.4;
        const hueRoll = Math.random();
        const hue = hueRoll < 0.10 ? "blue" : hueRoll < 0.16 ? "warm" : "white";
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r,
          baseAlpha: 0.55 + Math.random() * 0.4,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.25 + Math.random() * 0.7,
          hue,
          spikes: r > 1.5,
        };
      });

      const drifterCount = Math.max(6, Math.floor(starCount * 0.06));
      drifters = Array.from({ length: drifterCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 0.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.025,
      }));

      moon = {
        x: width * 0.82,
        y: height * 0.22,
        r: Math.max(38, Math.min(width, height) * 0.07),
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const colorFor = (hue, alpha) => {
      if (hue === "blue") return `rgba(170, 200, 255, ${alpha})`;
      if (hue === "warm") return `rgba(255, 224, 190, ${alpha})`;
      return `rgba(245, 248, 255, ${alpha})`;
    };

    const drawMoon = () => {
      const { x, y, r } = moon;

      // Outer halo (kept subtle since only half the moon is lit)
      const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.6);
      halo.addColorStop(0, "rgba(232, 238, 252, 0.22)");
      halo.addColorStop(0.4, "rgba(160, 180, 230, 0.06)");
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Full moon body (we'll cover the dark side after)
      const body = ctx.createRadialGradient(
        x + r * 0.25, y - r * 0.25, r * 0.05,
        x, y, r * 1.05
      );
      body.addColorStop(0, "#fefdf6");
      body.addColorStop(0.55, "#ece8d4");
      body.addColorStop(1, "#9b9484");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Craters (subtle)
      ctx.fillStyle = "rgba(60, 58, 78, 0.18)";
      [
        [-0.10, -0.10, 0.16],
        [0.30, 0.22, 0.13],
        [0.45, -0.25, 0.085],
        [0.05, 0.40, 0.10],
        [-0.30, 0.20, 0.085],
        [0.15, -0.35, 0.06],
      ].forEach(([dx, dy, rs]) => {
        ctx.beginPath();
        ctx.arc(x + r * dx, y + r * dy, r * rs, 0, Math.PI * 2);
        ctx.fill();
      });

      // Half-moon shadow: cover the LEFT half with a soft terminator
      // Clip to circle, then paint a horizontal gradient that goes
      // from near-black on the left to transparent on the right.
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();

      const shadow = ctx.createLinearGradient(x - r, y, x + r * 0.10, y);
      shadow.addColorStop(0,    "rgba(2, 3, 8, 0.97)");
      shadow.addColorStop(0.45, "rgba(2, 3, 8, 0.92)");
      shadow.addColorStop(0.55, "rgba(2, 3, 8, 0.55)");
      shadow.addColorStop(1,    "rgba(2, 3, 8, 0.00)");
      ctx.fillStyle = shadow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();

      // Faint rim on the lit side only
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    };

    const drawStars = (t) => {
      for (const s of stars) {
        // Subtle twinkle: 75% baseline + 25% sin variance, so stars look mostly steady
        const tw = (Math.sin(t * 0.001 * s.twinkleSpeed + s.twinklePhase) + 1) * 0.5;
        const alpha = s.baseAlpha * (0.75 + tw * 0.25);

        // Core dot
        ctx.fillStyle = colorFor(s.hue, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Soft glow on medium+ stars
        if (s.r > 0.9) {
          ctx.fillStyle = colorFor(s.hue, alpha * 0.14);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Diffraction spikes on the brightest stars
        if (s.spikes) {
          const spikeLen = s.r * 6;
          const grad = ctx.createLinearGradient(
            s.x - spikeLen, s.y, s.x + spikeLen, s.y);
          grad.addColorStop(0,   "rgba(255,255,255,0)");
          grad.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.65})`);
          grad.addColorStop(1,   "rgba(255,255,255,0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(s.x - spikeLen, s.y);
          ctx.lineTo(s.x + spikeLen, s.y);
          ctx.stroke();

          const grad2 = ctx.createLinearGradient(
            s.x, s.y - spikeLen, s.x, s.y + spikeLen);
          grad2.addColorStop(0,   "rgba(255,255,255,0)");
          grad2.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.65})`);
          grad2.addColorStop(1,   "rgba(255,255,255,0)");
          ctx.strokeStyle = grad2;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - spikeLen);
          ctx.lineTo(s.x, s.y + spikeLen);
          ctx.stroke();
        }
      }
    };

    const drawDrifters = () => {
      for (const d of drifters) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -2) d.x = width + 2;
        if (d.x > width + 2) d.x = -2;
        if (d.y < -2) d.y = height + 2;
        if (d.y > height + 2) d.y = -2;

        ctx.fillStyle = "rgba(225, 234, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const spawnShootingStar = () => {
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -50 : width + 50;
      const startY = Math.random() * height * 0.55;
      const angle = fromLeft
        ? Math.PI / 5 + Math.random() * 0.25
        : Math.PI - (Math.PI / 5) - Math.random() * 0.25;
      const speed = 7 + Math.random() * 5;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 70 + Math.random() * 40,
      });
    };

    const drawShootingStars = () => {
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;

        const lifeT = s.life / s.maxLife;
        const alpha = lifeT < 0.2 ? lifeT / 0.2 : Math.max(0, (1 - lifeT) / 0.8);
        const speedMag = Math.hypot(s.vx, s.vy);
        const tail = 110;
        const tx = s.x - (s.vx / speedMag) * tail;
        const ty = s.y - (s.vy / speedMag) * tail;

        const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.4, `rgba(180, 210, 255, ${alpha * 0.6})`);
        grad.addColorStop(1, "rgba(180, 210, 255, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.7, 0, Math.PI * 2);
        ctx.fill();

        if (
          s.life > s.maxLife ||
          s.x < -180 || s.x > width + 180 ||
          s.y > height + 180
        ) {
          shootingStars.splice(i, 1);
        }
      }
    };

    const step = (t) => {
      ctx.clearRect(0, 0, width, height);
      drawMoon();
      drawStars(t);
      drawDrifters();

      if (t - lastShoot > nextShootDelay) {
        spawnShootingStar();
        lastShoot = t;
        nextShootDelay = 3500 + Math.random() * 5500;
      }
      drawShootingStars();

      requestAnimationFrame(step);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      drawMoon();
      for (const s of stars) {
        ctx.fillStyle = colorFor(s.hue, s.baseAlpha);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    window.addEventListener("resize", () => {
      resize();
      if (staticOnly) drawStatic();
    });

    resize();
    if (staticOnly) drawStatic();
    else requestAnimationFrame(step);
  }
})();
