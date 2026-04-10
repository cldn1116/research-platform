import { db } from '../../../lib/db';

export default function handler(req, res) {
  const { id } = req.query;
  const method = db.methods.find(id);
  if (!method) return res.status(404).json({ error: 'Method not found' });

  if (req.method === 'GET') return res.status(200).json(method);

  if (req.method === 'PUT') {
    const { name, objective, materials, procedure } = req.body;
    const updated = db.methods.update(id, {
      name:      name      ?? method.name,
      objective: objective ?? method.objective,
      materials: materials ?? method.materials,
      procedure: procedure ?? method.procedure,
      version:   (method.version || 1) + 1,
    });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    // Nullify method_id on experiments that use this method
    db.experiments.where(e => e.method_id === Number(id)).forEach(exp => {
      db.experiments.update(exp.id, { method_id: null });
    });
    db.methods.delete(id);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
