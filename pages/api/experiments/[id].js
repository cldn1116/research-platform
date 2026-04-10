import { db } from '../../../lib/db';

function enrichExp(exp) {
  const method = exp.method_id ? db.methods.find(exp.method_id) : null;
  return { ...exp, method_name: method ? method.name : null };
}

export default function handler(req, res) {
  const { id } = req.query;
  const exp = db.experiments.find(id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });

  if (req.method === 'GET') return res.status(200).json(enrichExp(exp));

  if (req.method === 'PUT') {
    const { name, method_id, conditions, status, display_order } = req.body;

    const validStatuses = ['included', 'excluded', 'supplementary'];
    const newStatus = status !== undefined ? status : exp.status;
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updated = db.experiments.update(id, {
      name:          name          ?? exp.name,
      method_id:     method_id !== undefined ? (method_id ? Number(method_id) : null) : exp.method_id,
      conditions:    conditions    ?? exp.conditions,
      status:        newStatus,
      display_order: display_order ?? exp.display_order,
    });

    // Touch project
    db.projects.update(exp.project_id, {});

    return res.status(200).json(enrichExp(updated));
  }

  if (req.method === 'DELETE') {
    db.results.deleteWhere(r => r.experiment_id === Number(id));
    db.experiments.delete(id);
    db.projects.update(exp.project_id, {});
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
