/**
 * Lightweight canvas starfield — used for both the splash screen and the
 * fixed app background. Depth-layered stars drift slowly with parallax and
 * twinkle smoothly; a few "shooting stars" cross occasionally for realism.
 */
(function () {
  function initStarfield(canvasId, opts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const density = opts.density || 0.00022;
    let stars = [];
    let shootingStars = [];
    let width, height, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth = canvas.parentElement ? canvas.offsetWidth || window.innerWidth : window.innerWidth;
      height = canvas.offsetHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      const count = Math.floor(width * height * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random() * 0.6 + 0.2, // parallax drift speed
        hue: Math.random() > 0.85 ? 260 : Math.random() > 0.6 ? 190 : 0, // mostly white, some violet/cyan
      }));
    }

    function maybeSpawnShootingStar() {
      if (Math.random() < 0.0025 && shootingStars.length < 2) {
        const startX = Math.random() * width * 0.6;
        shootingStars.push({
          x: startX,
          y: Math.random() * height * 0.3,
          vx: 6 + Math.random() * 4,
          vy: 3 + Math.random() * 2,
          life: 1,
        });
      }
    }

    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, width, height);
      t += 1;

      for (const s of stars) {
        s.x -= s.depth * 0.03; // slow leftward drift
        if (s.x < -2) s.x = width + 2;
        const twinkle = Math.sin(t * s.twinkleSpeed + s.phase) * 0.35 + 0.65;
        const alpha = Math.max(0, s.baseAlpha * twinkle);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.hue
          ? `hsla(${s.hue}, 90%, 80%, ${alpha})`
          : `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      maybeSpawnShootingStar();
      shootingStars = shootingStars.filter((sh) => sh.life > 0);
      for (const sh of shootingStars) {
        ctx.save();
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 8, sh.y - sh.vy * 8);
        grad.addColorStop(0, `rgba(255,255,255,${sh.life})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 8, sh.y - sh.vy * 8);
        ctx.stroke();
        ctx.restore();
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.02;
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(draw);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initStarfield('splash-stars', { density: 0.00028 });
    initStarfield('bg-stars', { density: 0.00018 });
  });
})();
