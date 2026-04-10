/**
 * Manuscript draft API
 *
 * GET  /api/manuscript/[projectId]
 *   Returns the stored draft (or null). Never re-generates.
 *
 * POST /api/manuscript/[projectId]
 *   Body: { section: 'full' | 'materialsAndMethods' | 'results' | 'discussion' }
 *   Generates the requested sections, merges into the stored draft, saves, returns.
 */
import { query, queryOne } from '../../../lib/db';
import { generateManuscript } from '../../../lib/manuscriptGenerator';

const SECTION_KEYS = {
  materialsAndMethods: ['materialsAndMethods'],
  results:             ['results', 'abstract'],
  discussion:          ['discussion', 'conclusion'],
  full:                ['meta', 'abstract', 'introduction', 'materialsAndMethods',
                        'results', 'discussion', 'conclusion', 'supplementary',
                        'references', 'stats'],
};

export default async function handler(req, res) {
  const { projectId } = req.query;

  const project = await queryOne('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // ── GET — return stored draft ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const draft = await queryOne('SELECT * FROM drafts WHERE project_id = $1', [projectId]);
    if (!draft) return res.status(200).json(null);

    return res.status(200).json({
      manuscript:                  draft.manuscript,
      generated_at:                draft.generated_at,
      timestamps:                  draft.timestamps,
      project_updated_at_snapshot: draft.project_updated_at_snapshot,
    });
  }

  // ── POST — generate section(s) and upsert draft ───────────────────────────
  if (req.method === 'POST') {
    const { section = 'full' } = req.body || {};

    if (!SECTION_KEYS[section]) {
      return res.status(400).json({
        error: `Unknown section "${section}". Valid: ${Object.keys(SECTION_KEYS).join(', ')}`,
      });
    }

    // Gather latest data from DB
    const methods     = await query('SELECT * FROM methods WHERE project_id = $1', [projectId]);
    const experiments = await query(
      'SELECT * FROM experiments WHERE project_id = $1 ORDER BY display_order ASC, created_at ASC',
      [projectId]
    );
    const expIds = experiments.map(e => e.id);
    const results = expIds.length
      ? await query('SELECT * FROM results WHERE experiment_id = ANY($1)', [expIds])
      : [];

    // Generate fresh manuscript object (pure JS, no network, fast)
    const fresh = generateManuscript(project, methods, experiments, results);

    // Load existing draft to merge into
    const existing      = await queryOne('SELECT * FROM drafts WHERE project_id = $1', [projectId]);
    const prevManuscript = existing?.manuscript  ?? {};
    const prevTimestamps = existing?.timestamps  ?? {};

    // Merge: only update the keys this button controls
    const keysToUpdate     = SECTION_KEYS[section];
    const mergedManuscript = { ...prevManuscript };
    keysToUpdate.forEach(key => { mergedManuscript[key] = fresh[key]; });
    // Always sync meta + stats from live data
    mergedManuscript.meta  = fresh.meta;
    mergedManuscript.stats = fresh.stats;

    const nowStr          = new Date().toISOString();
    const mergedTimestamps = { ...prevTimestamps };
    keysToUpdate.forEach(key => { mergedTimestamps[key] = nowStr; });

    const generatedAt = section === 'full'
      ? nowStr
      : (existing?.generated_at ?? null);

    const saved = await queryOne(
      `INSERT INTO drafts (project_id, manuscript, timestamps, generated_at, project_updated_at_snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id) DO UPDATE SET
         manuscript                  = EXCLUDED.manuscript,
         timestamps                  = EXCLUDED.timestamps,
         generated_at                = EXCLUDED.generated_at,
         project_updated_at_snapshot = EXCLUDED.project_updated_at_snapshot,
         updated_at                  = NOW()
       RETURNING *`,
      [
        projectId,
        JSON.stringify(mergedManuscript),
        JSON.stringify(mergedTimestamps),
        generatedAt,
        project.updated_at,
      ]
    );

    return res.status(200).json({
      manuscript:                  saved.manuscript,
      generated_at:                saved.generated_at,
      timestamps:                  saved.timestamps,
      project_updated_at_snapshot: saved.project_updated_at_snapshot,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
