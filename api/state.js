const KEY = 'audit-state';

/* Accepts the different names Vercel/Upstash use depending on how the DB was created */
function creds() {
  const e = process.env;
  return {
    url: e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL || e.REDIS_REST_API_URL || e.KV_URL_REST,
    token: e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || e.REDIS_REST_API_TOKEN
  };
}

async function redis(command) {
  const { url, token } = creds();
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text()}`);
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { url, token } = creds();
  if (!url || !token) {
    return res.status(500).json({
      error: 'The Redis database is not connected to this Vercel project. Looked for KV_REST_API_URL / KV_REST_API_TOKEN and UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN and none of them exist. Connect the database under Storage (or add them in Settings > Environment Variables) and redeploy.',
      found: Object.keys(process.env).filter(k => /KV_|UPSTASH|REDIS/.test(k))
    });
  }
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
      const state = {
        nodes: body.nodes,
        edges: body.edges,
        audit: body.audit,
        workflows: Array.isArray(body.workflows) ? body.workflows : []
      };
      await redis(['SET', KEY, JSON.stringify(state)]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
