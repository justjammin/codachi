import { state, vrmaMap, STATES, BUILTIN_VRMAS, LOOP_STATES } from '../state.js';
import { stopVRMA, requestBuiltinVRMA, loadVRMAFromUrl } from '../scene.js';
import { renderBgThumbnails } from './background.js';

export function openSettings() {
  buildVRMARows();
  renderBgThumbnails(state.agents.find(a => a.id === state.activeAgentId));
  document.getElementById('settings-drawer').classList.add('open');
  document.getElementById('settings-backdrop').classList.add('show');
}

export function closeSettings() {
  document.getElementById('settings-drawer').classList.remove('open');
  document.getElementById('settings-backdrop').classList.remove('show');
}

export function buildVRMARows() {
  const cont = document.getElementById('vrma-rows');
  cont.innerHTML = '';
  const stateList = ['idle','typing','reading','running','waiting','error','done','alert'];
  stateList.forEach(stateName => {
    const cfg = STATES[stateName] || {};
    const entry = vrmaMap[stateName] || {};
    const row = document.createElement('div');
    row.className = 'vrma-row';

    const currentVal = entry.isCustom ? '__custom_loaded' : (entry.name || '');
    const builtinOptions = BUILTIN_VRMAS.map(n =>
      `<option value="${n}" ${currentVal === n ? 'selected' : ''}>${n.replace(/_/g,' ')}</option>`
    ).join('');
    const customOpt = entry.isCustom
      ? `<option value="__custom_loaded" selected>📎 ${entry.customName || 'custom'}</option>` : '';

    row.innerHTML = `
      <div class="vrma-lbl">
        <span>${cfg.emoji || ''}</span>
        <span>${stateName}</span>
      </div>
      <select class="vrma-select" data-state="${stateName}">
        <option value="" ${!currentVal ? 'selected' : ''}>Procedural</option>
        ${builtinOptions}
        ${customOpt}
        <option value="__upload">Upload…</option>
      </select>
      <input type="checkbox" class="loop-chk" data-state="${stateName}" title="Loop"
        ${entry.loop !== false ? 'checked' : ''}>
    `;
    cont.appendChild(row);

    row.querySelector('.vrma-select').addEventListener('change', e => {
      const val = e.target.value;
      if (val === '__upload') {
        e.target.value = currentVal;
        state.pendingVRMAUploadState = stateName;
        document.getElementById('vrma-input').click();
      } else if (val === '') {
        delete vrmaMap[stateName];
        if (stateName === state.currentState) { stopVRMA(); state.poseAnimator?.setState(stateName); }
        saveMappingToExtension();
      } else {
        vrmaMap[stateName] = { name: val, url: null, loop: LOOP_STATES.has(stateName), isCustom: false };
        requestBuiltinVRMA(stateName, val);
        saveMappingToExtension();
      }
    });

    row.querySelector('.loop-chk').addEventListener('change', e => {
      if (!vrmaMap[stateName]) vrmaMap[stateName] = {};
      vrmaMap[stateName].loop = e.target.checked;
      saveMappingToExtension();
    });
  });
}

export function saveMappingToExtension() {
  if (!window._vscode) return;
  const mapping = {};
  Object.entries(vrmaMap).forEach(([s, entry]) => {
    if (entry?.name && !entry.isCustom) mapping[s] = entry.name;
  });
  window._vscode.postMessage({ type: 'save_vrma_mapping', mapping });
}
