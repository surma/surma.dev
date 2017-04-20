(function() {
  const canvas = document.querySelector('canvas');
  const svg = document.querySelector('svg');
  const gl = canvas.getContext('webgl');
  if(!gl) fatalError('No WebGL support :(');

  const textureCanvas = document.createElement('canvas');
  [textureCanvas.width, textureCanvas.height] = [canvas.width, canvas.height];
  function dom2canvas() {
    const svg = svg.cloneNode(true);

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

    return Promise.all(dataUriImages)
      .then(_ => {
        const s = new XMLSerializer().serializeToString(svg);
        const datauri = 'data:image/svg+xml;base64,' + base64js.fromByteArray(new TextEncoder().encode(s));
        const img = document.createElement('img');
        img.src = datauri;
        img.onload = _ => {
          const ctx = textureCanvas.getContext('2d');
          ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
          ctx.drawImage(img, 0, 0);
        }
      });
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
      fatalError('Could not compile shader');
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

  void main() {
    float r = length(a_vertex.xy);
    gl_Position = vec4(a_vertex.x, a_vertex.y, sin(3.0*u_time + 6.0*r) , 1.0);
  }
  `);

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
  precision mediump float;

  void main() {
    gl_FragColor = vec4(1.0, 0.0, (gl_FragCoord.z+1.0)/2.0, 1.0);
  }
  `);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    fatalError('Could not not compile program');

  const vertexAttribLocation = gl.getAttribLocation(program, 'a_vertex');
  const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
  const mesh = generateMesh(10, 10);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.enableVertexAttribArray(vertexAttribLocation);
  gl.vertexAttribPointer(vertexAttribLocation, 2, gl.FLOAT, false, 0, 0);
  const startTime = performance.now();
  requestAnimationFrame(function f(currentTime) {
    gl.uniform1f(timeUniformLocation, (currentTime - startTime)/1000);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 2);
    requestAnimationFrame(f);
  });
})();
