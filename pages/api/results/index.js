import { db } from '../../../lib/db';
import { formalizeWithContext } from '../../../lib/textFormalizer';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { experiment_id, raw_text, formal_text, figure_legend } = req.body;
  if (!experiment_id) return res.status(400).json({ error: 'experiment_id required' });

  const exp = db.experiments.find(experiment_id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });

  const method = exp.method_id ? db.methods.find(exp.method_id) : null;

  const computedFormal = (formal_text && formal_text.trim())
    ? formal_text.trim()
    : formalizeWithContext(raw_text || '', exp.name, method ? method.name : null);

  // Upsert
  const existing = db.results.where(r => r.experiment_id === Number(experiment_id))[0];

  let result;
  if (existing) {
    result = db.results.update(existing.id, {
      raw_text:      raw_text      || '',
      formal_text:   computedFormal,
      figure_legend: figure_legend || '',
    });
  } else {
    result = db.results.create({
      experiment_id: Number(experiment_id),
      raw_text:      raw_text      || '',
      formal_text:   computedFormal,
      figure_legend: figure_legend || '',
    });
  }

  db.experiments.update(experiment_id, {});
  db.projects.update(exp.project_id, {});

  return res.status(200).json(result);
}
