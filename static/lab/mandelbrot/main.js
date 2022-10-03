const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const {width, height} = canvas;

const worker = new Worker(new URL('worker.js', import.meta.url));
const sab = new SharedArrayBuffer(4 * height * width + 6 * 4);
worker.postMessage({sab, width, height});

const sabView = new Uint8ClampedArray(sab, 6 * 4);
const rect = new Float32Array(sab, 2* 4, 4 * 4)
const limit  = new Uint32Array(sab, 4, 4);
const hasChanged = new Int32Array(sab, 0, 4);

rect.set([-1, 1, -1, 1]);
limit[0] = 1000;
const ab = new ArrayBuffer(4 * height * width);
const abView = new Uint8ClampedArray(ab);
const img = new ImageData(abView, width, height);
requestAnimationFrame(function f() {
  abView.set(sabView);
  ctx.putImageData(img, 0, 0);
  requestAnimationFrame(f);
});

const factor = 0.1;
const limitSlider = document.querySelector('input[name=limit]');
canvas.addEventListener('click', ev => {
  const x = ev.clientX / canvas.width * (rect[1] - rect[0]) + rect[0];
  const y = ev.clientY / canvas.height * (rect[3] - rect[2]) + rect[2];
  const w = rect[1] - rect[0];
  const h = rect[3] - rect[2];

  if (ev.shiftKey) {
    const outwards = ev.altKey ? -1 : 1;
    rect[0] += w * factor * outwards;
    rect[1] -= w * factor * outwards;
    rect[2] += h * factor * outwards;
    rect[3] -= h * factor * outwards;
  } else {
    rect[0] = x - w/2;
    rect[1] = x + w/2;
    rect[2] = y - h/2;
    rect[3] = y + h/2;
  }
  limit[0] = limitSlider.value;
  hasChanged[0] = 1;
  Atomics.notify(hasChanged, 0);
});
