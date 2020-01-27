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

// If the loader is already loaded, just stop.
if (!self.define) {
  const singleRequire = async name => {
    if (name !== 'require') {
      name = name + '.js';
    }
    if (!registry[name]) {
      
        await new Promise(async resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = name;
            document.head.appendChild(script);
            script.onload = resolve;
          } else {
            importScripts(name);
            resolve();
          }
        });
      

      if (!registry[name]) {
        throw new Error(`Module ${name} didn’t register its module`);
      }
    }
    return registry[name];
  };

  const require = async (names, resolve) => {
    const modules = await Promise.all(names.map(singleRequire));
    resolve(modules.length === 1 ? modules[0] : modules);
  };
  
  // FIXME: This is probably not generic, lol.
  require.toUrl = id => `./${id}`;

  const registry = {
    require: Promise.resolve(require)
  };

  self.define = (moduleName, depsNames, factory) => {
    if (registry[moduleName]) {
      // Module is already loading or loaded.
      return;
    }
    registry[moduleName] = new Promise(async resolve => {
      let exports = {};
      const module = {
        uri: location.origin + moduleName.slice(1)
      };
      const deps = await Promise.all(
        depsNames.map(depName => {
          if (depName === "exports") {
            return exports;
          }
          if (depName === "module") {
            return module;
          }
          return singleRequire(depName);
        })
      );
      const facValue = factory(...deps);
      if(!exports.default) {
        exports.default = facValue;
      }
      resolve(exports);
    });
  };
}
define("./worker-6d9e75be.js",[],function () { 'use strict';

  importScripts("../js/comlink.js");

  class MemoryPool {
    constructor(byteSize) {
      this._byteSize = byteSize;
      this._pool = [];
    }

    get() {
      if (this._pool.length <= 0) {
        return new ArrayBuffer(this._byteSize);
      }
      return this._pool.shift();
    }

    put(buffer) {
      if (ArrayBuffer.isView(buffer)) {
        buffer = buffer.buffer;
      }
      console.assert(
        buffer.byteSize !== this._byteSize,
        "Buffer has invalid size"
      );
      this._pool.push(buffer);
    }
  }

  class BallShooter {
    constructor({ numBalls, roomSize }) {
      this._numBalls = numBalls;
      this._roomSize = roomSize;
      this._pool = new MemoryPool(numBalls * 3 * Float32Array.BYTES_PER_ELEMENT);
      this.framerate = 90;
      this._positions = new Float32Array(this._pool.get());
      this._velocities = new Float32Array(this._pool.get());
      this._init();
    }

    _init() {
      for (var i = 0; i < this._numBalls; i++) {
        this._positions[i * 3 + 0] = random(
          -this._roomSize / 2 + 1,
          this._roomSize / 2 - 1
        );
        this._positions[i * 3 + 1] = random(0, this._roomSize);
        this._positions[i * 3 + 2] = random(
          -this._roomSize / 2 + 1,
          this._roomSize / 2 - 1
        );

        this._velocities[i * 3 + 0] = random(-0.005, 0.005);
        this._velocities[i * 3 + 1] = random(-0.005, 0.005);
        this._velocities[i * 3 + 2] = random(-0.005, 0.005);
      }
    }

    start() {
      this._lastFrame = performance.now();
      this._running = true;
      this._update();
    }

    getPositions() {
      const buffer = this._pool.get();
      new Float32Array(buffer).set(this._positions);
      return Comlink.transfer(buffer, [buffer]);
    }

    put(buffer) {
      this._pool.put(buffer);
    }

    _update() {
      const currentFrame = perforance.now();
      const nextFrame = currentFrame + 1000 / this.framerate;
      const delta = currentFrame - this._lastFrame;
      ///
      console.log(delta);
      ///
      this._lastFrame = currentFrame;
      if (this._running) {
        setTimeout(() => this._update(), nextFrame - performance.now());
      }
    }
  }

  function random(a, b) {
    return Math.random() * (b - a) + a;
  }

  Comlink.expose(BallShooter);

});
