/**
 * Manuscript draft API
 *
 * GET  /api/manuscript/[projectId]
 *   Returns the stored draft for a project, or null if none exists.
 *   Never re-generates — only reads what was last saved.
 *
 * POST /api/manuscript/[projectId]
 *   Body: { section: 'full' | 'materialsAndMethods' | 'results' | 'discussion' }
 *   Generates the requested section(s), merges into the stored draft, saves, returns.
 */
import { db } from '../../../lib/db';
import { generateManuscript } from '../../../lib/manuscriptGenerator';

// Sections controlled by each button
const SECTION_KEYS = {
  materialsAndMethods: ['materialsAndMethods'],
  results:             ['results', 'abstract'],
  discussion:          ['discussion', 'conclusion'],
  full:                ['meta', 'abstract', 'introduction', 'materialsAndMethods',
                        'results', 'discussion', 'conclusion', 'supplementary',
                        'references', 'stats'],
};

export default function handler(req, res) {
  const { projectId } = req.query;
  const id = Number(projectId);

  const project = db.projects.find(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // ── GET — return stored draft ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const draft = db.drafts.where(d => d.project_id === id)[0] || null;
    if (!draft) return res.status(200).json(null);

    return res.status(200).json({
      manuscript:   draft.manuscript,
      generated_at: draft.generated_at,
      timestamps:   draft.timestamps,
    });
  }

  // ── POST — generate section(s) and save ───────────────────────────────────
  if (req.method === 'POST') {
    const { section = 'full' } = req.body || {};

    if (!SECTION_KEYS[section]) {
      return res.status(400).json({ error: `Unknown section "${section}". Valid: ${Object.keys(SECTION_KEYS).join(', ')}` });
    }

    // Gather data
    const methods     = db.methods.where(m => m.project_id === id);
    const experiments = db.experiments.where(e => e.project_id === id);
    const expIds      = new Set(experiments.map(e => e.id));
    const results     = db.results.where(r => expIds.has(r.experiment_id));

    // Generate fresh manuscript object (pure JS, fast)
    const fresh = generateManuscript(project, methods, experiments, results);

    // Load existing draft (or start from scratch)
    const existing = db.drafts.where(d => d.project_id === id)[0];
    const prevManuscript  = existing ? existing.manuscript  : {};
    const prevTimestamps  = existing ? existing.timestamps  : {};

    // Merge: copy only the keys requested by this section button
    const keysToUpdate = SECTION_KEYS[section];
    const mergedManuscript = { ...prevManuscript };
    keysToUpdate.forEach(key => { mergedManuscript[key] = fresh[key]; });

    // Always keep meta and stats current
    mergedManuscript.meta  = fresh.meta;
    mergedManuscript.stats = fresh.stats;

    const nowStr = new Date().toISOString();
    const mergedTimestamps = { ...prevTimestamps };
    keysToUpdate.forEach(key => { mergedTimestamps[key] = nowStr; });

    // Upsert draft
    let saved;
    if (existing) {
      saved = db.drafts.update(existing.id, {
        manuscript:   mergedManuscript,
        timestamps:   mergedTimestamps,
        generated_at: section === 'full' ? nowStr : (existing.generated_at || nowStr),
        // Track the project's update timestamp at generation time for staleness detection
        project_updated_at_snapshot: project.updated_at,
      });
    } else {
      saved = db.drafts.create({
        project_id:                  id,
        manuscript:                  mergedManuscript,
        timestamps:                  mergedTimestamps,
        generated_at:                section === 'full' ? nowStr : null,
        project_updated_at_snapshot: project.updated_at,
      });
    }

    return res.status(200).json({
      manuscript:                  saved.manuscript,
      generated_at:                saved.generated_at,
      timestamps:                  saved.timestamps,
      project_updated_at_snapshot: saved.project_updated_at_snapshot,
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
