var search = document.querySelector('#searchpanel');
search.addEventListener('transitionend', () => {search.classList.remove('transitioning');});

export function toggleSearchPanel() {
  search.classList.add('transitioning');
  search.classList.toggle('visible');
}

document.addEventListener('keydown', (ev) => {
  if(ev.keyCode == '191' && (ev.ctrlKey || ev.metaKey)) {
    toggleSearchPanel();
  }
});

document.querySelector('#search').addEventListener('click', toggleSearchPanel);
