import { state } from '../state.js';

export function setVideoBackground(file) {
  const video = document.getElementById('bg-video');
  if (!video) return;
  if (video._objectUrl) URL.revokeObjectURL(video._objectUrl);

  const vp = document.getElementById('viewport');
  if (file.name.toLowerCase().endsWith('.gif')) {
    const url = URL.createObjectURL(file);
    video._objectUrl = url;
    video.classList.remove('active');
    vp.style.backgroundImage = `url('${url}')`;
    vp.style.backgroundSize = 'cover';
    vp.style.backgroundPosition = 'center';
  } else {
    const url = URL.createObjectURL(file);
    video._objectUrl = url;
    video.src = url;
    video.classList.add('active');
    vp.style.backgroundImage = '';
    vp.style.backgroundSize = '';
    vp.style.backgroundPosition = '';
  }
}

export function loadVideoFromPath(filePath) {
  if (!filePath) { clearVideoBackground(); return; }
  const video = document.getElementById('bg-video');
  if (!video) return;
  const vp = document.getElementById('viewport');
  const normalised = filePath.replace(/\\/g, '/');
  if (filePath.toLowerCase().endsWith('.gif')) {
    video.classList.remove('active');
    vp.style.backgroundImage = `url('file://${normalised}')`;
    vp.style.backgroundSize = 'cover';
    vp.style.backgroundPosition = 'center';
  } else {
    video.src = `file://${normalised}`;
    video.classList.add('active');
    vp.style.backgroundImage = '';
    vp.style.backgroundSize = '';
    vp.style.backgroundPosition = '';
  }
}

export function clearVideoBackground() {
  const video = document.getElementById('bg-video');
  if (!video) return;
  if (video._objectUrl) { URL.revokeObjectURL(video._objectUrl); video._objectUrl = null; }
  video.src = '';
  video.classList.remove('active');
  const vp = document.getElementById('viewport');
  vp.style.backgroundImage = '';
  vp.style.backgroundSize = '';
  vp.style.backgroundPosition = '';
}

export function updateViewportBg(agent) {
  const vp = document.getElementById('viewport');
  vp.style.backgroundImage = agent?.backgrounds?.length
    ? `url('${agent.backgrounds[agent.bgIndex]}')`
    : '';
  renderBgThumbnails(agent);
}

export function renderBgThumbnails(agent) {
  const cont = document.getElementById('bg-thumbnails');
  cont.innerHTML = '';
  if (!agent?.backgrounds?.length) return;
  agent.backgrounds.forEach((url, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'bg-wrap';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'bg-thumb' + (i === agent.bgIndex ? ' active' : '');
    img.addEventListener('click', () => { agent.bgIndex = i; updateViewportBg(agent); });
    const del = document.createElement('button');
    del.className = 'bg-del'; del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      URL.revokeObjectURL(agent.backgrounds[i]);
      agent.backgrounds.splice(i, 1);
      if (agent.bgIndex >= agent.backgrounds.length) agent.bgIndex = Math.max(0, agent.backgrounds.length - 1);
      updateViewportBg(agent);
    });
    wrap.appendChild(img); wrap.appendChild(del);
    cont.appendChild(wrap);
  });
}
