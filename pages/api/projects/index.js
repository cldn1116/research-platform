import { query, queryOne } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await query(`
      SELECT p.*,
        COUNT(e.id)::int                                         AS experiment_count,
        COUNT(CASE WHEN e.status = 'included' THEN 1 END)::int  AS included_count
      FROM projects p
      LEFT JOIN experiments e ON e.project_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const {
      title,
      research_topic = '',
      authors        = '',
      institution    = '',
      keywords       = '',
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const project = await queryOne(
      `INSERT INTO projects (title, research_topic, authors, institution, keywords)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title.trim(), research_topic, authors, institution, keywords]
    );
    return res.status(201).json(project);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
