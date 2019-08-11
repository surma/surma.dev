const { getEXIF } = require("../gallery-helpers");
const html = String.raw;

function fractionize(s) {
  const [num, den] = s.split("/").map(v => parseInt(v));
  return num / den;
}

module.exports = class {
  async render({ page, file }) {
    const exif = await getEXIF({ file });
    const {
      lensModel,
      model,
      dateTimeOriginal,
      exposureTime,
      fNumber,
      focalLength,
      photographicSensitivity
    } = exif;
    return html`
      <img src="./${file}" />
      <dl>
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
        <dt>Date</dt>
        <dd>${new Date(dateTimeOriginal).toUTCString()}</dd>
      </dl>
    `;
  }
  data() {
    return {
      layout: "photography"
    };
  }
};
