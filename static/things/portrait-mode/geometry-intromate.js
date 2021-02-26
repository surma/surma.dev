import { domMap, clamp } from "./geometry.mjs";

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
      entries
        .filter((entry) => entry.intersectionRatio >= 1)
        .forEach((entry) => {
          const geometry = entry.target;
          io.unobserve(geometry);
          const { diagram, rerender } = domMap.get(geometry.parentElement);
          Object.keys(diagram.handles).forEach((handleName, i) => {
            const originalX = diagram.handles[handleName].x;
            const originalY = diagram.handles[handleName].y;
            const start = performance.now();
            requestAnimationFrame(function f(now) {
              const delta = (now - start) / 1000;
              const factor = clamp(0, Math.min(delta, -delta + 3.0) / 0.5, 1);
              diagram.handles[handleName].x =
                originalX +
                factor * 10 * Math.cos(((delta / 3.0) * 3 + i *.3) * 2 * Math.PI);
              diagram.handles[handleName].y =
                originalY +
                factor * 10 * Math.sin(((delta / 3.0) * 3 + i *.3) * 2 * Math.PI);
              rerender();
              if (delta < 3) {
                requestAnimationFrame(f);
              }
            });
          });
        });
    },
    {
      threshold: 1,
    }
  );

  geometries.forEach((g) => io.observe(g));
}
run();
