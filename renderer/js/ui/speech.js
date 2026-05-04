let speechTimeout = null;
export function showSpeech(html, duration) {
  const el = document.getElementById('speech-bubble');
  el.innerHTML = html;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => el.classList.remove('show'), duration);
}

export function showEmote() {}
