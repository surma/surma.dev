export async function imageFileToImageData(url) {
  const img = document.createElement("img");
  img.src = url;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  return imageToImageData(img);
}

export async function blobToImageData(blob) {
  const url = URL.createObjectURL(blob);
  return imageFileToImageData(url);
}

export function imageToImageData(img) {
  const cvs = document.createElement("canvas");
  cvs.width = img.naturalWidth;
  cvs.height = img.naturalHeight;
  const ctx = cvs.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

export function imageDataToCanvas(imgData) {
  const cvs = document.createElement("canvas");
  cvs.width = imgData.width;
  cvs.height = imgData.height;
  const ctx = cvs.getContext("2d");
  ctx.putImageData(imgData, 0, 0);
  return cvs;
}
export async function imageDataToPNG(imgData) {
  const cvs = imageDataToCanvas(imgData);
  const blob = await new Promise(resolve => cvs.toBlob(resolve, "image/png"));
  return blob;
}

function clamp(min, v, max) {
  if (v < min) {
    return min;
  }
  if (v > max) {
    return max;
  }
  return v;
}

export function brightnessN0F8(r, g, b) {
  return 0.21 * r + 0.72 * g + 0.07 * b;
}

export function brightnessU8(r, g, b) {
  return brightnessN0F8(r / 255, g / 255, b / 255);
}

export class Image {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }

  static empty(width, height) {
    const buffer = new this.BUFFER_TYPE(width * height * this.NUM_CHANNELS);
    buffer.fill(0);
    return new this(buffer, width, height);
  }

  pixelIndex(x, y) {
    return y * this.width + x;
  }

  pixelForIndex(i) {
    return {
      x: i % this.width,
      y: Math.floor(i / this.width)
    };
  }

  pixel(nth) {
    return new this.data.constructor(
      this.data.buffer,
      this.data.byteOffset +
        nth * this.constructor.NUM_CHANNELS * this.data.BYTES_PER_ELEMENT,
      this.constructor.NUM_CHANNELS
    );
  }

  wrapCoordinates({ x, y }) {
    x = x % this.width;
    if (x < 0) x += this.width;
    y = y % this.height;
    if (y < 0) y += this.height;
    return { x, y };
  }

  pixelAt(x, y, { wrap = false } = {}) {
    if (wrap) {
      ({ x, y } = this.wrapCoordinates({ x, y }));
    } else {
      x = clamp(0, x, this.width - 1);
      y = clamp(0, y, this.height - 1);
    }
    const nth = this.pixelIndex(x, y);
    return this.pixel(nth);
  }

  valueAt({ x, y, channel = 0 }, { wrap = false } = {}) {
    if (wrap) {
      ({ x, y } = this.wrapCoordinates({ x, y }));
    }
    return this.data[
      this.pixelIndex(x, y) * this.constructor.NUM_CHANNELS + channel
    ];
  }

  setValueAt({ x, y, channel = 0 }, v, { wrap = false } = {}) {
    if (wrap) {
      ({ x, y } = this.wrapCoordinates({ x, y }));
    }
    this.data[
      this.pixelIndex(x, y) * this.constructor.NUM_CHANNELS + channel
    ] = v;
  }

  copy() {
    return new this.constructor(this.data.slice(), this.width, this.height);
  }

  mapSelf(f) {
    this.data.forEach(
      (v, i, arr) => (arr[i] = f(v, { ...this.pixelForIndex(i), i }))
    );
    return this;
  }

  isInBounds(x, y) {
    if (x < 0 || y < 0) {
      return false;
    }
    if (x >= this.width || y >= this.height) {
      return false;
    }
    return true;
  }

  randomPixel() {
    const i = Math.floor(Math.random() * this.width * this.height);
    return this.pixel(i);
  }

  *allCoordinates() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        yield { x, y };
      }
    }
  }

  *allPixels() {
    for (const { x, y } of this.allCoordinates()) {
      yield { x, y, pixel: this.pixelAt(x, y) };
    }
  }

  convolve(other) {
    console.assert(
      other.width % 2 == 1 && other.height % 2 == 1,
      "Convolution matrix must have odd size"
    );

    const result = this.copy();
    const offsetX = Math.floor(other.width / 2);
    const offsetY = Math.floor(other.height / 2);
    for (const p of this.allCoordinates()) {
      let sum = 0;
      for (const q of other.allCoordinates()) {
        const x = p.x + q.x - offsetX;
        const y = p.y + q.y - offsetY;
        sum += this.valueAt({ x, y }, { wrap: true }) * other.valueAt(q);
      }
      result.setValueAt(p, sum);
    }
    return result;
  }

  max() {
    let max;
    for (const i of this.allPixels()) {
      if (!max || max.pixel[0] < i.pixel[0]) {
        max = i;
      }
    }
    return max;
  }

  min() {
    let min;
    for (const i of this.allPixels()) {
      if (!min || min.pixel[0] > i.pixel[0]) {
        min = i;
      }
    }
    return min;
  }

  toComplex() {
    const result = ImageComplexF64.empty(this.width, this.height);
    const c = new Complex();
    for (const p of result.allCoordinates()) {
      result.setValueAt(p, c.setFromCartesian({ re: this.valueAt(p), im: 0 }));
    }
    return result;
  }
}

