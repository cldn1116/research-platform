import { db } from '../../../lib/db';

export default function handler(req, res) {
  const { id } = req.query;
  const project = db.projects.find(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.method === 'GET') {
    return res.status(200).json(project);
  }

  if (req.method === 'PUT') {
    const { title, research_topic, authors, institution, keywords } = req.body;
    const updated = db.projects.update(id, {
      title:          title          ?? project.title,
      research_topic: research_topic ?? project.research_topic,
      authors:        authors        ?? project.authors,
      institution:    institution    ?? project.institution,
      keywords:       keywords       ?? project.keywords,
    });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    // Cascade delete: experiments → results → methods
    const experiments = db.experiments.where(e => e.project_id === Number(id));
    experiments.forEach(exp => db.results.deleteWhere(r => r.experiment_id === exp.id));
    db.experiments.deleteWhere(e => e.project_id === Number(id));
    db.methods.deleteWhere(m => m.project_id === Number(id));
    db.projects.delete(id);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
