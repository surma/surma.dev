const { getEXIF } = require("../gallery-helpers");
const html = String.raw;

function exifDate(s) {
  if (!s) {
    return;
  }
  // 2019:07:19 09:00:21
  const [d, t] = s.split(" ").map(s => s.split(":"));
  return new Date([d.join("-"), t.join(":")].join("T"));
}

function toISODate(date) {
  if (!date) {
    return "???";
  }
  return date.toISOString().replace(/T.+$/, "");
}

function fractionize([[num, den]]) {
  return num / den;
}

module.exports = class {
  async render({ page, file, location, date }) {
    const exif = await getEXIF({ file });
    let {
      LensModel,
      Model,
      DateTimeOriginal,
      ExposureTime,
      FNumber,
      FocalLength,
      ISO
    } = exif;
    if (!ExposureTime) {
      ExposureTime = "";
    } else if (ExposureTime[0][1] === 1) {
      ExposureTime = ExposureTime[0][0];
    } else {
      ExposureTime = `${ExposureTime[0][0]}/${ExposureTime[0][1]}`;
    }
    return html`
      <img src="./${file}" />
      <dl>
        <dt>Location</dt>
        <dd>${location}</dd>
        <dt>Camera</dt>
        <dd>${Model}</dd>
        <dt>Lens</dt>
        <dd>${LensModel}</dd>
        <dt>Focal length</dt>
        <dd>${FocalLength ? fractionize(FocalLength).toFixed(0) : "???"}mm</dd>
        <dt>Aperture</dt>
        <dd>f/${FNumber ? fractionize(FNumber).toFixed(1) : "???"}</dd>
        <dt>Shutter speed</dt>
        <dd>${ExposureTime}s</dd>
        <dt>ISO</dt>
        <dd>${ISO}</dd>
        <dt>Shot date</dt>
        <dd>${toISODate(exifDate(DateTimeOriginal))}</dd>
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