function nextOdd(n) {
  if (n % 2 == 0) {
    return n + 1;
  }
  return n;
}

export class RGBAImageU8 extends Image {
  static BUFFER_TYPE = Uint8ClampedArray;
  static NUM_CHANNELS = 4;

  static fromImageData(imgData) {
    return new RGBAImageU8(
      new Uint8ClampedArray(imgData.data),
      imgData.width,
      imgData.height
    );
  }

  toImageData() {
    return new ImageData(this.data.slice(), this.width, this.height);
  }
}

const gaussCache = new Map();
const fftGaussCache = new Map();

export class GrayImageF32N0F8 extends Image {
  static BUFFER_TYPE = Float32Array;
  static NUM_CHANNELS = 1;

  static gaussianKernel(
    stdDev,
    {
      width = nextOdd(Math.ceil(6 * stdDev)),
      height = nextOdd(Math.ceil(6 * stdDev))
    } = {}
  ) {
    const key = `${stdDev}:${width}:${height}`;
    if (gaussCache.has(key)) {
      return gaussCache.get(key).copy();
    }
    const img = GrayImageF32N0F8.empty(width, height);
    const factor = 1 / (2 * Math.PI * stdDev ** 2);
    for (const { x, y, pixel } of img.allPixels()) {
      pixel[0] =
        factor *
        Math.exp(
          -(
            (x - Math.floor(width / 2)) ** 2 +
            (y - Math.floor(width / 2)) ** 2
          ) /
            (2 * stdDev ** 2)
        );
    }
    gaussCache.set(key, img.copy());
    return img;
  }

  static fromImageData(sourceImage) {
    sourceImage = RGBAImageU8.fromImageData(sourceImage);

    const img = new GrayImageF32N0F8(
      new Float32Array(sourceImage.width * sourceImage.height),
      sourceImage.width,
      sourceImage.height
    );
    for (let i = 0; i < sourceImage.width * sourceImage.height; i++) {
      img.data[i] = brightnessU8(...sourceImage.pixel(i));
    }
    return img;
  }

  normalizeSelf() {
    const sum = this.data.reduce((sum, v) => sum + v, 0);
    this.mapSelf(v => v / sum);
    return this;
  }

  toImageData() {
    const data = new Uint8ClampedArray(this.data.length * 4);
    for (let i = 0; i < this.data.length; i++) {
      data[i * 4 + 0] = this.data[i] * 255;
      data[i * 4 + 1] = this.data[i] * 255;
      data[i * 4 + 2] = this.data[i] * 255;
      data[i * 4 + 3] = 255;
    }
    return new ImageData(data, this.width, this.height);
  }

  gaussianBlur(stdDev, { kernelWidth, kernelHeight } = {}) {
    const kernel = GrayImageF32N0F8.gaussianKernel(stdDev, {
      width: kernelWidth,
      height: kernelHeight
    });
    return this.convolve(kernel);
  }

