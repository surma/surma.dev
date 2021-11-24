import "two-up-element/dist/two-up.js";
import "pinch-zoom-element/dist/pinch-zoom.js";


const {left, right, leftsettings, settings, twoup} = document.all;

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
settings.addEventListener("change", () => {
  left.querySelector("img").src = assembleFileName(leftsettings);
  right.querySelector("img").src = assembleFileName(rightsettings);
});