// Shared helpers for the Pro activation functions. Files starting with "_" are not exposed as routes by Vercel.
// Required environment variables (set them in Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY  – Stripe secret key (ideally a restricted key with read access to Checkout Sessions and Subscriptions)
//   PRO_TOKEN_SECRET   – long random string used to sign Pro tokens
const crypto = require('crypto');

const STRIPE_API = 'https://api.stripe.com/v1/';
const GRACE_SECONDS = 3 * 86400; // keep Pro a few days past the period end while Stripe retries the renewal
const ACTIVE = ['active', 'trialing'];

async function stripe(path) {
  const r = await fetch(STRIPE_API + path, {
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY },
  });
  const body = await r.json();
  if (!r.ok) {
    const err = new Error((body.error && body.error.message) || 'Stripe error');
    err.status = r.status;
    throw err;
  }
  return body;
}

function mac(data) {
  return crypto.createHmac('sha256', process.env.PRO_TOKEN_SECRET).update(data).digest('base64url');
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return data + '.' + mac(data);
}

// Returns the payload of a correctly signed token (expired or not), or null
function verify(token) {
  const [data, sig] = String(token || '').split('.');
  if (!data || !sig) return null;
  const expected = mac(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()); } catch (e) { return null; }
}

function periodEnd(sub) {
  // Newer Stripe API versions moved current_period_end from the subscription onto its items
  if (sub.current_period_end) return sub.current_period_end;
  const items = (sub.items && sub.items.data) || [];
  return Math.max(0, ...items.map(i => i.current_period_end || 0));
}

// Signed token for an active subscription, valid until its current period ends (+ grace), or null
function tokenFor(sub) {
  if (!sub || !ACTIVE.includes(sub.status)) return null;
  const end = periodEnd(sub);
  if (!end) return null;
  return sign({ sub: sub.id, exp: end + GRACE_SECONDS });
}

function configured(res) {
  if (process.env.STRIPE_SECRET_KEY && process.env.PRO_TOKEN_SECRET) return true;
  res.status(500).json({ error: 'not_configured' });
  return false;
}

module.exports = { stripe, sign, verify, tokenFor, configured };
