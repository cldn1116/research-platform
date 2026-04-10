import { query, queryOne } from '../../../../lib/db';

/**
 * GET  /api/projects/[id]/groups  — list all groups for a project
 * POST /api/projects/[id]/groups  — create a new group
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const groups = await query(
      'SELECT * FROM experiment_groups WHERE project_id = $1 ORDER BY display_order ASC, created_at ASC',
      [id]
    );
    return res.status(200).json(groups);
  }

  if (req.method === 'POST') {
    const { name, color = 'blue' } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

    const maxOrder = await queryOne(
      'SELECT COALESCE(MAX(display_order), 0) AS max FROM experiment_groups WHERE project_id = $1',
      [id]
    );

    const group = await queryOne(
      'INSERT INTO experiment_groups (project_id, name, color, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name.trim(), color, (maxOrder?.max ?? 0) + 1]
    );
    return res.status(201).json(group);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