  fftGaussianBlur(stdDev, { kernelWidth, kernelHeight } = {}) {
    // For now...
    kernelWidth = this.width;
    kernelHeight = this.height;
    const key = `${stdDev}:${kernelWidth}:${kernelHeight}`;
    if(!fftGaussCache.has(key)) {
      const kernel = GrayImageF32N0F8.gaussianKernel(stdDev, {
        width: kernelWidth,
        height: kernelHeight,
      }).toComplex().fftSelf().centerSelf();
      fftGaussCache.set(key, kernel);
    }
    return this.toComplex().fftSelf().centerSelf().multiplySelf(fftGaussCache.get(key)).centerSelf().ifftSelf().centerSelf().abs();
  }

  clampSelf({ min = 0, max = 1 } = {}) {
    return this.mapSelf(v => clamp(min, v, max));
  }
}

export function bitReverse(x, numBits) {
  // Lol
  return parseInt(
    x
      .toString(2)
      .padStart(numBits, "0")
      .split("")
      .reverse()
      .join(""),
    2
  );
  // x = (x & 0x55555555)  <<   1 | (x & 0xAAAAAAAA) >>  1;
  // x = (x & 0x33333333)  <<   2 | (x & 0xCCCCCCCC) >>  2;
  // x = (x & 0x0F0F0F0F)  <<   4 | (x & 0xF0F0F0F0) >>  4;
  // x = (x & 0x00FF00FF)  <<   8 | (x & 0xFF00FF00) >>  8;
  // x = (x & 0x0000FFFF)  <<  16 | (x & 0xFFFF0000) >> 16;

  // return x >>> 0;
}

export class ImageComplexF64 extends Image {
  static BUFFER_TYPE = Float64Array;
  static NUM_CHANNELS = 2;

  real() {
    const img = GrayImageF32N0F8.empty(this.width, this.height);
    for (const p of img.allCoordinates()) {
      img.setValueAt(p, this.valueAt(p).toCartesian().re);
    }
    return img;
  }

  imaginary() {
    const img = GrayImageF32N0F8.empty(this.width, this.height);
    for(const p of img.allCoordinates()) {
      img.setValueAt(p, this.valueAt(p).toCartesian().im);
    }
    return img;
  }

  abs() {
    const img = GrayImageF32N0F8.empty(this.width, this.height);
    for (const p of img.allCoordinates()) {
      img.setValueAt(p, this.valueAt(p).r);
    }
    return img;
  }

  valueAt({ x, y }, {wrap = false} = {}) {
    const r = super.valueAt({ x, y, channel: 0 }, {wrap});
    const phi = super.valueAt({ x, y, channel: 1 }, {wrap});
    return new Complex(r, phi);
  }

  setValueAt({ x, y }, c, {wrap = false} = {}) {
    super.setValueAt({ x, y, channel: 0 }, c.r, {wrap});
    super.setValueAt({ x, y, channel: 1 }, c.phi, {wrap});
  }

  multiplySelf(other) {
    console.assert(this.width == other.width && this.height == other.height, "Images need to be same size");
    for(const p of this.allCoordinates()) {
      this.setValueAt(p, this.valueAt(p).multiplySelf(other.valueAt(p)));
    }
    return this;
  }

  centerSelf() {
    console.assert(this.width % 2 === 0 && this.height %2 === 0, "width and height must be even");

    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    for(const p1 of this.allCoordinates()) {
      if(p1.x == 0 && p1.y == halfHeight) {
        break;
      }
      const v1 = this.valueAt(p1, {wrap: true});
      const p2 = {x: p1.x + halfWidth, y: p1.y + halfHeight};
      const v2 = this.valueAt(p2, {wrap: true});
      this.setValueAt(p1, v2, {wrap: true});
      this.setValueAt(p2, v1, {wrap: true});
    }
    return this;
  }

  uncenterSelf() {
    console.assert(this.width % 2 === 0 && this.height %2 === 0, "width and height must be even");
    // It’s its own inverse!!
    return this.centerSelf();
  }

