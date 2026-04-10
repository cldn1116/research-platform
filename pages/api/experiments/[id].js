import { query, queryOne } from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  const exp = await queryOne(
    `SELECT e.*, m.name AS method_name, g.name AS group_name
     FROM experiments e
     LEFT JOIN methods m ON m.id = e.method_id
     LEFT JOIN experiment_groups g ON g.id = e.group_id
     WHERE e.id = $1`,
    [id]
  );
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });

  if (req.method === 'GET') return res.status(200).json(exp);

  if (req.method === 'PUT') {
    const { name, method_id, group_id, conditions, status, display_order } = req.body;

    const validStatuses = ['included', 'excluded', 'supplementary'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Resolve method_id / group_id:
    //   undefined → keep existing   (field not sent)
    //   null / '' → set to NULL     (explicitly unlinking)
    //   number    → set to that id
    const newMethodId = method_id !== undefined
      ? (method_id ? Number(method_id) : null)
      : exp.method_id;

    const newGroupId = group_id !== undefined
      ? (group_id ? Number(group_id) : null)
      : exp.group_id;

    const updated = await queryOne(
      `UPDATE experiments SET
         name          = COALESCE($1, name),
         method_id     = $2,
         group_id      = $3,
         conditions    = COALESCE($4, conditions),
         status        = COALESCE($5, status),
         display_order = COALESCE($6, display_order),
         updated_at    = NOW()
       WHERE id = $7 RETURNING *`,
      [
        name          ?? null,
        newMethodId,
        newGroupId,
        conditions    ?? null,
        status        ?? null,
        display_order ?? null,
        id,
      ]
    );

    // Touch project
    await query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [exp.project_id]);

    // Attach method_name and group_name
    const methodName = updated.method_id
      ? (await queryOne('SELECT name FROM methods WHERE id = $1', [updated.method_id]))?.name ?? null
      : null;
    const groupName = updated.group_id
      ? (await queryOne('SELECT name FROM experiment_groups WHERE id = $1', [updated.group_id]))?.name ?? null
      : null;

    return res.status(200).json({ ...updated, method_name: methodName, group_name: groupName });
  }

  if (req.method === 'DELETE') {
    // ON DELETE CASCADE removes the result row automatically
    await query('DELETE FROM experiments WHERE id = $1', [id]);
    await query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [exp.project_id]);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
