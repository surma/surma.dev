/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export async function toImageData(d) {
  if(typeof d === "strig") {
    d = await fetch(d).then(r => r.blob());
    d = await createImageBitmap(d);
  }
  const cvs = document.createElement("canvas");
  ([cvs.width, cvs.height] = [d.width, d.height]);
  const ctx = cvs.getContext("2d");
  ctx.drawImage(d, 0, 0);
  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

export function showData(d, cvs = null) {
  if(!cvs) {
    cvs = document.createElement("canvas");
    document.body.append(cvs);
  }
  ([cvs.width, cvs.height] = [d.width, d.height]);
  const ctx = cvs.getContext("2d");
  if(d instanceof ImageData) {
    ctx.putImageData(d, 0, 0);
  } else {
    ctx.drawImage(d, 0, 0);
  }
}
export function fromGrayscale(b) {
  const o = new Uint32Array(b.data.length);
  b.data.forEach((v, i) => o[i] =
    (v & 0xFF) |
    (v & 0xFF) << 8 |
    (v & 0xFF) << 16 |
    0xFF << 24);
  return new ImageData(
    new Uint8ClampedArray(o.buffer),
    b.width,
    b.height
  );
}

export function toGrayscale(b) {
  const bIn = new Uint32Array(b.data.buffer);
  const o = new Uint8ClampedArray(bIn.length);
  bIn.forEach((v, i) =>
    o[i] =
      (
        ((v >> 0) & 0xFF) +
        ((v >> 8) & 0xFF) +
        ((v >> 16) & 0xFF)
      ) / 3);
  return {
    data: o,
    width: b.width,
    height: b.height
  };
}

export function imageDiff(dA, dB, min, max) {
  const dOut = {
    data: new Uint8ClampedArray(dA.data.length),
    width: dA.width,
    height: dA.height
  }
  dOut.data.forEach((_, i, a) => a[i] = (Math.abs(dA.data[i] - dB.data[i]) - min)/(max-min)*255)
  return dOut;
}

export function toImageBitmap(d) {
  const cvs = document.createElement("canvas");
  cvs.width = d.width;
  cvs.height = d.height;
  const ctx = cvs.getContext("2d");
  ctx.putImageData(d, 0, 0);
  return createImageBitmap(cvs);
}
