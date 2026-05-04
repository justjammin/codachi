const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { EventEmitter } = require('events');

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');

const TOOL_STATE = {
  write_file:                  'typing',
  str_replace:                 'typing',
  str_replace_based_edit_tool: 'typing',
  create_file:                 'typing',
  multiedit:                   'typing',
  read_file:                   'reading',
  list_files:                  'reading',
  glob:                        'reading',
  grep:                        'reading',
  bash:                        'running',
  execute_bash:                'running',
  computer:                    'running',
  web_search:                  'reading',
  web_fetch:                   'reading',
  WebSearch:                   'reading',
  WebFetch:                    'reading',
};

const IDLE_MS   = 30_000;
const STALE_MS  = 10 * 60 * 1000;

class TranscriptWatcher extends EventEmitter {
  constructor() {
    super();
    // filePath → { watcher, offset, idleTimer, state, lastActive, projectName }
    this._files = new Map();
    this._scanInterval = null;
  }

  start() {
    this._scan();
    this._scanInterval = setInterval(() => this._scan(), 10_000);
  }

  stop() {
    clearInterval(this._scanInterval);
    for (const entry of this._files.values()) {
      if (entry.idleTimer) clearTimeout(entry.idleTimer);
      try { entry.watcher.close(); } catch (_) {}
    }
    this._files.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  _projectName(filePath) {
    const base = path.basename(path.dirname(filePath));
    // ~/.claude/projects/-Users-jammin-Documents-GitHub-tomodachi → "tomodachi"
    return base.replace(/^-+/, '').split('-').pop() || base;
  }

  _scan() {
    if (!fs.existsSync(CLAUDE_DIR)) return;
    const now = Date.now();
    try {
      for (const proj of fs.readdirSync(CLAUDE_DIR)) {
        const dir = path.join(CLAUDE_DIR, proj);
        try {
          if (!fs.statSync(dir).isDirectory()) continue;
          for (const f of fs.readdirSync(dir)) {
            if (!f.endsWith('.jsonl')) continue;
            const fp = path.join(dir, f);
            if (!this._files.has(fp)) this._watch(fp);
          }
        } catch (_) {}
      }
      // Evict sessions inactive > STALE_MS
      for (const [fp, entry] of this._files) {
        if (entry.lastActive > 0 && (now - entry.lastActive) > STALE_MS) {
          if (entry.idleTimer) clearTimeout(entry.idleTimer);
          try { entry.watcher.close(); } catch (_) {}
          this._files.delete(fp);
          this.emit('session-end', { sessionId: fp });
        }
      }
    } catch (_) {}
  }

  _watch(filePath) {
    let offset = 0;
    try { offset = fs.statSync(filePath).size; } catch (_) { return; }
    let watcher;
    try { watcher = fs.watch(filePath, () => this._read(filePath)); } catch (_) { return; }

    this._files.set(filePath, {
      watcher, offset,
      idleTimer: null,
      state: 'idle',
      lastActive: 0,
      projectName: this._projectName(filePath),
    });
  }

  _read(filePath) {
    const entry = this._files.get(filePath);
    if (!entry) return;
    let size;
    try { size = fs.statSync(filePath).size; } catch (_) { return; }
    if (size <= entry.offset) return;

    const len = size - entry.offset;
    const buf = Buffer.alloc(len);
    const fd  = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, len, entry.offset);
    fs.closeSync(fd);
    entry.offset = size;

    for (const line of buf.toString('utf8').split('\n')) {
      const t = line.trim();
      if (t) this._parseLine(t, filePath);
    }
  }

  _parseLine(line, filePath) {
    let entry;
    try { entry = JSON.parse(line); } catch (_) { return; }
    const msg = entry.message;
    if (!msg) return;

    if (msg.role === 'assistant') {
      const content = Array.isArray(msg.content) ? msg.content : [];
      for (const block of content) {
        if (block.type === 'tool_use') {
          this._emitSession(TOOL_STATE[block.name] || 'running', filePath);
          return;
        }
      }
      this._emitSession('done', filePath);
    }

    if (msg.role === 'tool') {
      const content = Array.isArray(msg.content) ? msg.content : [];
      const hasError = content.some(b =>
        b?.is_error === true ||
        (typeof b?.text === 'string' && /\b(error|failed|exception|traceback)\b/i.test(b.text.slice(0, 300)))
      );
      if (hasError) this._emitSession('error', filePath);
    }
  }

  _emitSession(sessionState, filePath) {
    const entry = this._files.get(filePath);
    if (!entry) return;
    entry.state = sessionState;
    entry.lastActive = Date.now();

    this.emit('session-update', {
      sessionId:   filePath,
      projectName: entry.projectName,
      state:       sessionState,
      active:      true,
    });
    this.emit('state', { state: sessionState }); // legacy compat

    this._resetFileIdle(filePath);
  }

  _resetFileIdle(filePath) {
    const entry = this._files.get(filePath);
    if (!entry) return;
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      const e = this._files.get(filePath);
      if (!e) return;
      e.state = 'waiting';
      this.emit('session-update', {
        sessionId:   filePath,
        projectName: e.projectName,
        state:       'waiting',
        active:      false,
      });
      this.emit('state', { state: 'waiting' });
    }, IDLE_MS);
  }
}

module.exports = new TranscriptWatcher();
