import { STATE_META } from './VRMPoseAnimator.js';

export const STATES = STATE_META;

export const AGENT_NAMES = ['Aiko','Riku','Sora','Hana','Kaito','Yuki','Ren','Mio'];

export const BUILTIN_VRMAS = [
  'greeting','model_pose','peace_sign','shoot','show_full_body','spin','squat',
  'Bling-Bang-Bang-Born','dancedance','happysynth','notadevil','catchit',
];

export const LOOP_STATES = new Set(['idle','typing','reading','running','waiting','error']);

export const MOCK_EVENTS = [
  { state:'typing',  msg:'Writing src/api/routes.py' },
  { state:'reading', msg:'Reading package.json' },
  { state:'running', msg:'npm run build' },
  { state:'reading', msg:'Searching docs...' },
  { state:'waiting', msg:'Awaiting user input...' },
  { state:'typing',  msg:'Writing tests/test_api.py' },
  { state:'done',    msg:'Task complete ✓' },
  { state:'error',   msg:'Exit code 1 — retrying' },
  { state:'typing',  msg:'Patching auth.ts' },
  { state:'idle',    msg:'Waiting for next task...' },
  { state:'alert',   msg:'Needs your attention!' },
];

// Default VRMA mapping — all states covered
export const vrmaMap = {
  idle:    { name: 'model_pose',           url: null, loop: true },
  typing:  { name: 'notadevil',            url: null, loop: true },
  reading: { name: 'happysynth',           url: null, loop: true },
  running: { name: 'spin',                 url: null, loop: true },
  waiting: { name: 'squat',                url: null, loop: true },
  error:   { name: 'greeting',             url: null, loop: true },
  done:    { name: 'peace_sign',           url: null, loop: true },
  alert:   { name: 'Bling-Bang-Bang-Born', url: null, loop: true },
};

export const vrmaCache = {};

// Single mutable state object — all modules mutate this directly
export const state = {
  agents: [],
  activeAgentId: null,
  simActive: false,
  simInterval: null,
  currentState: 'idle',
  currentVRM: null,
  poseAnimator: null,
  vrmaMixer: null,
  vrmaCurrentAction: null,
  vrmaActive: false,
  pendingVRMAUploadState: null,
  personality: 'kawaii',
};

export const PERSONALITIES = {
  kawaii: {
    label: '🌸 Kawaii',
    phrases: {
      idle:    '~(˘▾˘)~ chillin uwu',
      typing:  'tap tap tap~!',
      reading: 'reading desu~',
      running: 'running super fast!',
      waiting: 'waiting patiently...',
      error:   'kyaa! something broke!',
      done:    'yay all done~!',
      alert:   'kyaa!! look here!!',
    },
  },
  tsundere: {
    label: '😏 Tsundere',
    phrases: {
      idle:    '...not that I care',
      typing:  "fine, I'm typing. don't watch",
      reading: "it's not like I enjoy this",
      running: 'doing this for ME, got it',
      waiting: '...not waiting for YOU',
      error:   'this is YOUR fault!',
      done:    "i-it's done. don't thank me",
      alert:   "something's wrong. obviously",
    },
  },
  scholar: {
    label: '🧠 Scholar',
    phrases: {
      idle:    'in contemplation',
      typing:  'composing response...',
      reading: 'analyzing carefully',
      running: 'executing process',
      waiting: 'awaiting data',
      error:   'anomaly detected',
      done:    'hypothesis confirmed',
      alert:   'critical: attention required',
    },
  },
  cozy: {
    label: '🌙 Cozy',
    phrases: {
      idle:    'just vibing... ☕',
      typing:  'tap tap tap...',
      reading: 'soaking it in~',
      running: 'on it, cozy style',
      waiting: 'no rush... 🍵',
      error:   "oh no... let's fix it",
      done:    'done~ rest time 🌙',
      alert:   'hey... heads up',
    },
  },
  hype: {
    label: '⚡ Hype',
    phrases: {
      idle:    'READY TO GO!! 🔥',
      typing:  "FINGERS FLYING LET'S GO",
      reading: 'ABSORBING AT WARP SPEED',
      running: 'YESSS LET\'S RUN IT',
      waiting: 'PUMPED AND WAITING!!',
      error:   'NOOO but we WILL fix this',
      done:    'YESSSS LET\'S GOOO!! 🎉',
      alert:   'HEADS UP!! ATTENTION!!',
    },
  },
};

export function createAgent(name) {
  return {
    id: Date.now() + Math.random(),
    name,
    state: 'idle',
    lastMsg: 'Waiting for task...',
    vrm: null,
    backgrounds: [],
    bgIndex: 0,
  };
}