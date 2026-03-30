(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  var glow = document.querySelector(".bg-glow");
  if (!glow) return;

  var targetX = 0.5;
  var targetY = 0.2;
  var currentX = 0.5;
  var currentY = 0.2;
  var rafId = null;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function tick() {
    currentX = lerp(currentX, targetX, 0.06);
    currentY = lerp(currentY, targetY, 0.06);
    var xPct = currentX * 100;
    var yPct = currentY * 40;
    glow.style.background =
      "radial-gradient(ellipse 50% 40% at " +
      xPct +
      "% " +
      yPct +
      "%, rgba(94, 234, 212, 0.18), transparent 70%), " +
      "radial-gradient(ellipse 40% 30% at " +
      (100 - xPct * 0.5) +
      "% " +
      (yPct + 15) +
      "%, rgba(139, 92, 246, 0.1), transparent 60%)";

    if (
      Math.abs(targetX - currentX) > 0.002 ||
      Math.abs(targetY - currentY) > 0.002
    ) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function schedule() {
    if (rafId == null) rafId = requestAnimationFrame(tick);
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      targetX = e.clientX / window.innerWidth;
      targetY = e.clientY / window.innerHeight;
      schedule();
    },
    { passive: true }
  );
})();
