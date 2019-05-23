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

export function compressRadius(dIn, r) {
  let {data, width, height} = dIn;
  data = data.map((v, i) => {
    const x = i % width;
    const y = Math.floor(i / width);
    if(x*x + y*y > Math.pow(Math.max(width, height) * r, 2)) {
      return 0;
    }
    return v;
 });
 return {data, width, height};
}

export function compressSignificant(b, width, height) {
  const result = new Float64Array(b.length);
  const sorted = [...b].map((v, i) => [v, i]).sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
  sorted.slice(0, width*height*0.25).forEach(([v, i]) => {
    result[i] = v;
  });
  b.set(result);
}
