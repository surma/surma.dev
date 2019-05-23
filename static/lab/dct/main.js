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

import {fromEvent, filter, map, forEach, discard, combineLatestWith} from "./ows.js";
import {showData, toImageData, toImageBitmap, toGrayscale, fromGrayscale, imageDiff} from "./image-utils.js";
import {dct2_2d, dct3_2d, dctImage} from "./dct.js";
import {compressRadius} from "./compress.js";
import "./crop-select.js";

function showImage(id, f, desc) {
  let cvs = document.getElementById(id);
  if(!cvs) {
    cvs = document.createElement("canvas");
    cvs.id = id;
    const h = document.createElement("h1");
    h.textContent = desc;
    document.all.main.append(h);
    document.all.main.append(cvs);
  }
  showData(f, cvs);
}

function fromInput(el, evName = "input") {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(el);
      el.addEventListener(evName, ev => {
        controller.enqueue(el);
      });
    }
  });
}

async function init() {
    fromInput(document.all.file, "change")
      .pipeThrough(map(el => el.files[0]))
      .pipeThrough(filter(f => !!f))
      .pipeThrough(map(createImageBitmap))
      .pipeThrough(map(toImageData))
      // .pipeThrough(forEach(d => showImage("input", d)))
      .pipeThrough(map(async d => {
        const gray = fromGrayscale(toGrayscale(d));
        document.all.crop.img = await toImageBitmap(gray);
      }))
      .pipeTo(discard());

    fromInput(document.all.scale)
      .pipeThrough(map(el => el.value))
      .pipeThrough(forEach(v => {
        document.all.crop.scale = v;
      }))
      .pipeTo(discard());

  let [img_in, cont] =
    fromEvent(document.all.crop, "change")
      // .pipeThrough(forEach(console.log))
      .pipeThrough(map(el => el.target.crop()))
      .pipeThrough(map(d => toGrayscale(d)))
    .pipeThrough(forEach(d => showImage("cropped", fromGrayscale(d), "Input")))
      .tee();

  cont
    .pipeThrough(map(d => dct2_2d(d)))
    .pipeThrough(forEach(d => showImage("dct", dctImage(d), "DCT")))
    .pipeThrough(combineLatestWith(
      fromInput(document.all.radius)
        .pipeThrough(map(el => el.value))
    ))
    .pipeThrough(map(([d, r]) => compressRadius(d, r)))
    .pipeThrough(forEach(d => showImage("mangled_dct", dctImage(d), "Mangled DCT")))
    .pipeThrough(map(d => dct3_2d(d)))
    .pipeThrough(forEach(d => showImage("grayscale_out", fromGrayscale(d), "Output")))
    .pipeThrough(combineLatestWith(
      img_in,
      fromInput(document.all.max)
        .pipeThrough(map(el => el.value))
    ))
    .pipeThrough(map(([img_out, img_in, max]) => imageDiff(img_out, img_in, 0, max)))
    .pipeThrough(forEach(d => showImage("diff", fromGrayscale(d), "abs(Input - Output)")))
    .pipeTo(discard());
  return;
}
init();

