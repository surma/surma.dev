import "two-up-element/dist/two-up.js";
import "pinch-zoom-element/dist/pinch-zoom.js";

const { left, right, leftsettings, settings, twoup } = document.all;

const images = {
  "house-delta400": {
    none: new URL("./house-delta400-none.avif", import.meta.url),
    red: new URL("./house-delta400-red.avif", import.meta.url),
    orange: new URL("./house-delta400-orange.avif", import.meta.url),
    yellow: new URL("./house-delta400-yellow.avif", import.meta.url),
    green: new URL("./house-delta400-green.avif", import.meta.url),
  },
  "park-delta400": {
    none: new URL("./park-delta400-none.avif", import.meta.url),
    red: new URL("./park-delta400-red.avif", import.meta.url),
    orange: new URL("./park-delta400-orange.avif", import.meta.url),
    yellow: new URL("./park-delta400-yellow.avif", import.meta.url),
    green: new URL("./park-delta400-green.avif", import.meta.url),
  },
  "river-delta100": {
    none: new URL("./river-delta100-none.avif", import.meta.url),
    red: new URL("./river-delta100-red.avif", import.meta.url),
    orange: new URL("./river-delta100-orange.avif", import.meta.url),
    yellow: new URL("./river-delta100-yellow.avif", import.meta.url),
    green: new URL("./river-delta100-green.avif", import.meta.url),
  },
};

const rightsettings = leftsettings.cloneNode(true);
rightsettings.querySelector("legend").textContent = "Right";
settings.append(rightsettings);

left.addEventListener("change", () => right.setTransform(left));
right.addEventListener("change", () => left.setTransform(right));

function assembleFileName(settings) {
  const subject = settings.querySelector(".subject").value;
  const filter = settings.querySelector(".filter").value;
  return images[subject][filter];
}

function updateImages() {
  left.querySelector("img").src = assembleFileName(leftsettings);
  right.querySelector("img").src = assembleFileName(rightsettings);
}
updateImages();
settings.addEventListener("change", () => updateImages());

document.body.addEventListener("keydown", (ev) => {
  if (ev.code === "Digit1") twoup.style = `--split-point: 0px`;
  if (ev.code === "Digit2")
    twoup.style = `--split-point: ${twoup.clientWidth / 2}px`;
  if (ev.code === "Digit3")
    twoup.style = `--split-point: ${twoup.clientWidth}px`;
});
