import { query, queryOne } from '../../../lib/db';
import { formalizeWithContext } from '../../../lib/textFormalizer';

export default async function handler(req, res) {
  const { experimentId } = req.query;

  if (req.method === 'GET') {
    const result = await queryOne(
      'SELECT * FROM results WHERE experiment_id = $1',
      [experimentId]
    );
    if (!result) return res.status(404).json({ error: 'No result found for this experiment' });
    return res.status(200).json(result);
  }

  if (req.method === 'PUT') {
    const { raw_text = '', formal_text = '', figure_legend = '', growth_curve_data } = req.body;

    const exp = await queryOne('SELECT * FROM experiments WHERE id = $1', [experimentId]);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });

    const method = exp.method_id
      ? await queryOne('SELECT name FROM methods WHERE id = $1', [exp.method_id])
      : null;

    const computedFormal = formal_text?.trim()
      ? formal_text.trim()
      : formalizeWithContext(raw_text, exp.name, method?.name ?? null);

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
      [experimentId, raw_text, computedFormal, figure_legend, growth_curve_data ? JSON.stringify(growth_curve_data) : null]
    );

    await query('UPDATE experiments SET updated_at = NOW() WHERE id = $1', [experimentId]);
    await query('UPDATE projects    SET updated_at = NOW() WHERE id = $1', [exp.project_id]);

    return res.status(200).json(result);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
