(function() {
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

  const canvas = document.querySelector('canvas');
  const svg = document.querySelector('svg');

  const gl = canvas.getContext('webgl');
  if(!gl) fatalError('No WebGL support :(');

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
  attribute vec4 a_position;

  void main() {
    gl_Position = a_position;
  }
  `);

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
  precision mediump float;

  void main() {
    gl_FragColor = vec4(1, 0, 0.5, 1);
  }
  `);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    fatalError('Could not not compile program');

  const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
  const buffer = gl.createBuffer();
  const mesh = new Float32Array();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.enableVertexAttribArray(positionAttribLocation);
  gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
  requestAnimationFrame(function f() {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(f);
  });
})();
