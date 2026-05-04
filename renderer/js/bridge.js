import { state, vrmaMap, LOOP_STATES, createAgent, STATES } from './state.js';
import { loadVRM, loadVRMAFromUrl } from './scene.js';
import { setAgentState, setActiveAgent, renderAgentTabs, buildVRMARows, updateViewportBg, showSpeech } from './ui.js';

// ── Session dots ──────────────────────────────────────────────────────────────
// Colors: GREEN = active session (permanent), RED = idle default, BLUE = notification (30s → red)
const sessionDots = new Map(); // sessionId → { dot, projectName, state, idleTimer }
let primarySessionId = null;

function upsertSessionDot(sessionId, projectName, sessionState, active) {
  const sidebar = document.getElementById('session-sidebar');
  if (!sidebar) return;

  let entry = sessionDots.get(sessionId);
  if (!entry) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    dot.addEventListener('click', () => {
      const e = sessionDots.get(sessionId);
      if (!e) return;
      const cfg = STATES[e.state] || {};
      const label = cfg.label || e.state;
      showSpeech(`<span><strong>${e.projectName}</strong> — ${label}</span>`, 4000);

      // Switch primary: demote old green → red, promote this → green
      if (primarySessionId !== sessionId) {
        const prevEntry = sessionDots.get(primarySessionId);
        if (prevEntry) {
          clearTimeout(prevEntry.idleTimer);
          prevEntry.dot.className = 'session-dot';
        }
        primarySessionId = sessionId;
        clearTimeout(e.idleTimer);
        e.dot.className = 'session-dot active';
      }

      const activeId = state.activeAgentId || state.agents[0]?.id;
      if (activeId) setAgentState(activeId, e.state);
    });
    sidebar.appendChild(dot);
    entry = { dot, projectName, state: sessionState, idleTimer: null };
    sessionDots.set(sessionId, entry);
  }

  entry.state = sessionState;
  entry.projectName = projectName;
  const { dot } = entry;
  dot.title = `${projectName}: ${sessionState}`;

  if (sessionState === 'error') {
    if (primarySessionId === sessionId) primarySessionId = null;
    clearTimeout(entry.idleTimer);
    dot.className = 'session-dot error';
    return;
  }

  if (!active) {
    // Session went idle — green stays green, others stay as-is
    return;
  }

  // active: true — real work happening
  if (primarySessionId === null) {
    // No primary yet → become green
    primarySessionId = sessionId;
    clearTimeout(entry.idleTimer);
    dot.className = 'session-dot active';
  } else if (primarySessionId === sessionId) {
    // Already primary → keep green (no change)
    dot.className = 'session-dot active';
  } else {
    // Non-primary got activity → blue notification, 30s → red
    clearTimeout(entry.idleTimer);
    dot.className = 'session-dot notify';
    entry.idleTimer = setTimeout(() => {
      dot.className = 'session-dot';
    }, 30_000);
  }
}

function removeSessionDot(sessionId) {
  const entry = sessionDots.get(sessionId);
  if (entry) {
    clearTimeout(entry.idleTimer);
    entry.dot.remove();
    sessionDots.delete(sessionId);
    if (primarySessionId === sessionId) primarySessionId = null;
  }
}

// ── Electron helpers ──────────────────────────────────────────────────────────
async function loadVRMFromPath(filePath) {
  try {
    const buf = await window.anibuddy.readVRM(filePath);
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    loadVRM(URL.createObjectURL(blob));
    window.anibuddy.saveConfig({ vrmPath: filePath });
  } catch(e) {
    console.warn('VRM load failed:', e);
  }
}

