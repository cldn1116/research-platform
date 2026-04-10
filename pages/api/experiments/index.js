import { query, queryOne } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const exps = await query(
      `SELECT e.*, m.name AS method_name
       FROM experiments e
       LEFT JOIN methods m ON m.id = e.method_id
       WHERE e.project_id = $1
       ORDER BY e.display_order ASC, e.created_at ASC`,
      [projectId]
    );
    return res.status(200).json(exps);
  }

  if (req.method === 'POST') {
    const { project_id, method_id, name, conditions = '', status = 'included' } = req.body;
    if (!project_id || !name?.trim()) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    const validStatuses = ['included', 'excluded', 'supplementary'];
    const safeStatus = validStatuses.includes(status) ? status : 'included';

    // Next display_order = max + 1 (or 0 if none exist)
    const orderRow = await queryOne(
      `SELECT (COALESCE(MAX(display_order), -1) + 1)::int AS next_order
       FROM experiments WHERE project_id = $1`,
      [project_id]
    );
    const nextOrder = orderRow?.next_order ?? 0;

    const exp = await queryOne(
      `INSERT INTO experiments (project_id, method_id, name, conditions, status, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, method_id || null, name.trim(), conditions, safeStatus, nextOrder]
    );

    // Attach method_name for the response
    const methodName = exp.method_id
      ? (await queryOne('SELECT name FROM methods WHERE id = $1', [exp.method_id]))?.name ?? null
      : null;

    // Touch project updated_at
    await query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [project_id]);

    return res.status(201).json({ ...exp, method_name: methodName });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
