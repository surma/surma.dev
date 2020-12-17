import { GrayImageF32N0F8 } from "./image-utils.js";

const runtime = 40 * 1000; //ms
const size = 128;
const oi = 2.1;
const os = 1.0;

function random(a, b) {
  return Math.floor(Math.random() * (b - a) + a);
}

function torusDistance(p, q) {
  const x1 = Math.min(p[0], q[0]);
  const x2 = Math.max(p[0], q[0]);
  const y1 = Math.min(p[1], q[1]);
  const y2 = Math.max(p[1], q[1]);
  const deltaX = Math.min(x2 - x1, x1 + size - x2);
  const deltaY = Math.min(y2 - y1, y1 + size - y2);
  return deltaX ** 2 + deltaY ** 2;
}

function pointEnergy(p, i) {
  const pVal = noise.pixelAt(p[0], p[1])[0];
  const iVal = noise.pixelAt(i[0], i[1])[0];
  return Math.exp(
    -torusDistance(p, i) / oi ** 2 - Math.sqrt(Math.abs(pVal - iVal)) / os ** 2
  );
}

function swap(p, q) {
  let tmp = p[0];
  p[0] = q[0];
  q[0] = tmp;
}

// Calculates how much the energy changes
// when p and q are swapped.
function energyDelta(p, q) {
  let sumDelta = 0;
  const pPixel = noise.pixelAt(...p);
  const qPixel = noise.pixelAt(...q);
  for (const { x, y } of noise.allCoordinates()) {
    const isP = x == p[0] && y == p[1] ? 1.0 : 0.0;
    const isQ = x == q[0] && y == q[1] ? 1.0 : 0.0;

    let sumBefore, sumAfter;
    sumBefore = pointEnergy(p, [x, y]) * (1 - isP);
    sumBefore += pointEnergy(q, [x, y]) * (1 - isQ);

    swap(pPixel, qPixel);

    sumAfter = pointEnergy(p, [x, y]) * (1 - isP);
    sumAfter += pointEnergy(q, [x, y]) * (1 - isQ);

    swap(pPixel, qPixel);

    sumDelta += sumAfter - sumBefore;
  }
  return sumDelta;
}

const noise = new GrayImageF32N0F8(new Float32Array(size * size), size, size);
noise.mapSelf(() => Math.random());

const start = performance.now();
while (performance.now() - start < runtime) {
  const p = [random(0, noise.width), random(0, noise.height)];
  const q = [random(0, noise.width), random(0, noise.height)];
  if (p[0] == q[0] && p[1] == q[1]) {
    continue;
  }
  if (energyDelta(p, q) < 0) {
    swap(noise.pixelAt(...p), noise.pixelAt(...q));
  }
}
postMessage(noise);
