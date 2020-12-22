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

  wrapCoordinates(x, y) {
    x = x % this.width;
    if (x < 0) x += this.width;
    y = y % this.height;
    if (y < 0) y += this.height;
    return [x, y];
  }

  pixelAt(x, y, { wrap = false } = {}) {
    if (wrap) {
      [x, y] = this.wrapCoordinates(x, y);
    } else {
      x = clamp(0, x, this.width - 1);
      y = clamp(0, y, this.height - 1);
    }
    const nth = this.pixelIndex(x, y);
    return this.pixel(nth);
  }

  valueAt({ x, y, channel = 0 }, { wrap = false } = {}) {
    if (wrap) {
      [x, y] = this.wrapCoordinates(x, y);
    }
    return this.data[
      this.pixelIndex(x, y) * this.constructor.NUM_CHANNELS + channel
    ];
  }

  setValueAt({ x, y, channel = 0 }, v, { wrap = false } = {}) {
    if (wrap) {
      [x, y] = this.wrapCoordinates(x, y);
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
      result.setValueAt(p.x, p.y, this.valueAt(p), 0);
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
    if (!fftGaussCache.has(key)) {
      const kernel = GrayImageF32N0F8.gaussianKernel(stdDev, {
        width: kernelWidth,
        height: kernelHeight
      })
        .toComplex()
        .fftSelf()
        .centerSelf();
      fftGaussCache.set(key, kernel);
    }
    return this.toComplex()
      .fftSelf()
      .centerSelf()
      .multiplySelf(fftGaussCache.get(key))
      .centerSelf()
      .ifftSelf()
      .centerSelf()
      .abs();
  }

  clampSelf({ min = 0, max = 1 } = {}) {
    return this.mapSelf(v => clamp(min, v, max));
  }
}

export function bitReverse(x, numBits) {
  // Oh-so-clever bit-hackery
  // https://stackoverflow.com/questions/60226845/reverse-bits-javascript
  x = ((x & 0x55555555) << 1) | ((x & 0xaaaaaaaa) >> 1);
  x = ((x & 0x33333333) << 2) | ((x & 0xcccccccc) >> 2);
  x = ((x & 0x0f0f0f0f) << 4) | ((x & 0xf0f0f0f0) >> 4);
  x = ((x & 0x00ff00ff) << 8) | ((x & 0xff00ff00) >> 8);
  x = ((x & 0x0000ffff) << 16) | ((x & 0xffff0000) >> 16);

  // Slight amendment here: The function assumes 32 bit are present
  // to reverse, but we only want `numBits`. So shift in the end accordingly.
  return x >>> (32 - numBits);
}

export class ImageComplexF64 extends Image {
  static BUFFER_TYPE = Float64Array;
  static NUM_CHANNELS = 2;

  real() {
    const img = GrayImageF32N0F8.empty(this.width, this.height);
    for (const p of img.allCoordinates()) {
      const [re] = this.valueAt(p.x, p.y);
      img.setValueAt(p, re);
    }
    return img;
  }

  imaginary() {
    const img = GrayImageF32N0F8.empty(this.width, this.height);
    for (const p of img.allCoordinates()) {
      const [, im] = this.valueAt(p.x, p.y);
      img.setValueAt(p, im);
    }
    return img;
  }

  abs() {
    const img = GrayImageF32N0F8.empty(this.width, this.height);
    for (const p of img.allCoordinates()) {
      const [re, im] = this.valueAt(p.x, p.y);
      img.setValueAt(p, Math.sqrt(re ** 2 + im ** 2));
    }
    return img;
  }

  valueAt(x, y, wrap = false) {
    if (wrap) {
      [x, y] = this.wrapCoordinates(x, y);
    }
    const offset = this.pixelIndex(x, y) * this.constructor.NUM_CHANNELS;
    const re = this.data[offset + 0];
    const im = this.data[offset + 1];
    return [re, im];
  }

  setValueAt(x, y, re, im, wrap = false) {
    if (wrap) {
      [x, y] = this.wrapCoordinates(x, y);
    }
    const offset = this.pixelIndex(x, y) * this.constructor.NUM_CHANNELS;
    this.data[offset + 0] = re;
    this.data[offset + 1] = im;
  }

