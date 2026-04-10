#!/usr/bin/env node
/**
 * Database initialisation script — creates all tables.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 *
 * Usage:
 *   npm run db:init
 *
 * Reads DATABASE_URL from .env.local, or from the current shell environment.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { Pool } = require('pg');

// ── Load .env.local manually (no dotenv dep needed) ───────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const CONNECTION = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!CONNECTION) {
  console.error('\nERROR: DATABASE_URL is not set.');
  console.error('Create a .env.local file with:\n  DATABASE_URL=<your-postgres-url>\n');
  process.exit(1);
}

const isLocal =
  CONNECTION.includes('localhost') || CONNECTION.includes('127.0.0.1');

const pool = new Pool({
  connectionString: CONNECTION,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// ── Schema ─────────────────────────────────────────────────────────────────
const SCHEMA = `
-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id             SERIAL       PRIMARY KEY,
  title          TEXT         NOT NULL,
  research_topic TEXT         NOT NULL DEFAULT '',
  authors        TEXT         NOT NULL DEFAULT '',
  institution    TEXT         NOT NULL DEFAULT '',
  keywords       TEXT         NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Methods (reusable protocol templates)
CREATE TABLE IF NOT EXISTS methods (
  id         SERIAL       PRIMARY KEY,
  project_id INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT         NOT NULL,
  objective  TEXT         NOT NULL DEFAULT '',
  materials  TEXT         NOT NULL DEFAULT '',
  procedure  TEXT         NOT NULL DEFAULT '',
  version    INTEGER      NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id            SERIAL       PRIMARY KEY,
  project_id    INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  method_id     INTEGER               REFERENCES methods(id) ON DELETE SET NULL,
  name          TEXT         NOT NULL,
  conditions    TEXT         NOT NULL DEFAULT '',
  status        TEXT         NOT NULL DEFAULT 'included'
                             CHECK (status IN ('included', 'excluded', 'supplementary')),
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Results (one per experiment)
CREATE TABLE IF NOT EXISTS results (
  id            SERIAL       PRIMARY KEY,
  experiment_id INTEGER      NOT NULL UNIQUE REFERENCES experiments(id) ON DELETE CASCADE,
  raw_text      TEXT         NOT NULL DEFAULT '',
  formal_text   TEXT         NOT NULL DEFAULT '',
  figure_legend TEXT         NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Manuscript drafts (one per project)
CREATE TABLE IF NOT EXISTS drafts (
  id                          SERIAL       PRIMARY KEY,
  project_id                  INTEGER      NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  manuscript                  JSONB        NOT NULL DEFAULT '{}',
  timestamps                  JSONB        NOT NULL DEFAULT '{}',
  generated_at                TIMESTAMPTZ,
  project_updated_at_snapshot TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

async function main() {
  console.log('Connecting to database…');
  const client = await pool.connect();
  try {
    console.log('Running schema…');
    await client.query(SCHEMA);
    console.log('✓ Schema applied. All tables are ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Schema init failed:', err.message);
  process.exit(1);
});
