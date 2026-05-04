import { state, vrmaMap, STATES, AGENT_NAMES, MOCK_EVENTS, PERSONALITIES, createAgent } from '../state.js';
import { playVRMA, stopVRMA, startIdleRotator, stopIdleRotator } from '../scene.js';
import { showSpeech, showEmote } from './speech.js';
import { updateViewportBg } from './background.js';

const STATE_EMOTES = {
  idle:    '20-sleepy.svg',
  typing:  '10-happy-dot.svg',
  reading: '22-big-eyes.svg',
  running: '14-star-eyes.svg',
  waiting: '18-pressure.svg',
  error:   '03-x-eyes.svg',
  done:    '04-kissy.svg',
  alert:   '02-surprised-box.svg',
};

function driveAnimation(stateName) {
  state.poseAnimator?.setState(stateName);
  if (stateName === 'idle') {
    startIdleRotator();
  } else {
    stopIdleRotator();
    if (vrmaMap[stateName]) playVRMA(stateName);
    else stopVRMA();
  }
}

export function renderAgentTabs() {
  const strip = document.getElementById('agents');
  strip.querySelectorAll('.agent-tab').forEach(el => el.remove());
  const addBtn = document.getElementById('add-agent-btn');

  state.agents.forEach(agent => {
    const cfg = STATES[agent.state];
    const tab = document.createElement('div');
    tab.className = 'agent-tab' + (agent.id === state.activeAgentId ? ' active' : '');
    tab.dataset.id = agent.id;
    tab.innerHTML = `
      <div class="dot" style="background:${cfg.color};box-shadow:0 0 6px ${cfg.color}"></div>
      <span style="font-size:18px">${cfg.emoji}</span>
      <span class="name">${agent.name}</span>
      <span class="state-badge">${cfg.label}</span>
    `;
    tab.addEventListener('click', () => setActiveAgent(agent.id));
    strip.insertBefore(tab, addBtn);
  });

  const countEl = document.getElementById('agent-count');
  if (countEl) countEl.textContent = `${state.agents.length} AGENT${state.agents.length !== 1 ? 'S' : ''}`;
}

export function setActiveAgent(id) {
  state.activeAgentId = id;
  const agent = state.agents.find(a => a.id === id);
  if (!agent) return;
  const cfg = STATES[agent.state];
  state.currentState = agent.state;

  document.getElementById('hud-name').textContent = agent.name;
  document.getElementById('hud-state').textContent = `${cfg.emoji} ${cfg.label}`;
  document.getElementById('hud-state').style.color = cfg.color;
  document.getElementById('hud-state').style.borderColor = cfg.color + '55';

  driveAnimation(agent.state);
  updateViewportBg(agent);
  renderAgentTabs();
}

export function setAgentState(id, agentState, msg) {
  const agent = state.agents.find(a => a.id === id);
  if (!agent) return;
  const cfg = STATES[agentState];
  agent.state = agentState;
  agent.lastMsg = msg || cfg.label;

  if (id === state.activeAgentId) {
    state.currentState = agentState;
    document.getElementById('hud-state').textContent = `${cfg.emoji} ${cfg.label}`;
    document.getElementById('hud-state').style.color = cfg.color;
    document.getElementById('hud-state').style.borderColor = cfg.color + '55';
    const phrase = PERSONALITIES[state.personality]?.phrases[agentState] ?? agent.lastMsg;
    const emoteSvg = STATE_EMOTES[agentState];
    const html = emoteSvg
      ? `<img src="./assets/emotes/${emoteSvg}" width="18" height="18" draggable="false" style="flex-shrink:0;vertical-align:middle"> <span>${phrase}</span>`
      : `<span>${cfg.emoji} ${phrase}</span>`;
    showSpeech(html, 5000);
    driveAnimation(agentState);
  }

  addLog(agent.name, agentState, agent.lastMsg, cfg.color);
  renderAgentTabs();
}

export function addLog(agentName, agentState, msg, color) {
  const entries = document.getElementById('log-entries');
  if (!entries) return;
  const t = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const row = document.createElement('div');
  row.className = 'log-entry fresh';
  row.innerHTML = `
    <span class="log-time">${t}</span>
    <span class="log-agent">[${agentName}]</span>
    <span style="flex-shrink:0">${STATES[agentState]?.emoji}</span>
    <span class="log-msg">${msg}</span>
  `;
  entries.insertBefore(row, entries.firstChild);
  setTimeout(() => row.classList.remove('fresh'), 600);
  while (entries.children.length > 50) entries.removeChild(entries.lastChild);
}

export function spawnAgent() {
  const name = AGENT_NAMES[state.agents.length % AGENT_NAMES.length];
  const agent = createAgent(name);
  state.agents.push(agent);
  if (!state.activeAgentId) setActiveAgent(agent.id);
  else renderAgentTabs();
  addLog(name, 'idle', 'Agent spawned', STATES.idle.color);
}
