import {
  blobToImageData,
  imageDataToPNG,
  imageToImageData,
  GrayImageF32N0F8
} from "../ditherpunk/image-utils.js";
import {message} from "../ditherpunk/worker-utils.js";

const {
  fileinput,
  log,
  results,
  examplebtn,
  exampleimg,
  bluenoiseimg
} = document.all;
let worker;
if (typeof process !== "undefined" && process.env.TARGET_DOMAIN) {
  worker = new Worker("./color-worker.js");
} else {
  worker = new Worker("./color-worker.js", { type: "module" });
}
worker.addEventListener("message", async ev => {
  const { id, type, title, imageData } = ev.data;
  const [algo, numColor] = id.split(":");
  let container = document.getElementById(algo);
  if (!container) {
    container = document.createElement("tr");
    container.id = algo;
    results.append(container);
  }
  let cell = container.getElementsByClassName(numColor)[0];
  if (!cell) {
    cell = document.createElement("td");
    cell.classList.add(numColor);
    container.append(cell);
  }
  while (cell.firstChild) {
    cell.firstChild.remove();
  }
  switch (type) {
    case "started":
      cell.innerHTML = "Processing...";
      break;
    case "result":
      const imgUrl = URL.createObjectURL(await imageDataToPNG(imageData));
      cell.innerHTML = `<img src="${imgUrl}">`;
      break;
  }
  cell.innerHTML += `<br>${title}`;
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

examplebtn.addEventListener("click", async () => {
  try {
    const imgData = await imageToImageData(exampleimg);
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

bluenoiseimg.decode().then(() => {
  const mask = GrayImageF32N0F8.fromImageData(imageToImageData(bluenoiseimg));
  worker.postMessage({ mask, id: "bluenoise" });
});

const numBayerLevels = 4;
let bayerWorker;
if (typeof process !== "undefined" && process.env.TARGET_DOMAIN) {
  bayerWorker = new Worker("../ditherpunk/bayer-worker.js", { name: "bayer" });
} else {
  bayerWorker = new Worker("../ditherpunk/bayer-worker.js", {
    name: "bayer",
    type: "module"
  });
}
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