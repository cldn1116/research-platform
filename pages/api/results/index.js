import { query, queryOne } from '../../../lib/db';
import { formalizeWithContext } from '../../../lib/textFormalizer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { experiment_id, raw_text = '', formal_text = '', figure_legend = '', growth_curve_data } = req.body;
  if (!experiment_id) return res.status(400).json({ error: 'experiment_id required' });

  const exp = await queryOne('SELECT * FROM experiments WHERE id = $1', [experiment_id]);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });

  const method = exp.method_id
    ? await queryOne('SELECT name FROM methods WHERE id = $1', [exp.method_id])
    : null;

  const computedFormal = formal_text?.trim()
    ? formal_text.trim()
    : formalizeWithContext(raw_text, exp.name, method?.name ?? null);

  // Upsert — one result row per experiment (UNIQUE constraint on experiment_id)
  const result = await queryOne(
    `INSERT INTO results (experiment_id, raw_text, formal_text, figure_legend, growth_curve_data)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (experiment_id) DO UPDATE SET
       raw_text          = EXCLUDED.raw_text,
       formal_text       = EXCLUDED.formal_text,
       figure_legend     = EXCLUDED.figure_legend,
       growth_curve_data = COALESCE(EXCLUDED.growth_curve_data, results.growth_curve_data),
       updated_at        = NOW()
     RETURNING *`,
    [experiment_id, raw_text, computedFormal, figure_legend, growth_curve_data ? JSON.stringify(growth_curve_data) : null]
  );

  // Touch experiment and project for staleness detection
  await query('UPDATE experiments SET updated_at = NOW() WHERE id = $1', [experiment_id]);
  await query('UPDATE projects    SET updated_at = NOW() WHERE id = $1', [exp.project_id]);

  return res.status(200).json(result);
}
