<!doctype html>
<img src="uvgrid.png" height=100>
<script>
  function showImg(url) {
    const img = document.createElement('img');
    img.setAttribute('height', 100);
    img.src= url;
    document.body.appendChild(img);
  }
  setTimeout(_ => {
    const srcImg = document.querySelector('img:nth-of-type(1)');
    const cv = document.createElement('canvas');
    cv.width = srcImg.width;
    cv.height = srcImg.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(srcImg, 0, 0);
    showImg(cv.toDataURL());

    fetch('/uvgrid.png')
      .then(resp => resp.arrayBuffer())
      .then(buffer => {
        showImg('data:image/png;base64,' + btoa(new TextDecoder().decode(buffer)));
      })
  }, 1000);
</script>
