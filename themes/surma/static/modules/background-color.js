const phrases = [
  'Woah, turn down the yellow!',
  'Bring back the awesome yellow!'
];
const bar = document.querySelector('#yellowdude');
const phrase = bar.querySelector('span');
phrase.textContent = phrases[0];
phrase.addEventListener('click', () => {
  document.documentElement.classList.toggle('noyellow');
  var phraseIdx =
    document.documentElement.classList.contains('noyellow')?1:0;
  phrase.textContent = phrases[phraseIdx];
});
