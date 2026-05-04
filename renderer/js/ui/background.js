import { state } from '../state.js';

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
