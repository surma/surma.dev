export default () => {
  window.requestAnimationFrame(() => {
    const lazyloads = document.querySelectorAll('noscript.lazyload');
    const container = document.createElement('div');
    [].forEach.call(lazyloads, lazyload => {
      const parent = lazyload.parentNode;
      container.innerHTML = lazyload.textContent;
      [].forEach.call(container.children, parent.appendChild.bind(parent));
    });
  });
};
