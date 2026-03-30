(function () {
  var canvas = document.getElementById("sparkles");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0;
  var h = 0;
  var particles = [];
  var running = false;

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    if (w < 1 || h < 1) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initParticles() {
    particles = [];
    var count = Math.min(55, Math.floor((w * h) / 18000));
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.15,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.35 + 0.15,
        hue: Math.random() > 0.5 ? 170 : 260,
      });
    }
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -4) p.x = w + 4;
      if (p.x > w + 4) p.x = -4;
      if (p.y < -4) p.y = h + 4;
      if (p.y > h + 4) p.y = -4;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, "hsla(" + p.hue + ", 80%, 70%, " + p.a + ")");
      g.addColorStop(1, "hsla(" + p.hue + ", 80%, 50%, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }

  function startMotion() {
    if (reduceMotion || running) return;
    running = true;
    requestAnimationFrame(step);
  }

  function boot() {
    resize();
    initParticles();
    if (reduceMotion) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, "hsla(" + p.hue + ", 70%, 65%, " + (p.a * 0.6) + ")");
        g.addColorStop(1, "hsla(" + p.hue + ", 70%, 50%, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    startMotion();
  }

  window.addEventListener("resize", function () {
    resize();
    initParticles();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
