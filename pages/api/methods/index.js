import { query, queryOne } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const methods = await query(
      `SELECT m.*, COUNT(e.id)::int AS usage_count
       FROM methods m
       LEFT JOIN experiments e ON e.method_id = m.id
       WHERE m.project_id = $1
       GROUP BY m.id
       ORDER BY m.name`,
      [projectId]
    );
    return res.status(200).json(methods);
  }

  if (req.method === 'POST') {
    const {
      project_id,
      name,
      objective  = '',
      materials  = '',
      procedure  = '',
    } = req.body;

    if (!project_id || !name?.trim()) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    const method = await queryOne(
      `INSERT INTO methods (project_id, name, objective, materials, procedure, version)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING *`,
      [project_id, name.trim(), objective, materials, procedure]
    );
    return res.status(201).json(method);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
