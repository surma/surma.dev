/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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
function amb(...os) {
  return new ReadableStream({
      async start(controller) {
          const readers = os.map(o => o.getReader());
          const reads = readers.map(async (r, i) => [await r.read(), i]);
          let [{ value, done }, i] = await Promise.race(reads);
          reads
              .filter((_, j) => j !== i)
              .map(async (r, j) => {
              await r;
              readers[j].releaseLock();
          });
          const [fastestObs] = readers.slice(i, i + 1);
          while (true) {
              if (done) {
                  return controller.close();
              }
              controller.enqueue(value);
              ({ value, done } = await fastestObs.read());
          }
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function combineLatest(...os) {
  const hasValue = new Set();
  const latestValue = os.map(() => null);
  return new ReadableStream({
      async start(controller) {
          const forwarders = os.map(async (o, idx) => {
              const reader = o.getReader();
              while (true) {
                  const { value, done } = await reader.read();
                  if (done) {
                      return;
                  }
                  latestValue[idx] = value;
                  hasValue.add(reader);
                  if (hasValue.size === os.length) {
                      controller.enqueue([...latestValue]);
                  }
              }
          });
          await Promise.all(forwarders);
          controller.close();
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function merge(...os) {
  return new ReadableStream({
      async start(controller) {
          const forwarders = os.map(async (o) => {
              const reader = o.getReader();
              while (true) {
                  const { value, done } = await reader.read();
                  if (done) {
                      return;
                  }
                  controller.enqueue(value);
              }
          });
          await Promise.all(forwarders);
          controller.close();
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function zip(...os) {
  return new ReadableStream({
      async start(controller) {
          const readers = os.map(o => o.getReader());
          while (true) {
              const values = await Promise.all(readers.map(r => r.read()));
              if (values.some(({ done }) => done)) {
                  break;
              }
              controller.enqueue(values.map(({ value }) => value));
          }
          readers.forEach(r => r.releaseLock());
          controller.close();
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
const EOF = Symbol();
function external() {
  let next;
  const observable = new ReadableStream({
      async start(controller) {
          next = (v) => {
              if (v === EOF) {
                  return controller.close();
              }
              controller.enqueue(v);
          };
      }
  });
  return { observable, next: next };
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function fromEvent(el, name) {
  const { next, observable } = external();
  el.addEventListener(name, next);
  return observable;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function fromGenerator(f) {
  const it = f();
  return new ReadableStream({
      pull(controller) {
          const { value, done } = it.next();
          if (done) {
              return controller.close();
          }
          controller.enqueue(value);
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function fromIterable(it) {
  const { next, observable } = external();
  for (const v of it) {
      next(v);
  }
  next(EOF);
  return observable;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function fromTimer(ms) {
  const { next, observable } = external();
  setInterval(next, ms);
  return observable;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function just(v) {
  const { next, observable } = external();
  next(v);
  next(EOF);
  return observable;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function range(start, end) {
  const { observable, next } = external();
  const len = Math.abs(end - start);
  const dir = Math.sign(end - start);
  for (let i = 0; i <= len; i++) {
      next(start + i * dir);
  }
  next(EOF);
  return observable;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function repeat(v) {
  return new ReadableStream({
      pull(controller) {
          controller.enqueue(v);
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function bufferWithCount(count) {
  let buffer = [];
  return new TransformStream({
      async transform(chunk, controller) {
          buffer.push(chunk);
          if (buffer.length === count) {
              controller.enqueue(buffer);
              buffer = [];
          }
      },
      flush(controller) {
          if (buffer.length > 0) {
              controller.enqueue(buffer);
          }
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function combineLatestWith(...others) {
  const { readable, writable } = new TransformStream();
  return {
      writable,
      readable: combineLatest(readable, ...others)
  };
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function debounce(ms) {
  let latestDiscardedChunk;
  let hasDiscardedChunk = false;
  let isOnCooldown = false;
  let isClosed = false;
  return new TransformStream({
      transform(chunk, controller) {
          if (!isOnCooldown) {
              isOnCooldown = true;
              setTimeout(() => {
                  isOnCooldown = false;
                  if (hasDiscardedChunk && !isClosed) {
                      this.transform(latestDiscardedChunk, controller);
                      hasDiscardedChunk = false;
                  }
              }, ms);
              controller.enqueue(chunk);
          }
          else {
              latestDiscardedChunk = chunk;
              hasDiscardedChunk = true;
          }
      },
      flush() {
          isClosed = true;
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function distinct(f = (a, b) => a === b) {
  let last;
  let hasLast = false;
  return new TransformStream({
      transform(chunk, controller) {
          if (!hasLast) {
              last = chunk;
              hasLast = true;
              controller.enqueue(chunk);
              return;
          }
          if (!f(chunk, last)) {
              controller.enqueue(chunk);
          }
          last = chunk;
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function filter(f) {
  return new TransformStream({
      transform(chunk, controller) {
          if (f(chunk)) {
              controller.enqueue(chunk);
          }
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function forEach(f) {
  return new TransformStream({
      async transform(chunk, controller) {
          controller.enqueue(chunk);
          f(chunk);
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function map(f) {
  return new TransformStream({
      async transform(chunk, controller) {
          controller.enqueue(await f(chunk));
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function mergeWith(other) {
  const { readable, writable } = new TransformStream();
  return {
      writable,
      readable: merge(readable, other)
  };
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function scan(f, v0) {
  return new TransformStream({
      transform(chunk, controller) {
          v0 = f(v0, chunk);
          controller.enqueue(v0);
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function takeWhile(f) {
  return new TransformStream({
      transform(chunk, controller) {
          if (!f(chunk)) {
              return controller.terminate();
          }
          controller.enqueue(chunk);
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function take(n) {
  return new TransformStream({
      transform(chunk, controller) {
          if (n > 0) {
              controller.enqueue(chunk);
          }
          if (--n <= 0) {
              controller.terminate();
          }
      }
  });
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function zipWith(other) {
  const { readable, writable } = new TransformStream();
  return {
      writable,
      readable: zip(readable, other)
  };
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
async function collect(o) {
  let buffer = [];
  const reader = o.getReader();
  while (true) {
      const { value, done } = await reader.read();
      if (done) {
          return buffer;
      }
      buffer.push(value);
  }
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
function discard() {
  return new WritableStream();
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
async function first(o) {
  const reader = o.getReader();
  const { value, done } = await reader.read();
  if (done) {
      throw new Error("Observable finished without emitting any items");
  }
  reader.releaseLock();
  return value;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
async function last(o) {
  const reader = o.getReader();
  let latestValue;
  let hasLatestValue = false;
  while (true) {
      const { value, done } = await reader.read();
      if (done) {
          break;
      }
      latestValue = value;
      hasLatestValue = true;
  }
  if (!hasLatestValue) {
      throw new Error("Observable finished without emitting any items");
  }
  return latestValue;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
async function reduce(o, f, v0) {
  return last(o.pipeThrough(scan(f, v0)));
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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
async function single(o) {
  const reader = o.getReader();
  const { value, done } = await reader.read();
  if (done) {
      throw new Error("Observable finished without emitting any items");
  }
  if (!(await reader.read()).done) {
      throw new Error("Observable emitted more than one item");
  }
  return value;
}

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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

/**
* Copyright 2018 Google Inc. All Rights Reserved.
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

export { amb, combineLatest, merge, zip, EOF, external, fromEvent, fromGenerator, fromIterable, fromTimer, just, range, repeat, bufferWithCount, combineLatestWith, debounce, distinct, filter, forEach, map, mergeWith, scan, takeWhile, take, zipWith, collect, discard, first, last, reduce, single };
