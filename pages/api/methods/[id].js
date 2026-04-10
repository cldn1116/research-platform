import { query, queryOne } from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  const method = await queryOne('SELECT * FROM methods WHERE id = $1', [id]);
  if (!method) return res.status(404).json({ error: 'Method not found' });

  if (req.method === 'GET') return res.status(200).json(method);

  if (req.method === 'PUT') {
    const { name, objective, materials, procedure } = req.body;
    const updated = await queryOne(
      `UPDATE methods SET
         name       = COALESCE($1, name),
         objective  = COALESCE($2, objective),
         materials  = COALESCE($3, materials),
         procedure  = COALESCE($4, procedure),
         version    = version + 1,
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name ?? null, objective ?? null, materials ?? null, procedure ?? null, id]
    );
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    // ON DELETE SET NULL clears method_id on linked experiments automatically
    await query('DELETE FROM methods WHERE id = $1', [id]);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
