import { state, vrmaMap, MOCK_EVENTS, LOOP_STATES, PERSONALITIES } from '../state.js';
import { loadVRM, loadVRMAFromUrl } from '../scene.js';
import { showSpeech, showEmote } from './speech.js';
import { renderAgentTabs, setActiveAgent, setAgentState, addLog, spawnAgent } from './agents.js';
import { updateViewportBg, renderBgThumbnails } from './background.js';
import { openSettings, closeSettings, buildVRMARows, saveMappingToExtension } from './settings.js';
import { startSim, stopSim } from './sim.js';

export { showSpeech, showEmote, renderAgentTabs, setActiveAgent, setAgentState, addLog, spawnAgent,
         updateViewportBg, renderBgThumbnails, openSettings, closeSettings, buildVRMARows,
         saveMappingToExtension, startSim, stopSim };

export function init() {
  // VRM file loading
  document.getElementById('load-btn').addEventListener('click', () =>
    document.getElementById('file-input').click());

  document.getElementById('file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    loadVRM(URL.createObjectURL(file));
  });

  // Drag-and-drop
  document.getElementById('viewport').addEventListener('dragover', e => e.preventDefault());
  document.getElementById('viewport').addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.vrm')) loadVRM(URL.createObjectURL(file));
  });

  // Add agent
  document.getElementById('add-agent-btn').addEventListener('click', () => {
    if (state.agents.length >= 8) return;
    spawnAgent();
  });

  // Manual state buttons
  ['idle','typing','reading','running','waiting','error','done','alert'].forEach(s => {
    document.getElementById(`btn-${s}`)?.addEventListener('click', () => {
      if (!state.activeAgentId) return;
      const evt = MOCK_EVENTS.find(e => e.state === s);
      setAgentState(state.activeAgentId, s, evt?.msg);
      document.querySelectorAll('.st-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(`btn-${s}`).classList.add('active');
    });
  });

  // Settings drawer
  document.getElementById('btn-settings')?.addEventListener('click', openSettings);
  document.getElementById('settings-backdrop')?.addEventListener('click', closeSettings);

  // Personality selector
  document.querySelectorAll('.p-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.personality = btn.dataset.personality;
      document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.anibuddy?.saveConfig({ personality: btn.dataset.personality });
    });
  });

  // Chat popover
  let chatOpen = false;
  const chatPopover = document.getElementById('chat-popover');
  function toggleChat() {
    chatOpen = !chatOpen;
    chatPopover?.classList.toggle('show', chatOpen);
    if (chatOpen) document.getElementById('chat-input')?.focus();
  }
  function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input?.value.trim();
    if (!msg) return;
    addChatMsg('user', msg);
    input.value = '';
    setTimeout(() => addChatMsg('pet', '...'), 600);
  }
  function addChatMsg(role, text) {
    const hist = document.getElementById('chat-history');
    if (!hist) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
  }
  document.getElementById('btn-chat')?.addEventListener('click', toggleChat);
  document.getElementById('chat-close')?.addEventListener('click', toggleChat);
  document.getElementById('chat-send')?.addEventListener('click', sendChat);
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });

  // Theme dots
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const theme = dot.dataset.theme;
      document.body.dataset.theme = theme;
      document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      if (window.anibuddy?.isElectron) window.anibuddy.saveConfig({ theme });
    });
  });

  // Background images
  document.getElementById('btn-bg-add').addEventListener('click', () =>
    document.getElementById('bg-input').click());

  document.getElementById('bg-input').addEventListener('change', e => {
    const agent = state.agents.find(a => a.id === state.activeAgentId);
    if (!agent) return;
    Array.from(e.target.files).forEach(file => {
      if (agent.backgrounds.length >= 8) return;
      agent.backgrounds.push(URL.createObjectURL(file));
    });
    agent.bgIndex = agent.backgrounds.length - 1;
    updateViewportBg(agent);
    e.target.value = '';
  });

  document.getElementById('btn-bg-prev').addEventListener('click', () => {
    const agent = state.agents.find(a => a.id === state.activeAgentId);
    if (!agent?.backgrounds?.length) return;
    agent.bgIndex = (agent.bgIndex - 1 + agent.backgrounds.length) % agent.backgrounds.length;
    updateViewportBg(agent);
  });

  document.getElementById('btn-bg-next').addEventListener('click', () => {
    const agent = state.agents.find(a => a.id === state.activeAgentId);
    if (!agent?.backgrounds?.length) return;
    agent.bgIndex = (agent.bgIndex + 1) % agent.backgrounds.length;
    updateViewportBg(agent);
  });

  document.getElementById('btn-bg-clear').addEventListener('click', () => {
    const agent = state.agents.find(a => a.id === state.activeAgentId);
    if (!agent) return;
    agent.backgrounds.forEach(url => URL.revokeObjectURL(url));
    agent.backgrounds = []; agent.bgIndex = 0;
    updateViewportBg(agent);
  });

  // VRMA upload
  document.getElementById('vrma-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file || !state.pendingVRMAUploadState) return;
    const url = URL.createObjectURL(file);
    const s = state.pendingVRMAUploadState;
    state.pendingVRMAUploadState = null;
    vrmaMap[s] = { name: null, url: null, loop: LOOP_STATES.has(s), isCustom: true, customName: file.name };
    loadVRMAFromUrl(url, s);
    buildVRMARows();
    e.target.value = '';
  });

  // Sim toggle
  const simToggle = document.getElementById('sim-toggle');
  if (simToggle) {
    simToggle.addEventListener('click', () => {
      state.simActive = !state.simActive;
      document.getElementById('toggle-track').classList.toggle('on', state.simActive);
      if (state.simActive) startSim(); else stopSim();
    });
  }
}
