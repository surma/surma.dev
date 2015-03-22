(function () {
  var search = document.querySelector('#searchpanel');
  window.toggleSearchPanel = function() {
    search.classList.add('transitioning');
    search.classList.toggle('visible');
  };

  search.addEventListener('transitionend', function() {
    search.classList.remove('transitioning');
  });
  document.addEventListener('keydown', function(ev) {
    if(ev.keyCode == '191' && (ev.ctrlKey || ev.metaKey)) {
      toggleSearchPanel();
    }
  });

  document.querySelector('#search').addEventListener('click', toggleSearchPanel);
})();
