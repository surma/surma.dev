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
define("./main.js",['require', './comlink-706df4ec'], function (require, comlink) { 'use strict';

  /**
   * @author mvilledieu / http://github.com/mvilledieu
   */

  if (/(Helio)/g.test(navigator.userAgent) && "xr" in navigator) {
    console.log("Helio WebXR Polyfill (Lumin 0.98.0)");

    if ("isSessionSupported" in navigator.xr) {
      const tempIsSessionSupported = navigator.xr.isSessionSupported.bind(
        navigator.xr
      );

      navigator.xr.isSessionSupported = function(/*sessionType*/) {
        // Force using immersive-ar
        return tempIsSessionSupported("immersive-ar");
      };
    }

    if (
      "isSessionSupported" in navigator.xr &&
      "requestSession" in navigator.xr
    ) {
      const tempRequestSession = navigator.xr.requestSession.bind(navigator.xr);

      navigator.xr.requestSession = function(/*sessionType*/) {
        return new Promise(function(resolve, reject) {
          var sessionInit = {
            optionalFeatures: ["local-floor", "bounded-floor"]
          };

          tempRequestSession("immersive-ar", sessionInit)
            .then(function(session) {
              resolve(session);
            })
            .catch(function(error) {
              return reject(error);
            });
        });
      };
    }
  }

  /**
   * @author mrdoob / http://mrdoob.com/
   */

  var BoxLineGeometry = function(
    width,
    height,
    depth,
    widthSegments,
    heightSegments,
    depthSegments
  ) {
    comlink.BufferGeometry.call(this);

    width = width || 1;
    height = height || 1;
    depth = depth || 1;

    widthSegments = Math.floor(widthSegments) || 1;
    heightSegments = Math.floor(heightSegments) || 1;
    depthSegments = Math.floor(depthSegments) || 1;

    var widthHalf = width / 2;
    var heightHalf = height / 2;
    var depthHalf = depth / 2;

    var segmentWidth = width / widthSegments;
    var segmentHeight = height / heightSegments;
    var segmentDepth = depth / depthSegments;

    var vertices = [];

    var x = -widthHalf,
      y = -heightHalf,
      z = -depthHalf;

    for (var i = 0; i <= widthSegments; i++) {
      vertices.push(x, -heightHalf, -depthHalf, x, heightHalf, -depthHalf);
      vertices.push(x, heightHalf, -depthHalf, x, heightHalf, depthHalf);
      vertices.push(x, heightHalf, depthHalf, x, -heightHalf, depthHalf);
      vertices.push(x, -heightHalf, depthHalf, x, -heightHalf, -depthHalf);

      x += segmentWidth;
    }

    for (var i = 0; i <= heightSegments; i++) {
      vertices.push(-widthHalf, y, -depthHalf, widthHalf, y, -depthHalf);
      vertices.push(widthHalf, y, -depthHalf, widthHalf, y, depthHalf);
      vertices.push(widthHalf, y, depthHalf, -widthHalf, y, depthHalf);
      vertices.push(-widthHalf, y, depthHalf, -widthHalf, y, -depthHalf);

      y += segmentHeight;
    }

    for (var i = 0; i <= depthSegments; i++) {
      vertices.push(-widthHalf, -heightHalf, z, -widthHalf, heightHalf, z);
      vertices.push(-widthHalf, heightHalf, z, widthHalf, heightHalf, z);
      vertices.push(widthHalf, heightHalf, z, widthHalf, -heightHalf, z);
      vertices.push(widthHalf, -heightHalf, z, -widthHalf, -heightHalf, z);

      z += segmentDepth;
    }

    this.setAttribute("position", new comlink.Float32BufferAttribute(vertices, 3));
  };

  BoxLineGeometry.prototype = Object.create(comlink.BufferGeometry.prototype);
  BoxLineGeometry.prototype.constructor = BoxLineGeometry;

  /**
   * @author mrdoob / http://mrdoob.com
   * @author Mugen87 / https://github.com/Mugen87
   */

  var VRButton = {
    createButton: function(renderer, options) {
      if (options && options.referenceSpaceType) {
        renderer.xr.setReferenceSpaceType(options.referenceSpaceType);
      }

      function showEnterVR(/*device*/) {
        var currentSession = null;

        function onSessionStarted(session) {
          session.addEventListener("end", onSessionEnded);

          renderer.xr.setSession(session);
          button.textContent = "EXIT VR";

          currentSession = session;
        }

        function onSessionEnded(/*event*/) {
          currentSession.removeEventListener("end", onSessionEnded);

          button.textContent = "ENTER VR";

          currentSession = null;
        }

        //

        button.style.display = "";

        button.style.cursor = "pointer";
        button.style.left = "calc(50% - 50px)";
        button.style.width = "100px";

        button.textContent = "ENTER VR";

        button.onmouseenter = function() {
          button.style.opacity = "1.0";
        };

        button.onmouseleave = function() {
          button.style.opacity = "0.5";
        };

        button.onclick = function() {
          if (currentSession === null) {
            // WebXR's requestReferenceSpace only works if the corresponding feature
            // was requested at session creation time. For simplicity, just ask for
            // the interesting ones as optional features, but be aware that the
            // requestReferenceSpace call will fail if it turns out to be unavailable.
            // ('local' is always available for immersive sessions and doesn't need to
            // be requested separately.)

            var sessionInit = {
              optionalFeatures: ["local-floor", "bounded-floor"]
            };
            navigator.xr
              .requestSession("immersive-vr", sessionInit)
              .then(onSessionStarted);
          } else {
            currentSession.end();
          }
        };
      }

      function disableButton() {
        button.style.display = "";

        button.style.cursor = "auto";
        button.style.left = "calc(50% - 75px)";
        button.style.width = "150px";

        button.onmouseenter = null;
        button.onmouseleave = null;

        button.onclick = null;
      }

      function showWebXRNotFound() {
        disableButton();

        button.textContent = "VR NOT SUPPORTED";
      }

      function stylizeElement(element) {
        element.style.position = "absolute";
        element.style.bottom = "20px";
        element.style.padding = "12px 6px";
        element.style.border = "1px solid #fff";
        element.style.borderRadius = "4px";
        element.style.background = "rgba(0,0,0,0.1)";
        element.style.color = "#fff";
        element.style.font = "normal 13px sans-serif";
        element.style.textAlign = "center";
        element.style.opacity = "0.5";
        element.style.outline = "none";
        element.style.zIndex = "999";
      }

      if ("xr" in navigator) {
        var button = document.createElement("button");
        button.style.display = "none";

        stylizeElement(button);

        navigator.xr.isSessionSupported("immersive-vr").then(function(supported) {
          supported ? showEnterVR() : showWebXRNotFound();
        });

        return button;
      } else {
        var message = document.createElement("a");
        message.href = "https://immersiveweb.dev/";

        if (window.isSecureContext === false) {
          message.innerHTML = "WEBXR NEEDS HTTPS"; // TODO Improve message
        } else {
          message.innerHTML = "WEBXR NOT AVAILABLE";
        }

        message.style.left = "calc(50% - 90px)";
        message.style.width = "180px";
        message.style.textDecoration = "none";

        stylizeElement(message);

        return message;
      }
    }
  };

  var camera, scene, renderer;
  var controller1, controller2;

  var room;

  // Field of View
  var fov = 80;
  // Number of balls;
  var ballCount = getNumBalls();
  // Radius of one ball
  var radius = 0.08;
  // Size of the room
  var roomSize = 6;
  // Loss of velocity when bouncing of walls
  var dampening = 0.8;

  var worker = new Worker(new URL(require.toUrl('./worker-aff5bc62.js'), document.baseURI).href);
  var BallShooter = comlink.wrap(worker);
  var ballShooter;
  var positions;
  var balls;

  init().then(() => animate());

  function getNumBalls() {
    const def = 200;
    const param = new URLSearchParams(document.location.search).get("balls");
    if (!param) {
      return def;
    }
    const numeric = parseInt(param);
    if (Number.isNaN(numeric)) {
      return def;
    }
    return numeric;
  }

  async function init() {
    ballShooter = await new BallShooter({
      numBalls: ballCount,
      roomSize,
      radius,
      dampening
    });
    scene = new comlink.Scene();
    scene.background = new comlink.Color(0x505050);

    camera = new comlink.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      10
    );
    camera.position.set(roomSize / 2, roomSize, roomSize / 2);
    camera.lookAt(-roomSize / 2, 0, -roomSize / 2);

    room = new comlink.LineSegments(
      new BoxLineGeometry(roomSize, roomSize, roomSize, 10, 10, 10),
      new comlink.LineBasicMaterial({ color: 0x808080 })
    );
    room.geometry.translate(0, roomSize / 2, 0);
    scene.add(room);

    var light = new comlink.HemisphereLight(0xffffff, 0x444444);
    light.position.set(1, 1, 1);
    scene.add(light);

    var geometry = new comlink.IcosahedronBufferGeometry(radius, 2);
    balls = new comlink.InstancedMesh(
      geometry,
      new comlink.MeshLambertMaterial({
        color: 0xff8000
      }),
      ballCount
    );
    // ThreeJS doesn't support frustrum culling for InstancedMesh yet.
    balls.frustumCulled = false;
    room.add(balls);

    positions = await ballShooter.getPositions();
    updateBallPositions();
    await ballShooter.setCallback(comlink.proxy(buffer => (positions = buffer)));

    //

    renderer = new comlink.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    //

    document.body.appendChild(VRButton.createButton(renderer));

    // controllers

    function onSelectStart() {
      ballShooter.startShootingGun(this.userData.id);
    }

    function onSelectEnd() {
      ballShooter.stopShootingGun(this.userData.id);
    }

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener("selectstart", onSelectStart);
    controller1.addEventListener("selectend", onSelectEnd);
    controller1.addEventListener("connected", function(event) {
      this.add(buildController(event.data));
    });
    controller1.addEventListener("disconnected", function() {
      this.remove(this.children[0]);
    });
    controller1.userData.id = 0;
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener("selectstart", onSelectStart);
    controller2.addEventListener("selectend", onSelectEnd);
    controller2.addEventListener("connected", function(event) {
      this.add(buildController(event.data));
    });
    controller2.addEventListener("disconnected", function() {
      this.remove(this.children[0]);
    });
    controller2.userData.id = 1;
    scene.add(controller2);

    //

    window.addEventListener("resize", onWindowResize, false);
    window.addEventListener("keydown", ev => {
      if (ev.code !== "Space") {
        return;
      }
      ev.preventDefault();
      ballShooter.startShootingGun(0);
    });
    window.addEventListener("keyup", ev => {
      if (ev.code !== "Space") {
        return;
      }
      ev.preventDefault();
      ballShooter.stopShootingGun(0);
    });
  }

  function buildController(data) {
    switch (data.targetRayMode) {
      case "tracked-pointer":
        var geometry = new comlink.BufferGeometry();
        geometry.setAttribute(
          "position",
          new comlink.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
        );
        geometry.setAttribute(
          "color",
          new comlink.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
        );

        var material = new comlink.LineBasicMaterial({
          vertexColors: true,
          blending: comlink.AdditiveBlending
        });

        return new comlink.Line(geometry, material);

      case "gaze":
        var geometry = new comlink.RingBufferGeometry(0.02, 0.04, 32).translate(
          0,
          0,
          -1
        );
        var material = new comlink.MeshBasicMaterial({
          opacity: 0.5,
          transparent: true
        });
        return new comlink.Mesh(geometry, material);
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function vectorIsNull(v) {
    return v.x === 0 && v.y === 0 && v.z === 0;
  }

  const tmp1 = [0, 0, 0];
  const tmp2 = [0, 0, 0, 0];
  const defaultRotation = new comlink.Quaternion()
    .setFromUnitVectors(new comlink.Vector3(0, 0, -1), new comlink.Vector3(0, 1, 0))
    .toArray();
  function handleController(controller) {
    if (vectorIsNull(controller.position)) {
      ballShooter.setGun(controller.userData.id, [0, 1, 0], defaultRotation);
    } else {
      ballShooter.setGun(
        controller.userData.id,
        controller.position.toArray(tmp1, 0),
        controller.quaternion.toArray(tmp2, 0)
      );
    }
  }

  async function updateBallPositions() {
    balls.instanceMatrix.array.set(positions);
    balls.instanceMatrix.needsUpdate = true;
  }
  //

  function animate() {
    renderer.setAnimationLoop(render);
    ballShooter.start();
  }

  async function render() {
    handleController(controller1);
    handleController(controller2);

    updateBallPositions();
    //
    renderer.render(scene, camera);
  }

});
