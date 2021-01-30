async function run() {
  if (!IntersectionObserver) {
    return;
  }
  const geometries = [...document.querySelectorAll("svg.geometry")];
  if (geometries.length <= 0) {
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries.find((entry) => entry.intersectionRatio >= 1);
      if (!entry) {
        return;
      }
      io.disconnect();
      const geometry = entry.target;
      const handles = geometry.querySelectorAll(".handle");
      const start = performance.now();
      requestAnimationFrame(function f(now) {
        const delta = (now - start) / 1000;
        handles.forEach((handle) => {
          handle.style.strokeWidth = "4px";
          handle.style.stroke = `hsla(12deg 100% 60% / ${
            (Math.sin((delta / 0.5) * 2 * Math.PI) * 0.5 + 0.5) * 100
          }%)`;
        });
        if (delta < 2) {
          requestAnimationFrame(f);
        } else {
          handles.forEach((handle) => {
            handle.style.strokeWidth = "";
            handle.style.stroke = "";
          });
        }
      });
    },
    {
      threshold: 1,
    }
  );

  geometries.forEach((g) => io.observe(g));
}
run();
