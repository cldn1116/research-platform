import { query, queryOne } from '../../../lib/db';

/**
 * PUT    /api/groups/[id]  — rename a group (or change color)
 * DELETE /api/groups/[id]  — delete a group (experiments become ungrouped)
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, color } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

    const group = await queryOne(
      `UPDATE experiment_groups
         SET name = $1, color = COALESCE($2, color)
       WHERE id = $3
       RETURNING *`,
      [name.trim(), color || null, id]
    );
    if (!group) return res.status(404).json({ error: 'Group not found' });
    return res.status(200).json(group);
  }

  if (req.method === 'DELETE') {
    await query('UPDATE experiments SET group_id = NULL WHERE group_id = $1', [id]);
    await query('DELETE FROM experiment_groups WHERE id = $1', [id]);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
