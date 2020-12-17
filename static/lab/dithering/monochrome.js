import {
  blobToImageData,
  imageDataToPNG,
  imageToImageData,
} from "./image-utils.js";

const { fileinput, log, results, examplebtn, exampleimg } = document.all;
let worker;
if (typeof process !== "undefined" && process.env.TARGET_DOMAIN) {
  worker = new Worker("./monochrome-worker.js");
} else {
  worker = new Worker("./monochrome-worker.js", { type: "module" });
}
worker.addEventListener("message", async (ev) => {
  const { title, imageData } = ev.data;
  const imgUrl = URL.createObjectURL(await imageDataToPNG(imageData));
  results.innerHTML += `
    <div>
      <h1>${title}</h1>
      <img src="${imgUrl}">
    </div>
  `;
});
worker.addEventListener("error", () =>
  console.error("Something went wrong in the worker")
);

examplebtn.addEventListener("click", async () => {
  try {
    const imgData = await imageToImageData(exampleimg);
    worker.postMessage(imgData);
  } catch (e) {
    log.innerHTML += `${e.message}\n`;
  }
});

fileinput.addEventListener("change", async () => {
  const file = fileinput.files[0];
  try {
    const imgData = await blobToImageData(file);
    worker.postMessage(imgData);
  } catch (e) {
    log.innerHTML += `${e.message}\n`;
  }
});
