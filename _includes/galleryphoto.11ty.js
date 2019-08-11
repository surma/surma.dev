const { getEXIF } = require("../gallery-helpers");
const html = String.raw;
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
      <dl>
        <dt>Lens</dt>
        <dd>${lensModel}</dd>
        <dt>Camera</dt>
        <dd>${model}</dd>
      </dl>
      <img src="./${file}" />
    `;
  }
  data() {
    return {
      layout: "default"
    };
  }
};
