// GET /api/pro-activate?session_id=cs_...
// Called after the Stripe Payment Link redirects back with {CHECKOUT_SESSION_ID}.
// Checks the Checkout Session with Stripe and returns a signed Pro token if the subscription is paid and active.
const { stripe, tokenFor, configured } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured(res)) return;

  const id = String(req.query.session_id || '');
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return res.status(400).json({ error: 'bad_session' });

  try {
    const session = await stripe('checkout/sessions/' + id + '?expand[]=subscription');
    const paid = session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status);
    if (!paid || !session.subscription) return res.status(402).json({ error: 'not_paid' });

    const token = tokenFor(session.subscription);
    if (!token) return res.status(403).json({ error: 'inactive' });
    res.status(200).json({ token });
  } catch (e) {
    res.status(e.status === 404 ? 404 : 502).json({ error: 'stripe' });
  }
};
