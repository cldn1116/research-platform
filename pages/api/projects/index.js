import { db } from '../../../lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const projects     = db.projects.all().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const allExps      = db.experiments.all();

    const enriched = projects.map(p => {
      const exps = allExps.filter(e => e.project_id === p.id);
      return {
        ...p,
        experiment_count: exps.length,
        included_count:   exps.filter(e => e.status === 'included').length,
      };
    });
    return res.status(200).json(enriched);
  }

  if (req.method === 'POST') {
    const { title, research_topic, authors, institution, keywords } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const project = db.projects.create({
      title: title.trim(),
      research_topic: research_topic || '',
      authors:        authors        || '',
      institution:    institution    || '',
      keywords:       keywords       || '',
    });
    return res.status(201).json(project);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
