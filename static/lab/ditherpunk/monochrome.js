import {
  blobToImageData,
  imageDataToPNG,
  imageToImageData
} from "./image-utils.js";

import { message } from "./worker-utils.js";

const { fileinput, log, results } = document.all;
let worker;
  worker = new Worker(new URL("./monochrome-worker.js", import.meta.url), { type: "module" });
worker.addEventListener("message", async ev => {
  const { id, type, title, imageData } = ev.data;
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement("details");
    container.id = id;
    container.open = true;
    container.innerHTML = `<summary></summary>`;
    results.append(container);
  }
  while (container.lastChild.nodeName !== "SUMMARY") {
    container.lastChild.remove();
  }
  container.querySelector("summary").textContent = title;
  switch (type) {
    case "started":
      container.innerHTML += "Processing...";
      break;
    case "result":
      const imgUrl = URL.createObjectURL(await imageDataToPNG(imageData));
      container.innerHTML += `<img src="${imgUrl}">`;
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
    dither(imgData);
  } catch (e) {
    log.innerHTML += `${e.message}\n`;
  }
});

let bluenoiseWorker;
  bluenoiseWorker = new Worker(new URL("./bluenoise-worker.js", import.meta.url), {
    name: "bluenoise",
    type: "module"
  });
bluenoiseWorker.addEventListener("error", () =>
  console.error("Something went wrong in the Bluenoise worker")
);
bluenoiseWorker.addEventListener(
  "message",
  ({ data }) => {
    worker.postMessage({ ...data, id: "bluenoise" });
  },
  { once: true }
);

const numBayerLevels = 4;
let bayerWorker;
  bayerWorker = new Worker(new URL("./bayer-worker.js", import.meta.url), {
    name: "bayer",
    type: "module"
  });
bayerWorker.addEventListener("error", () =>
  console.error("Something went wrong in the Bayer worker")
);
const bayerLevels = Array.from({ length: numBayerLevels }, (_, id) => {
  bayerWorker.postMessage({
    level: id,
    id
  });
  return message(bayerWorker, id).then(m => m.result);
});
Promise.all(bayerLevels).then(bayerLevels =>
  worker.postMessage({ bayerLevels, id: "bayerlevels" })
);
