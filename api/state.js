const KEY = 'audit-state';

async function redis(command) {
  const r = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text()}`);
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const { result } = await redis(['GET', KEY]);
      return res.status(200).json(result ? JSON.parse(result) : null);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = null; }
      }
      if (
        !body ||
        !Array.isArray(body.nodes) ||
        !Array.isArray(body.edges) ||
        typeof body.audit !== 'object' || body.audit === null
      ) {
        return res.status(400).json({ error: 'Body must be {nodes, edges, audit}' });
      }
      const state = { nodes: body.nodes, edges: body.edges, audit: body.audit };
      await redis(['SET', KEY, JSON.stringify(state)]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
