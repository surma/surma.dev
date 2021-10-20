import Color from "colorjs.io/color.js";
import {imageToImageData, imageDataToPNG, blobToImageData} from "../ditherpunk/image-utils.js";
import "two-up-element/dist/two-up.js";
import "pinch-zoom-element/dist/pinch-zoom.js";

function clamp(min, v, max) {
  if(v < min) {
    return min;
  }
  if(v > max) {
    return max;
  }
  return v;
}

function srgbToCss(color) {
  return `rgb(${color.map(v => clamp(0, v*255, 255)).join(",")})`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function drawText(ctx, text, {textColor = "white", backgroundColor = "black", x = 0, y = 0, fontFamily = "sans-serif", fontSize = 16} = {}) {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px ${fontFamily}`;
  const box = ctx.measureText(text);
  ctx.fillStyle = backgroundColor;
  ctx.strokeStyle = "none";
  ctx.fillRect(x, y, box.width, box.actualBoundingBoxDescent);
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function colorMix(srgbA, srgbB, {unit = 256, interp = "pixelated"} = {}) {
  const cvs = document.createElement("canvas");
  cvs.style.imageRendering = interp;
  cvs.width = 3*unit;
  cvs.height = unit;
  // cvs.style.width = `${cvs.width / devicePixelRatio}px`;
  // cvs.style.height = `${cvs.height / devicePixelRatio}px`;
  const ctx = cvs.getContext("2d");
  ctx.fillStyle = srgbToCss(srgbA);
  ctx.fillRect(0, 0, unit, unit);
  ctx.fillStyle = srgbToCss(srgbB);
  for(let y = 0; y < unit; y++) {
    for(let x = y%2; x < unit; x+=2) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawText(ctx, "Alternating pixels", {x: 0, y: 0});

  ["srgb", "xyz"].forEach((space, i, arr) => {
    let middle = Color.mix(srgbA, srgbB, 0.5, {space}).to("srgb");
    ctx.fillStyle = middle.toString({format: "hex"}); 
    const x = unit;
    const y = i * unit / arr.length;
    ctx.fillRect(x, y, unit, unit/arr.length);
    drawText(ctx, `50/50 mix in ${space}`, {x, y});
  });


  let i = 0;
  requestAnimationFrame(function f() {
    i = (i+1)%2;
    ctx.fillStyle = srgbToCss([srgbA, srgbB][i]);
    ctx.fillRect(unit*2, 0, unit, unit);
    drawText(ctx, `Flickering`, {x: unit * 2, y: 0});
    requestAnimationFrame(f);
  });
  return cvs;
}

// document.body.append(colorMix([1, 1, 1], [0, 0, 0]));
// document.body.append(colorMix([1, 1, 1], [0, 0, 0], {interp: "auto"}));

const worker = new Worker(new URL("./color-worker.js", import.meta.url), {type: "module"});
const {left, right} = document.all;

left.addEventListener("change", () => right.setTransform(left));
right.addEventListener("change", () => left.setTransform(right));

worker.addEventListener("message", async ev => {
  const { id, type, title, imageData } = ev.data;
  switch (type) {
    case "started":
      break;
    case "result":
      const imgUrl = URL.createObjectURL(await imageDataToPNG(imageData));
      right.firstElementChild.src = imgUrl;
      break;
  }
});
worker.addEventListener("error", () =>
  console.error("Something went wrong in the worker")
);

function dither(image) {
  worker.postMessage({
    id: "image",
    image
  });
}

document.body.addEventListener("click", async ev => {
  const btn = ev.target.closest(".examplebtn");
  if (!btn) {
    return;
  }
  try {
    const img = btn.querySelector("img");
    left.firstElementChild.src = img.src;
    const imgData = await imageToImageData(img);
    dither(imgData);
  } catch (e) {
    log.innerHTML += `${e.message}\n`;
  }
});

fileinput.addEventListener("change", async () => {
  const file = fileinput.files[0];
  try {
    const imgData = await blobToImageData(file);
    const imgUrl = URL.createObjectURL(await imageDataToPNG(imgData));
    left.firstElementChild.src = imgUrl;
    dither(imgData);
  } catch (e) {
    log.innerHTML += `${e.message}\n`;
  }
});