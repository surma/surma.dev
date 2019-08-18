const { getEXIF } = require("../gallery-helpers");
const html = String.raw;

function toISODate(date) {
  return date.toISOString().replace(/T.+$/, "");
}

function fractionize(s) {
  const [num, den] = s.split("/").map(v => parseInt(v));
  return num / den;
}

module.exports = class {
  async render({ page, file, location, date }) {
    const exif = await getEXIF({ file });
    let {
      lensModel,
      model,
      dateTimeOriginal,
      exposureTime,
      fNumber,
      focalLength,
      photographicSensitivity
    } = exif;
    if (exposureTime.endsWith("/1")) {
      exposureTime = exposureTime.slice(0, -2);
    }
    return html`
      <img src="./${file}" />
      <dl>
        <dt>Location</dt>
        <dd>${location}</dd>
        <dt>Camera</dt>
        <dd>${model}</dd>
        <dt>Lens</dt>
        <dd>${lensModel}</dd>
        <dt>Focal length</dt>
        <dd>${fractionize(focalLength).toFixed(0)}mm</dd>
        <dt>Aperture</dt>
        <dd>f/${fractionize(fNumber).toFixed(1)}</dd>
        <dt>Shutter speed</dt>
        <dd>${exposureTime}s</dd>
        <dt>ISO</dt>
        <dd>${photographicSensitivity}</dd>
        <dt>Shot date</dt>
        <dd>${toISODate(new Date(dateTimeOriginal))}</dd>
        <dt>Publish date</dt>
        <dd>${toISODate(date)}</dd>
      </dl>
    `;
  }
  data() {
    return {
      layout: "photography"
    };
  }
};