  multiplySelf(other) {
    console.assert(
      this.width == other.width && this.height == other.height,
      "Images need to be same size"
    );
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const [v1re, v1im] = this.valueAt(x, y);
        const [v2re, v2im] = other.valueAt(x, y);
        this.setValueAt(
          x,
          y,
          v1re * v2re + v1im * v2im,
          v1re * v2im + v1im * v2re
        );
      }
    }
    return this;
  }

  centerSelf() {
    console.assert(
      this.width % 2 === 0 && this.height % 2 === 0,
      "width and height must be even"
    );

    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    outer: for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (x == 0 && y == halfHeight) {
          break outer;
        }
        const v = this.valueAt(x, y, true);
        const otherX = x + halfWidth;
        const otherY = y + halfHeight;
        const otherV = this.valueAt(otherX, otherY, true);
        this.setValueAt(x, y, ...otherV);
        this.setValueAt(otherX, otherY, ...v, true);
      }
    }
    return this;
  }

  uncenterSelf() {
    console.assert(
      this.width % 2 === 0 && this.height % 2 === 0,
      "width and height must be even"
    );
    // It’s its own inverse!!
    return this.centerSelf();
  }

  _fft1Self(start, num, inc, sign = -1) {
    const bits = Math.log2(num);
    // Re-arrange data to bit-reversed order
    for (let i = 0; i < num; i++) {
      const bi = bitReverse(i, bits);
      if (i >= bi) {
        continue;
      }
      const p1x = start.x + i * inc.x;
      const p1y = start.y + i * inc.y;
      const p2x = start.x + bi * inc.x;
      const p2y = start.y + bi * inc.y;
      const [v1re, v1im] = this.valueAt(p1x, p1y);
      const [v2re, v2im] = this.valueAt(p2x, p2y);
      this.setValueAt(p1x, p1y, v2re, v2im);
      this.setValueAt(p2x, p2y, v1re, v1im);
    }

    for (let s = 1; s <= bits; s++) {
      const m = 2 ** s;
      const wm = Complex.fromEuler(1, (sign * 2 * Math.PI) / m);
      for (let k = 0; k < num; k += m) {
        const w = Complex.fromEuler(1, 0);
        for (let j = 0; j < m / 2; j++) {
          const ptx = start.x + (k + j + m / 2) * inc.x;
          const pty = start.y + (k + j + m / 2) * inc.y;
          const t = w
            .copy()
            .multiplySelf(new Complex(...this.valueAt(ptx, pty)));
          const pux = start.x + (k + j) * inc.x;
          const puy = start.y + (k + j) * inc.y;
          const u = new Complex(...this.valueAt(pux, puy));
          this.setValueAt(
            pux,
            puy,
            ...u
              .copy()
              .addSelf(t)
              .toArray()
          );
          this.setValueAt(
            ptx,
            pty,
            ...u
              .copy()
              .subtractSelf(t)
              .toArray()
          );
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
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.setValueAt(x, y, ...f(this.valueAt(x, y)));
      }
    }
    return this;
  }

  ifftSelf() {
    const n = this.width * this.height;
    return this._fft2Self(1).mapSelf(v => {
      v.re /= n;
      v.im /= n;
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
  constructor(re, im) {
    this.re = re;
    this.im = im;
  }

  static fromCartesianObject({ re = 0, im = 0 } = {}) {
    return new Complex(re, im);
  }

  static fromEuler(r = 0, phi = 0) {
    return new Complex(r * Math.cos(phi), r * Math.sin(phi));
  }

  copy() {
    return new Complex(this.re, this.im);
  }

  addSelf(other) {
    this.re += other.re;
    this.im += other.im;
    return this;
  }

  subtractSelf(other) {
    this.re -= other.re;
    this.im -= other.im;
    return this;
  }

  multiplySelf(other) {
    let { re, im } = this;
    this.re = re * other.re - im * other.im;
    this.im = re * other.im + im * other.re;
    return this;
  }

  toArray() {
    return [this.re, this.im];
  }
}
