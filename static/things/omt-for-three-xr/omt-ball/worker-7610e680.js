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
define("./worker-7610e680.js",['./comlink-759ccaeb'], function (comlink) { 'use strict';

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
    constructor({ numBalls, roomSize, radius, dampening }) {
      this._dampening = dampening;
      this._numBalls = numBalls;
      this._roomSize = roomSize;
      this._radius = radius;
      this._pool = new MemoryPool(numBalls * 3 * Float32Array.BYTES_PER_ELEMENT);
      this._ballCounter = 0;
      this.framerate = 90;
      this.shootingRate = 50;
      this._guns = [
        {
          shooting: false,
          position: [0, 0, 0],
          quaternion: [0, 0, 0, 1]
        },
        {
          shooting: false,
          position: [0, 0, 0],
          quaternion: [0, 0, 0, 1]
        }
      ];
      this._positions = new Float32Array(this._pool.get());
      this._velocities = new Float32Array(this._pool.get());
      this._balls = Array.from({ length: this._numBalls }, (_, i) => {
        return {
          index: i,
          position: this._positions.subarray(i * 3, i * 3 + 3),
          velocity: this._velocities.subarray(i * 3, i * 3 + 3)
        };
      });
      this._init();
    }

    setCallback(cb) {
      this._cb = cb;
    }

    _init() {
      for (var i = 0; i < this._numBalls; i++) {
        this._balls[i].position[0] = random(
          -this._roomSize / 2 + 1,
          this._roomSize / 2 - 1
        );
        this._balls[i].position[1] = random(0, this._roomSize);
        this._balls[i].position[2] = random(
          -this._roomSize / 2 + 1,
          this._roomSize / 2 - 1
        );

        this._balls[i].velocity[0] = random(-0.005, 0.005);
        this._balls[i].velocity[1] = random(-0.005, 0.005);
        this._balls[i].velocity[2] = random(-0.005, 0.005);
      }
    }

    startShootingGun(id) {
      if (id > this._guns.length) {
        return;
      }
      this._guns[id].shooting = true;
    }

    stopShootingGun(id) {
      if (id > this._guns.length) {
        return;
      }
      this._guns[id].shooting = false;
    }

    setGun(id, position, quaternion) {
      if(id > this._guns.length) {
        return;
      }
      // console.log(id, this._guns[id]);
      this._guns[id].position = position;
      this._guns[id].quaternion = quaternion;
    }

    start() {
      this._lastFrame = performance.now();
      this._running = true;
      this._update();
    }

    getPositions() {
      const buffer = this._pool.get();
      new Float32Array(buffer).set(this._positions);
      return comlink.transfer(buffer, [buffer]);
    }

    put(buffer) {
      this._pool.put(buffer);
    }

    _update() {
      const currentFrame = performance.now();
      const nextFrame = currentFrame + 1000 / this.framerate;
      const delta = currentFrame - this._lastFrame;
      ///
      this._doPhysics(delta / 1000);
      this._shootBalls(delta / 1000);
      const positions = this.getPositions();
      this._cb(comlink.transfer(positions, [positions]));
      ///
      this._lastFrame = currentFrame;
      if (this._running) {
        let deltaToNextFrame = nextFrame - performance.now();
        if (deltaToNextFrame < 0) {
          deltaToNextFrame = 0;
        }
        setTimeout(() => this._update(), deltaToNextFrame);
      }
    }

    _shootBalls(delta) {
      for (const gun of this._guns) {
        if (!gun.shooting) {
          continue;
        }
        const previousBallCounter = Math.floor(this._ballCounter);
        this._ballCounter += this.shootingRate * delta;
        for (
          let i = previousBallCounter;
          i < Math.floor(this._ballCounter) && i < this._numBalls;
          i++
        ) {
          const ball = this._balls[i];
          vectorSet(ball.position, gun.position);
          vectorSet(ball.velocity, [random(-0.1, 0.1), 10, random(-0.1, 0.1)]);
        }
      }
      this._ballCounter %= this._numBalls;
    }

    _doPhysics(delta) {
      const range = this._roomSize / 2 - this._radius;
      const normal = new Float32Array(3);
      const relativeVelocity = new Float32Array(3);
      for (var i = 0; i < this._numBalls; i++) {
        const ball = this._balls[i];
        ball.position[0] += ball.velocity[0] * delta;
        ball.position[1] += ball.velocity[1] * delta;
        ball.position[2] += ball.velocity[2] * delta;

        // Bounce of walls
        if (ball.position[0] < -range || ball.position[0] > range) {
          ball.position[0] = clamp(ball.position[0], -range, range);
          ball.velocity[0] = -ball.velocity[0] * this._dampening;
        }

        if (
          ball.position[1] < this._radius ||
          ball.position[1] > this._roomSize
        ) {
          ball.position[1] = Math.max(ball.position[1], this._radius);

          ball.velocity[0] *= this._dampening;
          ball.velocity[1] = -ball.velocity[1] * this._dampening;
          ball.velocity[2] *= this._dampening;
        }

        if (ball.position[2] < -range || ball.position[2] > range) {
          ball.position[2] = clamp(ball.position[2], -range, range);
          ball.velocity[2] = -ball.velocity[2] * this._dampening;
        }

        // // Bounce of other balls
        for (var j = i + 1; j < this._numBalls; j++) {
          const otherBall = this._balls[j];
          vectorDifference(normal, ball.position, otherBall.position);

          const distance = vectorLength(normal);

          if (distance < 2 * this._radius) {
            vectorScalarProduct(normal, normal, 0.5 * distance - this._radius);

            vectorDifference(ball.position, ball.position, normal);
            vectorSum(otherBall.position, otherBall.position, normal);

            vectorNormalized(normal, normal);

            vectorDifference(relativeVelocity, ball.velocity, otherBall.velocity);

            vectorScalarProduct(
              normal,
              normal,
              vectorDot(relativeVelocity, normal)
            );

            vectorDifference(ball.velocity, ball.velocity, normal);
            vectorSum(otherBall.velocity, otherBall.velocity, normal);
          }
        }

        // Gravity
        ball.velocity[1] -= 9.8 * delta;
      }
    }
  }

  function clamp(v, min, max) {
    if (v < min) {
      return min;
    }
    if (v > max) {
      return max;
    }
    return v;
  }

  function vectorDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function vectorSum(t, a, b) {
    for (let i = 0; i < 3; i++) {
      t[i] = a[i] + b[i];
    }
    return t;
  }

  function vectorSet(t, [x, y, z]) {
    t[0] = x;
    t[1] = y;
    t[2] = z;
    return t;
  }

  function vectorDifference(t, a, b) {
    for (let i = 0; i < 3; i++) {
      t[i] = a[i] - b[i];
    }
    return t;
  }

  function vectorLength(a) {
    let length = vectorDot(a, a);
    length = Math.sqrt(length);
    return length;
  }

  function vectorScalarProduct(t, a, s) {
    for (let i = 0; i < 3; i++) {
      t[i] = a[i] * s;
    }
    return t;
  }

  function vectorNormalized(t, a) {
    const length = vectorLength(a);
    for (let i = 0; i < 3; i++) {
      t[i] = a[i] / length;
    }
    return t;
  }

  function random(a, b) {
    return Math.random() * (b - a) + a;
  }

  comlink.expose(BallShooter);

});
