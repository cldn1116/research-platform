/**
 * Zero-dependency JSON file database.
 * Each table is a flat JSON array stored in .data/<table>.json.
 * Synchronous reads and atomic writes — perfectly adequate for a single-user MVP.
 */
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), '.data');

// ── File helpers ───────────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(table) {
  return path.join(DATA_DIR, `${table}.json`);
}

function readTable(table) {
  ensureDir();
  const fp = filePath(table);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return [];
  }
}

function writeTable(table, records) {
  ensureDir();
  fs.writeFileSync(filePath(table), JSON.stringify(records, null, 2), 'utf8');
}

function nextId(records) {
  if (records.length === 0) return 1;
  return Math.max(...records.map(r => r.id)) + 1;
}

function now() {
  return new Date().toISOString();
}

// ── Generic CRUD factory ───────────────────────────────────────────────────

function makeTable(name) {
  return {
    all()         { return readTable(name); },
    find(id)      { return readTable(name).find(r => r.id === Number(id)) || null; },
    where(predFn) { return readTable(name).filter(predFn); },

    create(data) {
      const rows = readTable(name);
      const record = { id: nextId(rows), ...data, created_at: now(), updated_at: now() };
      writeTable(name, [...rows, record]);
      return record;
    },

    update(id, data) {
      const rows = readTable(name);
      const idx  = rows.findIndex(r => r.id === Number(id));
      if (idx === -1) return null;
      const updated = { ...rows[idx], ...data, updated_at: now() };
      rows[idx] = updated;
      writeTable(name, rows);
      return updated;
    },

    delete(id) {
      const rows = readTable(name);
      writeTable(name, rows.filter(r => r.id !== Number(id)));
    },

    deleteWhere(predFn) {
      const rows = readTable(name);
      writeTable(name, rows.filter(r => !predFn(r)));
    },
  };
}

// ── Exported table handles ─────────────────────────────────────────────────

const db = {
  projects:    makeTable('projects'),
  methods:     makeTable('methods'),
  experiments: makeTable('experiments'),
  results:     makeTable('results'),
  drafts:      makeTable('drafts'),   // one draft record per project
};

module.exports = { db };
