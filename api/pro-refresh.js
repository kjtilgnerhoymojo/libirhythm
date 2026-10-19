// POST /api/pro-refresh  { "token": "..." }
// Re-checks the subscription behind a previously issued token and returns a fresh one.
// 401 = token not signed by us, 403 = subscription no longer active (the browser drops Pro).
const { stripe, verify, tokenFor, configured } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!configured(res)) return;

  const payload = verify(req.body && req.body.token);
  if (!payload || !/^sub_[A-Za-z0-9]+$/.test(payload.sub || '')) return res.status(401).json({ error: 'bad_token' });

  try {
    const token = tokenFor(await stripe('subscriptions/' + payload.sub));
    if (!token) return res.status(403).json({ error: 'inactive' });
    res.status(200).json({ token });
  } catch (e) {
    res.status(e.status === 404 ? 403 : 502).json({ error: 'stripe' });
  }
};
