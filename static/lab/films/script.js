import "two-up-element/dist/two-up.js";
import "pinch-zoom-element/dist/pinch-zoom.js";

const { left, right, leftsettings, settings, twoup } = document.all;

const images = {
  delta3200: {
    cinstilldf96: new URL("./delta3200-cinstilldf96.avif", import.meta.url),
    kodakd76: new URL("./delta3200-kodakd76.avif", import.meta.url),
    kodakhc100: new URL("./delta3200-kodakhc100.avif", import.meta.url),
    ilfordid11: new URL("./delta3200-ilfordid11.avif", import.meta.url),
    ilfordilfosol3: new URL("./delta3200-ilfordilfosol3.avif", import.meta.url),
    ilfotecddx: new URL("./delta3200-ilfotecddx.avif", import.meta.url),
    ilfotechc: new URL("./delta3200-ilfotechc.avif", import.meta.url),
    ilfordmicrophen: new URL(
      "./delta3200-ilfordmicrophen.avif",
      import.meta.url
    ),
    ilfordperceptol: new URL(
      "./delta3200-ilfordperceptol.avif",
      import.meta.url
    ),
    compardr09: new URL("./delta3200-compardr09.avif", import.meta.url),
    kodaktmax: new URL("./delta3200-kodaktmax.avif", import.meta.url),
    kodakxtol: new URL("./delta3200-kodakxtol.avif", import.meta.url),
  },
  ilfordhp5: {
    cinstilldf96: new URL("./ilfordhp5-cinstilldf96.avif", import.meta.url),
    kodakd76: new URL("./ilfordhp5-kodakd76.avif", import.meta.url),
    kodakhc100: new URL("./ilfordhp5-kodakhc100.avif", import.meta.url),
    ilfordid11: new URL("./ilfordhp5-ilfordid11.avif", import.meta.url),
    ilfordilfosol3: new URL("./ilfordhp5-ilfordilfosol3.avif", import.meta.url),
    ilfotecddx: new URL("./ilfordhp5-ilfotecddx.avif", import.meta.url),
    ilfotechc: new URL("./ilfordhp5-ilfotechc.avif", import.meta.url),
    ilfordmicrophen: new URL(
      "./ilfordhp5-ilfordmicrophen.avif",
      import.meta.url
    ),
    ilfordperceptol: new URL(
      "./ilfordhp5-ilfordperceptol.avif",
      import.meta.url
    ),
    compardr09: new URL("./ilfordhp5-compardr09.avif", import.meta.url),
    kodaktmax: new URL("./ilfordhp5-kodaktmax.avif", import.meta.url),
    kodakxtol: new URL("./ilfordhp5-kodakxtol.avif", import.meta.url),
  },
  kodaktrix: {
    cinstilldf96: new URL("./kodaktrix-cinstilldf96.avif", import.meta.url),
    kodakd76: new URL("./kodaktrix-kodakd76.avif", import.meta.url),
    kodakhc100: new URL("./kodaktrix-kodakhc100.avif", import.meta.url),
    ilfordid11: new URL("./kodaktrix-ilfordid11.avif", import.meta.url),
    ilfordilfosol3: new URL("./kodaktrix-ilfordilfosol3.avif", import.meta.url),
    ilfotecddx: new URL("./kodaktrix-ilfotecddx.avif", import.meta.url),
    ilfotechc: new URL("./kodaktrix-ilfotechc.avif", import.meta.url),
    ilfordmicrophen: new URL(
      "./kodaktrix-ilfordmicrophen.avif",
      import.meta.url
    ),
    ilfordperceptol: new URL(
      "./kodaktrix-ilfordperceptol.avif",
      import.meta.url
    ),
    compardr09: new URL("./kodaktrix-compardr09.avif", import.meta.url),
    kodaktmax: new URL("./kodaktrix-kodaktmax.avif", import.meta.url),
    kodakxtol: new URL("./kodaktrix-kodakxtol.avif", import.meta.url),
  },
  tmax100: {
    cinstilldf96: new URL("./tmax100-cinstilldf96.avif", import.meta.url),
    kodakd76: new URL("./tmax100-kodakd76.avif", import.meta.url),
    kodakhc100: new URL("./tmax100-kodakhc100.avif", import.meta.url),
    ilfordid11: new URL("./tmax100-ilfordid11.avif", import.meta.url),
    ilfordilfosol3: new URL("./tmax100-ilfordilfosol3.avif", import.meta.url),
    ilfotecddx: new URL("./tmax100-ilfotecddx.avif", import.meta.url),
    ilfotechc: new URL("./tmax100-ilfotechc.avif", import.meta.url),
    ilfordmicrophen: new URL("./tmax100-ilfordmicrophen.avif", import.meta.url),
    ilfordperceptol: new URL("./tmax100-ilfordperceptol.avif", import.meta.url),
    compardr09: new URL("./tmax100-compardr09.avif", import.meta.url),
    kodaktmax: new URL("./tmax100-kodaktmax.avif", import.meta.url),
    kodakxtol: new URL("./tmax100-kodakxtol.avif", import.meta.url),
  },
};

const rightsettings = leftsettings.cloneNode(true);
rightsettings.querySelector("legend").textContent = "Right";
settings.append(rightsettings);

left.addEventListener("change", () => right.setTransform(left));
right.addEventListener("change", () => left.setTransform(right));

function assembleFileName(settings) {
  const film = settings.querySelector(".film").value;
  const developer = settings.querySelector(".developer").value;
  return images[film][developer];
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
