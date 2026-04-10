import { db } from '../../../lib/db';
import { formalizeWithContext } from '../../../lib/textFormalizer';

export default function handler(req, res) {
  const { experimentId } = req.query;

  if (req.method === 'GET') {
    const result = db.results.where(r => r.experiment_id === Number(experimentId))[0];
    if (!result) return res.status(404).json({ error: 'No result found for this experiment' });
    return res.status(200).json(result);
  }

  if (req.method === 'PUT') {
    const { raw_text, formal_text, figure_legend } = req.body;

    const exp = db.experiments.find(experimentId);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });

    const method = exp.method_id ? db.methods.find(exp.method_id) : null;

    const computedFormal = (formal_text && formal_text.trim())
      ? formal_text.trim()
      : formalizeWithContext(raw_text || '', exp.name, method ? method.name : null);

    const existing = db.results.where(r => r.experiment_id === Number(experimentId))[0];
    let result;
    if (existing) {
      result = db.results.update(existing.id, {
        raw_text:      raw_text      || '',
        formal_text:   computedFormal,
        figure_legend: figure_legend || '',
      });
    } else {
      result = db.results.create({
        experiment_id: Number(experimentId),
        raw_text:      raw_text      || '',
        formal_text:   computedFormal,
        figure_legend: figure_legend || '',
      });
    }

    db.experiments.update(experimentId, {});
    db.projects.update(exp.project_id, {});

    return res.status(200).json(result);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
