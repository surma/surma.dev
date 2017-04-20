<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <!--<link rel="stylesheet" href="styles.css">-->
  <style>
    body {
      display: flex;
    }
    .box {
      /*width: 512px;
      height: 512px;*/
      background-color: bisque;
      border: 1px solid black;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    span {
      color: blue;
      font-size: 20px;
    }
  </style>
</head>
<body>
<div>
  <div class="box">
    <span>Test 123</span>
    <input type="range">
    <input type="value">
    <input type="checkbox">
    <textarea></textarea>
    <img src="uvgrid_small.jpg" height=100>
  </div>
</div>

<canvas width="512" height="512">
</canvas>
<script>
function dom2Texture(elem, size) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('width', size);
  fo.setAttribute('height', size);
  svg.appendChild(fo);

  Array.from(document.querySelectorAll('style'))
    .forEach(styleTag => {
      fo.appendChild(styleTag.cloneNode(true));
    });

  Array.from(document.querySelectorAll('link[rel=stylesheet]'))
    .forEach(linkTag => {
      const styleTag = document.createElement('style');
      styleTag.innerText = Array.from(linkTag.sheet.cssRules).reduce((str, rule) => str + rule.cssText, '');
      fo.appendChild(styleTag);
    });

  const elemCopy = elem.cloneNode(true);

  const elemIterator = document.createNodeIterator(elem, NodeFilter.SHOW_ELEMENT, null);
  const elemCopyIterator = document.createNodeIterator(elemCopy, NodeFilter.SHOW_ELEMENT, null);

  while(true) {
    const node = elemIterator.nextNode();
    const nodeCopy = elemCopyIterator.nextNode();
    if(!node || !nodeCopy) break;

    // nodeCopy.style.cssText = cssStyleDeclarationToString(getComputedStyle(node));
    switch(node.nodeName) {
    case 'INPUT':
      nodeCopy.setAttribute('value', node.value);
      if(node.type === 'range') {
        nodeCopy.setAttribute('max', node.max);
        nodeCopy.setAttribute('min', node.min);
        nodeCopy.setAttribute('step', node.step);
      }
      if(node.type === 'checkbox' || node.type === 'radio') {
        if(node.checked) nodeCopy.setAttribute('checked', '');
          else nodeCopy.removeAttribute('checked');
      }
      break;
    case 'IMG':
      nodeCopy.src = img2dataURL(node);
      break;
    case 'TEXTAREA':
      nodeCopy.innerText = node.value;
      break;
    }
  }
  fo.appendChild(elemCopy);

  const serializer = new XMLSerializer();
  const doc = serializer.serializeToString(svg);
  const b64doc = btoa(doc);

  return 'data:image/svg+xml;base64,' + b64doc;
}

function img2dataURL(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL();
}

function cssStyleDeclarationToString(obj) {
  return Array.from(obj)
    .reduce((str, key) => `${str}${key}:${obj[key]};`, '');
}

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const size = 512;
const timeout = 100;
window.times = [];
setTimeout(function f() {
  const start = performance.now();
  const src = dom2Texture(document.querySelector('.box'), size);
  const img = document.createElement('img');
  img.onload = _ => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0);
    window.times.push(performance.now() - start);
    setTimeout(f, timeout);
  }
  img.src = src;
}, timeout);
</script>
</body>
</html>
