import { RGBImageF32N0F8 } from "../ditherpunk/image-utils.js";

addEventListener("message", ({ data }) => {
  const img = RGBImageF32N0F8.fromImageData(data);
});