async function initElectron() {
  const ab = window.anibuddy;
  if (!ab?.isElectron) return;

  // Native file picker — intercept before ui.js's bubble listener
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      const filePath = await ab.pickVRM();
      if (filePath) await loadVRMFromPath(filePath);
    }, true);
  }

  // Settings button → open popup window instead of sidebar drawer
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      ab.openSettings();
    }, true);
  }

  // Save config path when user drops a file
  const viewport = document.getElementById('viewport');
  if (viewport) {
    viewport.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file?.path && file.name.endsWith('.vrm')) {
        ab.saveConfig({ vrmPath: file.path });
      }
    });
  }

  // Auto-load last used model + restore saved theme + personality
  const cfg = await ab.getConfig();
  if (cfg?.vrmPath) await loadVRMFromPath(cfg.vrmPath);
  if (cfg?.theme) {
    document.body.dataset.theme = cfg.theme;
    document.querySelectorAll('.theme-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.theme === cfg.theme);
    });
  }
  if (cfg?.personality) {
    state.personality = cfg.personality;
    document.querySelectorAll('.p-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.personality === cfg.personality);
    });
  }

  // Per-session dots from transcript watcher
  ab.onSessionUpdate?.(({ sessionId, projectName, state: sessionState, active }) => {
    upsertSessionDot(sessionId, projectName, sessionState, active);
    // Only drive the agent/bubble from the primary (green) session
    if (active && sessionId === primarySessionId) {
      const activeId = state.activeAgentId || state.agents[0]?.id;
      if (activeId) setAgentState(activeId, sessionState);
    }
  });

  ab.onSessionEnd?.(({ sessionId }) => {
    removeSessionDot(sessionId);
  });

  // Legacy single-state fallback (keeps working if no session data)
  ab.onAgentState(({ state: agentStateName }) => {
    const activeId = state.activeAgentId || state.agents[0]?.id;
    if (activeId) setAgentState(activeId, agentStateName);
  });
}

export function init(vscode) {
  window.addEventListener('message', event => {
    const msg = event.data;
    if (!msg?.type) return;

    if (msg.type === 'agent_update') {
      let agent = state.agents.find(a => a.name === msg.agentName);
      if (!agent) {
        agent = createAgent(msg.agentName);
        state.agents.push(agent);
        if (!state.activeAgentId) setActiveAgent(agent.id);
      }
      setAgentState(agent.id, msg.state, msg.message);
    }

    if (msg.type === 'load_vrm') {
      loadVRM(msg.url);
    }

    if (msg.type === 'vrma_data') {
      if (!vrmaMap[msg.state]) vrmaMap[msg.state] = { name: msg.name, loop: LOOP_STATES.has(msg.state) };
      loadVRMAFromUrl(msg.url, msg.state);
    }

    if (msg.type === 'vrma_mapping_update') {
      msg.entries.forEach(e => {
        vrmaMap[e.state] = { name: e.name, url: null, loop: LOOP_STATES.has(e.state), isCustom: false };
        loadVRMAFromUrl(e.url, e.state);
      });
      buildVRMARows();
    }

    if (msg.type === 'restore_agents') {
      msg.agents.forEach(ca => {
        if (!state.agents.find(a => a.name === ca.name)) {
          state.agents.push(createAgent(ca.name));
        }
      });
      if (!state.activeAgentId && state.agents.length) setActiveAgent(state.agents[0].id);
      else renderAgentTabs();
    }
  });

  window.agentBridge = {
    updateAgent: (agentName, agentState, message) => {
      let agent = state.agents.find(a => a.name === agentName);
      if (!agent) {
        agent = createAgent(agentName);
        state.agents.push(agent);
        if (!state.activeAgentId) setActiveAgent(agent.id);
      }
      setAgentState(agent.id, agentState, message);
    },
    loadVRM: (url) => loadVRM(url),
    spawnAgent: (name) => {
      const agent = createAgent(name || state.agents[state.agents.length - 1]?.name);
      state.agents.push(agent);
      if (!state.activeAgentId) setActiveAgent(agent.id);
      else renderAgentTabs();
    },
    renameActiveAgent: (newName) => {
      const agent = state.agents.find(a => a.id === state.activeAgentId);
      if (!agent) return;
      agent.name = newName;
      renderAgentTabs();
      document.getElementById('hud-name').textContent = newName;
    },
    setBackground: (dataUrl) => {
      const agent = state.agents.find(a => a.id === state.activeAgentId);
      if (!agent) return;
      agent.backgrounds.push(dataUrl);
      agent.bgIndex = agent.backgrounds.length - 1;
      updateViewportBg(agent);
    },
  };

  if (vscode) vscode.postMessage({ type: 'ready' });

  if (window.anibuddy?.onThemeChange) {
    window.anibuddy.onThemeChange(theme => {
      document.body.dataset.theme = theme;
      document.querySelectorAll('.theme-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.theme === theme);
      });
    });
  }

  initElectron();
}