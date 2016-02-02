export default (fonts) => {
  window.requestAnimationFrame(() => {
    fonts.forEach(font => {
      const node = document.createElement('link');
      node.href = font;
      node.rel = 'stylesheet';
      node.type = 'text/css';
      document.head.appendChild(node);
    });
  });
};
