const config = {
  length: 2048,
  backgroundColor: 'white',
  lineColor: 'black',
  turns: 64,
  segmentsPerTurn: 3600*2,
  get gap() {
    return this.length/2/this.turns;
  },
  get anglePerSegment() {
    return 360/this.segmentsPerTurn;
  },
  get radiusPerSegment() {
    return this.gap / this.segmentsPerTurn;
  },

  toFrequency: function(b, p) {
    return p.radius * 2;
  },
  toAmplitude: function(b, p) {
    return Math.pow(1-b, 1.2) * this.gap / 2 * 1.2;
  }
}



function brightnessInImage(x, y) {
  return x / config.length;
}

function angleToPolar(alpha) {
  return {
    radius: alpha / 360 * config.segmentsPerTurn * config.radiusPerSegment,
    angle: (alpha % 360)/ 360 * 2 * Math.PI
  };
}

function polarToCartesian(polar) {
  return [
    config.length/2 + Math.cos(polar.angle)*polar.radius,
    config.length/2 + Math.sin(polar.angle)*polar.radius
  ];
}

function render(brightnessF) {
  const c = document.createElement('canvas');
  c.style.widht = '100vmin';
  c.style.height = '100vmin';
  c.width = config.length;
  c.height = config.length;
  document.body.appendChild(c);

  const ctx = c.getContext('2d');
  ctx.fillStyle = config.backgroundColor;
  ctx.strokeStyle = config.lineColor;
  ctx.fillRect(0, 0, config.length, config.length);
  ctx.moveTo(config.length/2, config.length/2);

  // noprotect
  let angle = 0;
  for(let segment = 0; segment < (config.turns * config.segmentsPerTurn); segment++) {
    angle += config.anglePerSegment;
    let polar = angleToPolar(angle);
    const cartesian = polarToCartesian(polar);

    const brightness = brightnessF(...cartesian);
    polar.radius += Math.sin(polar.angle * config.toFrequency(brightness, polar)) * config.toAmplitude(brightness, polar);

    ctx.lineTo(...polarToCartesian(polar));
  }

  ctx.stroke();
}

document.querySelector('button').addEventListener('click', async () => {
  try {
    const f = document.querySelector('input').files[0];
    const buffer = await new Response(f).arrayBuffer();
    const type = f.name.endsWith(".png") ? "png" : "jpeg";
    const blob = new Blob([buffer], {type: `image/${type}`});
    const bitmap = await createImageBitmap(blob);
    const imagedata = toImageData(bitmap);
    render((x, y) => rgbToGrayscale(
      imagedata.data[(Math.floor(x) + Math.floor(y) * imagedata.width)*4+0],
      imagedata.data[(Math.floor(x) + Math.floor(y) * imagedata.width)*4+1],
      imagedata.data[(Math.floor(x) + Math.floor(y) * imagedata.width)*4+2]
      )/255);
  } catch(e) {
    console.error(e);
  }
});

function toImageData(bitmap) {
  const c = document.createElement('canvas');
  c.width = config.length;
  c.height = config.length;
  const ctx = c.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, config.length, config.length);
  return ctx.getImageData(0, 0, config.length, config.length);
}

function rgbToGrayscale(r, g, b) {
  return 0.30*r + 0.59*g + 0.11*b;
}