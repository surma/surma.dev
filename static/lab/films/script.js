import "two-up-element/dist/two-up.js";
import "pinch-zoom-element/dist/pinch-zoom.js";

const { left, right, leftsettings, settings, twoup } = document.all;

const rightsettings = leftsettings.cloneNode(true);
rightsettings.querySelector("legend").textContent = "Right";
settings.append(rightsettings);

left.addEventListener("change", () => right.setTransform(left));
right.addEventListener("change", () => left.setTransform(right));

function assembleFileName(settings) {
  const film = settings.querySelector(".film").value;
  const developer = settings.querySelector(".developer").value;
  return `${film}-${developer}.avif`;
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
