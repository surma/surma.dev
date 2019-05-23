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

import {unitSize} from "./buffer-utils.js";
import {fromGrayscale} from "./image-utils.js";

export function dct2(bIn, inStride, maxStride, bOut, outStride) {
  for(let i = 0; i < maxStride; i++) {
    bOut[i * outStride] = 0;
    for(let j = 0; j < maxStride; j++) {
      bOut[i * outStride] +=
        bIn[j * inStride] *
        Math.cos(Math.PI * i * (j + 0.5)/maxStride);
    }
    bOut[i * outStride] *=
      Math.sqrt(2 / maxStride) *
      (i === 0 ? 1/Math.sqrt(2) : 1);
  }
}

export function dct2_2d(dIn) {
  const {data: bIn, width, height} = dIn;
  const bOut = new Float64Array(bIn.length);
  const inSize = unitSize(bIn);
  const outSize = unitSize(bOut);
  // Transform rows
  for(let y = 0; y < height; y++) {
    const rowIn = new Uint8ClampedArray(bIn.buffer, y * width * inSize);
    const rowOut = new Float64Array(bOut.buffer, y * width * outSize);
    dct2(rowIn, 1, width, rowOut, 1);
  }
  const copy = new Float64Array(bOut);
  // Transform cols
  for(let x = 0; x < width; x++) {
    const colIn = new Float64Array(copy.buffer, x * outSize);
    const colOut = new Float64Array(bOut.buffer, x * outSize);
    dct2(colIn, width, height, colOut, width);
  }
  return {
    data: bOut,
    width, height
  };
}

export function dct3(bIn, inStride, maxStride, bOut, outStride) {
  for(let i = 0; i < maxStride; i++) {
    let sum = 0;
    for(let j = 0; j < maxStride; j++) {
      sum +=
        Math.sqrt(2 / maxStride) *
        (j === 0 ? 1/Math.sqrt(2) : 1) *
        bIn[j * inStride] *
        Math.cos(Math.PI * (i + 0.5) * j/maxStride);
    }
    bOut[i * outStride] = sum;
  }
}

export function dct3_2d(dIn) {
  const {data: bIn, width, height} = dIn;
  const bOut = new Float64Array(bIn.length);
  const inSize = unitSize(bIn);
  const outSize = unitSize(bOut);
  // Transform rows
  for(let y = 0; y < height; y++) {
    const rowIn = new Float64Array(bIn.buffer, y * width * inSize);
    const rowOut = new Float64Array(bOut.buffer, y * width * outSize);
    dct3(rowIn, 1, width, rowOut, 1);
  }
  const copy = new Float64Array(bOut);
  // Transform cols
  for(let x = 0; x < width; x++) {
    const colIn = new Float64Array(copy.buffer, x * outSize);
    const colOut = new Float64Array(bOut.buffer, x * outSize);
    dct3(colIn, width, height, colOut, width);
  }
  return {
    data: new Uint8ClampedArray(bOut),
    width, height
  };
}

export function dctImage(dct) {
  const max = new Float64Array(dct.data.buffer, 10 * 8).reduce((max, v) => v > max ? v : max) * 0.1;
  const min = new Float64Array(dct.data.buffer, 10 * 8).reduce((min, v) => v < min ? v : min) * 0.1;

  const o = {
    data: new Uint8ClampedArray(dct.data.length),
    width: dct.width,
    height: dct.height
  };
  dct.data.forEach((v, i) => o.data[i] = (v - min)/(max - min) * 255);
  return new ImageData(fromGrayscale(o).data, dct.width, dct.height);
}