  _fft1Self(start, num, inc, sign = -1) {
    const bits = Math.log2(num);
    // Re-arrange data to bit-reversed order
    for (let i = 0; i < num; i++) {
      const bi = bitReverse(i, bits);
      if (i > bi) {
        continue;
      }
      const p1 = { x: start.x + i * inc.x, y: start.y + i * inc.y };
      const p2 = { x: start.x + bi * inc.x, y: start.y + bi * inc.y };
      const v1 = this.valueAt(p1);
      const v2 = this.valueAt(p2);
      this.setValueAt(p1, v2);
      this.setValueAt(p2, v1);
    }

    for (let s = 1; s <= bits; s++) {
      const m = 2 ** s;
      const wm = new Complex(1, (sign * 2 * Math.PI) / m);
      for (let k = 0; k < num; k += m) {
        const w = new Complex(1, 0);
        for (let j = 0; j < m / 2; j++) {
          const pt = {
            x: start.x + (k + j + m / 2) * inc.x,
            y: start.y + (k + j + m / 2) * inc.y
          };
          const t = w.copy().multiplySelf(this.valueAt(pt));
          const pu = {
            x: start.x + (k + j) * inc.x,
            y: start.y + (k + j) * inc.y
          };
          const u = this.valueAt(pu);
          this.setValueAt(pu, u.copy().addSelf(t));
          this.setValueAt(pt, u.copy().subtractSelf(t));
          w.multiplySelf(wm);
        }
      }
    }
    return this;
  }

  fftSelf() {
    return this._fft2Self(-1);
  }

  mapSelf(f) {
    for (const c of this.allCoordinates()) {
      this.setValueAt(c, f(this.valueAt(c)));
    }
    return this;
  }

  ifftSelf() {
    const n = this.width * this.height;
    return this._fft2Self(1).mapSelf(v => {
      v.r /= n;
      return v;
    });
  }

  _fft2Self(sign = -1) {
    console.assert(this.width == this.height, "Can only fft square images");
    const numBits = Math.log2(this.width);
    console.assert(
      numBits == Math.floor(numBits),
      "Can only fft images whose size is a power of 2"
    );

    for (let y = 0; y < this.height; y++) {
      this._fft1Self({ x: 0, y }, this.width, { x: 1, y: 0 }, sign);
    }
    for (let x = 0; x < this.width; x++) {
      this._fft1Self({ x, y: 0 }, this.height, { x: 0, y: 1 }, sign);
    }
    return this;
  }
}

export class Complex {
  constructor(r, phi) {
    this.r = r;
    this.phi = phi;
  }

  static fromCartesian({ re = 0, im = 0 } = {}) {
    return new Complex(0, 0).setFromCartesian({ re, im });
  }

  copy() {
    return new Complex(this.r, this.phi);
  }

  addSelf(other) {
    const thisC = this.toCartesian();
    const otherC = other.toCartesian();
    thisC.re += otherC.re;
    thisC.im += otherC.im;
    this.setFromCartesian(thisC);
    return this;
  }

  subtractSelf(other) {
    other = other.copy();
    other.phi += -1 * Math.PI;
    return this.addSelf(other);
  }

  setFromCartesian({ re = 0, im = 0 } = {}) {
    this.r = Math.sqrt(re ** 2 + im ** 2);
    if (re == 0) {
      this.phi = 0;
    } else if (re > 0 && im == 0) {
      this.phi = 0;
    } else if (re < 0 && im == 0) {
      this.phi = -1 * Math.PI;
    } else {
      this.phi = 2 * Math.atan(im / (this.r + re));
    }
    return this;
  }

  toCartesian() {
    return {
      re: Math.cos(this.phi) * this.r,
      im: Math.sin(this.phi) * this.r
    };
  }

  multiplySelf(c) {
    this.r *= c.r;
    this.phi += c.phi;
    return this;
  }

  swapSelf() {
    const c = this.toCartesian();
    [c.re, c.im] = [c.im, c.re];
    this.setFromCartesian(c);
  }
}
