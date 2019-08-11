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
      <img src="./${file}" />
      <dl>
        <dt>Lens</dt>
        <dd>${lensModel}</dd>
        <dt>Camera</dt>
        <dd>${model}</dd>
      </dl>
    `;
  }
  data() {
    return {
      layout: "photography"
    };
  }
};
