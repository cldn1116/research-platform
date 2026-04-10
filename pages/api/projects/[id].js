import { query, queryOne } from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  const project = await queryOne('SELECT * FROM projects WHERE id = $1', [id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.method === 'GET') {
    return res.status(200).json(project);
  }

  if (req.method === 'PUT') {
    const { title, research_topic, authors, institution, keywords } = req.body;
    // COALESCE keeps existing value when the client sends null/undefined for a field
    const updated = await queryOne(
      `UPDATE projects SET
         title          = COALESCE($1, title),
         research_topic = COALESCE($2, research_topic),
         authors        = COALESCE($3, authors),
         institution    = COALESCE($4, institution),
         keywords       = COALESCE($5, keywords),
         updated_at     = NOW()
       WHERE id = $6 RETURNING *`,
      [
        title          ?? null,
        research_topic ?? null,
        authors        ?? null,
        institution    ?? null,
        keywords       ?? null,
        id,
      ]
    );
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    // ON DELETE CASCADE propagates to methods, experiments, results, drafts
    await query('DELETE FROM projects WHERE id = $1', [id]);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
