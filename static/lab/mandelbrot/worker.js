class ComplexNumber {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  multiply(z) {
    return new ComplexNumber(z.a * this.a - z.b * this.b, z.a * this.b + z.b * this.a);
  }

  add(z) {
    return new ComplexNumber(z.a + this.a, z.b + this.b);
  }

  len() {
    return this.a * this.a - this.b * this.b;
  }
}

addEventListener('message', event => {
  const {sab, width, height} = event.data;
  const sabView = new Uint8ClampedArray(sab, 6 * 4);
  const rect = new Float32Array(sab, 2* 4, 4 * 4)
  const limit = new Uint32Array(sab, 4, 4);
  const hasChanged = new Int32Array(sab, 0, 4);

  while (true) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let counter = 0;
        const z0 = new ComplexNumber(x / width * (rect[1] - rect[0]) + rect[0], y / height * (rect[3] - rect[2]) + rect[2]);
        let c = new ComplexNumber(z0.a, z0.b);
        while ((counter < limit[0]) & (c.len() < 4)) {
          counter++;
          c = c.multiply(c).add(z0);
        }
        let p = (limit[0] - counter)/limit[0];
        p = Math.pow(p, 20);
        if (p <= 0) {
          sabView[y * width * 4 + x * 4 + 0] = 0;
          sabView[y * width * 4 + x * 4 + 1] = 0;
          sabView[y * width * 4 + x * 4 + 2] = 0;
        } else {
          sabView[y * width * 4 + x * 4 + 0] = p * 255;
          sabView[y * width * 4 + x * 4 + 1] = (1-p) * 255;
          sabView[y * width * 4 + x * 4 + 2] = 0;
        }
        sabView[y * width * 4 + x * 4 + 3] = 255;
      }
    }
    Atomics.wait(hasChanged, 0, 0);
    hasChanged[0] = 0;
  }
});
