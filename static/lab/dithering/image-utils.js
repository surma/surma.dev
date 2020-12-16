export async function blobToImageData(blob) {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  return imageToImageData(img);
}

export function imageToImageData(img) {
  const cvs = document.createElement("canvas");
  cvs.width = img.naturalWidth;
  cvs.height = img.naturalHeight;
  const ctx = cvs.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

export async function imageDataToPNG(imgData) {
  const cvs = document.createElement("canvas");
  cvs.width = imgData.width;
  cvs.height = imgData.height;
  const ctx = cvs.getContext("2d");
  ctx.putImageData(imgData, 0, 0);
  const blob = await new Promise(resolve => cvs.toBlob(resolve, "image/png"));
  return blob;
}

export function brightnessN0F8(r, g, b) {
  return 0.21 * r + 0.72 * g + 0.07 * b;
}

export function brightnessU8(r, g, b) {
  return brightnessN0F8(r / 255, g / 255, b / 255);
}

export class Image {
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
  pixelAt(x, y) {
    const nth = this.pixelIndex(x, y);
    return this.pixel(nth);
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
}

export class RGBAImageU8 extends Image {
  static NUM_CHANNELS = 4;

  constructor(data, width, height) {
    super();
    this.width = width;
    this.height = height;
    this.data = data;
  }

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

export class GrayImageF32N0F8 extends Image {
  static NUM_CHANNELS = 1;

  constructor(data, width, height) {
    super();
    this.width = width;
    this.height = height;
    this.data = data;
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
}
