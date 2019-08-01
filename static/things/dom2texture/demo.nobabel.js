(function() {
  const canvas = document.querySelector('#gl');
  const textureCanvas = document.querySelector('#texture');
  const svg = document.querySelector('svg');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if(!gl) fatalError('No WebGL support :(');

  function dom2canvas(svg) {
    svg = svg.cloneNode(true);

    Array.from(svg.querySelectorAll('input'))
      .forEach(inputElem => {
        ['checked', 'disabled'].forEach(attrName => {
          if(inputElem[attrName]) inputElem.setAttribute(attrName, '');
            else inputElem.removeAttribute(attrName, '');
        });
        ['max', 'min', 'placeholder', 'step', 'value'].forEach(attrName => {
          inputElem.setAttribute(attrName, inputElem[attrName]);
        });
      });

    return new Promise(resolve => {
      const s = new XMLSerializer().serializeToString(svg);
      const datauri = 'data:image/svg+xml;base64,' + base64js.fromByteArray(new TextEncoder().encode(s));
      const img = document.createElement('img');
      img.src = datauri;
      img.onload = _ => {
        const ctx = textureCanvas.getContext('2d');
        ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(textureCanvas);
      }
    });
  }

  function generateTempTexture(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    for(let d = 0; d < h; d++) {
      ctx.fillStyle = `hsl(${d/h*120}, 100%, 50%)`;
      ctx.fillRect(0, d, w, 1);
    }
    return c;
  }

  function fatalError(str) {
    document.open();
    document.write(str);
    document.close();
    throw new Error(str);
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      fatalError(`Could not compile shader: ${gl.getShaderInfoLog(shader)}`);
    return shader;
  }

  function generateMesh(nx, ny) {
    const buffer = new Float32Array(nx * ny * 6 * 2);
    for(let y = 0; y < nx ; y++) {
      for(let x = 0; x < ny; x++) {
        buffer[(y * nx + x) * 6 * 2 +  0] = -1 + 2/nx * x;
        buffer[(y * nx + x) * 6 * 2 +  1] =  1 - 2/ny * y;
        buffer[(y * nx + x) * 6 * 2 +  2] = -1 + 2/nx * (x+1);
        buffer[(y * nx + x) * 6 * 2 +  3] =  1 - 2/ny * y;
        buffer[(y * nx + x) * 6 * 2 +  4] = -1 + 2/nx * x;
        buffer[(y * nx + x) * 6 * 2 +  5] =  1 - 2/ny * (y+1);
        buffer[(y * nx + x) * 6 * 2 +  6] = -1 + 2/nx * (x+1);
        buffer[(y * nx + x) * 6 * 2 +  7] =  1 - 2/ny * y;
        buffer[(y * nx + x) * 6 * 2 +  8] = -1 + 2/nx * x;
        buffer[(y * nx + x) * 6 * 2 +  9] =  1 - 2/ny * (y+1);
        buffer[(y * nx + x) * 6 * 2 + 10] = -1 + 2/nx * (x+1);
        buffer[(y * nx + x) * 6 * 2 + 11] =  1 - 2/ny * (y+1);
      }
    }
    return buffer;
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 a_vertex;
    uniform float u_time;
    uniform mat4 u_camera;
    uniform mat4 u_view;
    varying vec2 v_uv;

    void main() {
      float r = length(a_vertex.xy);
      gl_Position = u_view * u_camera * vec4(a_vertex.x + sin(4.0*u_time + a_vertex.y*9.0)*0.03, a_vertex.y, sin(3.0*u_time + 6.0*r)*0.1, 1.0);
      v_uv = vec2(3.0-a_vertex.x, 1.0 + a_vertex.y)*0.5;
    }
  `);

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_sampler;

    void main() {
      gl_FragColor = texture2D(u_sampler, v_uv);
    }
  `);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    fatalError(`Could not not compile program: ${gl.getProgramInfoLog(this._program)}`);
  gl.useProgram(program);

  const cameraUniformLocation = gl.getUniformLocation(program, 'u_camera');
  const viewUniformLocation = gl.getUniformLocation(program, 'u_view');
  const view = mat4.perspective(mat4.create(), 30, 1, 0.1, 1000);
  gl.uniformMatrix4fv(viewUniformLocation, false, view);
  let camera = mat4.lookAt(mat4.create(), [0, 0.5, 1.5], [0, 0, 0], [0, 1, 0]);
  gl.uniformMatrix4fv(cameraUniformLocation, false, camera);

  const samplerUniformLocation = gl.getUniformLocation(program, 'u_sampler');
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, generateTempTexture(gl.canvas.width, gl.canvas.height));
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.activeTexture(gl.TEXTURE0)
  gl.uniform1i(samplerUniformLocation, 0);

  const vertexAttribLocation = gl.getAttribLocation(program, 'a_vertex');
  const mesh = generateMesh(100, 100);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);

  gl.enableVertexAttribArray(vertexAttribLocation);
  gl.vertexAttribPointer(vertexAttribLocation, 2, gl.FLOAT, false, 0, 0);
  const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
  const startTime = performance.now();
  requestAnimationFrame(function f(currentTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeUniformLocation, (currentTime - startTime)/1000);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 2);
    requestAnimationFrame(f);
  });

  (function textureUpdate() {
    dom2canvas(svg)
      .then(img => {
        try {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.generateMipmap(gl.TEXTURE_2D);
        } catch(e){}
        setTimeout(textureUpdate, 100);
      });
  })();
})();
