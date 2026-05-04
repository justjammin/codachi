import { state, MOCK_EVENTS } from '../state.js';
import { setAgentState } from './agents.js';

export function startSim() {
  stopSim();
  state.simInterval = setInterval(() => {
    if (!state.agents.length) return;
    const agent = state.agents[Math.floor(Math.random() * state.agents.length)];
    const evt   = MOCK_EVENTS[Math.floor(Math.random() * MOCK_EVENTS.length)];
    setAgentState(agent.id, evt.state, evt.msg);
  }, 2500);
}

export function stopSim() {
  clearInterval(state.simInterval);
  state.simInterval = null;
}
