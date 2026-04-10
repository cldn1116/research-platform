import { db } from '../../../lib/db';

function enrichExp(exp) {
  const method = exp.method_id ? db.methods.find(exp.method_id) : null;
  return { ...exp, method_name: method ? method.name : null };
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const exps = db.experiments
      .where(e => e.project_id === Number(projectId))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.created_at.localeCompare(b.created_at))
      .map(enrichExp);
    return res.status(200).json(exps);
  }

  if (req.method === 'POST') {
    const { project_id, method_id, name, conditions, status } = req.body;
    if (!project_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    const existing = db.experiments.where(e => e.project_id === Number(project_id));
    const nextOrder = existing.length > 0
      ? Math.max(...existing.map(e => e.display_order ?? 0)) + 1
      : 0;

    const exp = db.experiments.create({
      project_id:    Number(project_id),
      method_id:     method_id ? Number(method_id) : null,
      name:          name.trim(),
      conditions:    conditions || '',
      status:        ['included', 'excluded', 'supplementary'].includes(status) ? status : 'included',
      display_order: nextOrder,
    });

    // Touch project
    db.projects.update(project_id, {});

    return res.status(201).json(enrichExp(exp));
  }

  res.status(405).json({ error: 'Method not allowed' });
}
