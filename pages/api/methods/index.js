import { db } from '../../../lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const allExps = db.experiments.all();
    const methods = db.methods
      .where(m => m.project_id === Number(projectId))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({
        ...m,
        usage_count: allExps.filter(e => e.method_id === m.id).length,
      }));
    return res.status(200).json(methods);
  }

  if (req.method === 'POST') {
    const { project_id, name, objective, materials, procedure } = req.body;
    if (!project_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }
    const method = db.methods.create({
      project_id: Number(project_id),
      name:       name.trim(),
      objective:  objective || '',
      materials:  materials || '',
      procedure:  procedure || '',
      version:    1,
    });
    return res.status(201).json(method);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
