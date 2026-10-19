// LibiRhythm Pro — remembers in this browser a Pro token issued by /api after Stripe confirms the payment.
// Usage: LibiPro.isPro() (sync, from the stored token) and LibiPro.ready (Promise<boolean>, after activation/refresh).
(function () {
  var TOKEN_KEY = 'libipro_token';
  var CHECKED_KEY = 'libipro_checked';
  var DAY = 86400000;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  function payload(token) {
    try { return JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return null; }
  }

  // Activations from before tokens existed (?pro=ok) are honoured until their 32 days run out
  function legacyPro() {
    return get('libipro') === 'true' && Date.now() - parseInt(get('libipro_ts') || '0') < 32 * DAY;
  }

  function tokenPro() {
    var t = get(TOKEN_KEY), p = t && payload(t);
    return !!(p && p.exp * 1000 > Date.now());
  }

  function isPro() { return tokenPro() || legacyPro(); }

  function store(token) { set(TOKEN_KEY, token); set(CHECKED_KEY, String(Date.now())); }

  async function activate(sessionId) {
    var r = await fetch('/api/pro-activate?session_id=' + encodeURIComponent(sessionId), { cache: 'no-store' });
    var body = await r.json().catch(function () { return {}; });
    if (!(r.ok && body.token)) return; // leave session_id in the URL so a reload retries
    store(body.token);
    var params = new URLSearchParams(location.search);
    params.delete('session_id');
    params.delete('pro');
    var q = params.toString();
    history.replaceState({}, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  // Re-check the subscription at most once a day, or sooner if the token is about to expire
  async function refresh() {
    var t = get(TOKEN_KEY);
    if (!t) return;
    var p = payload(t);
    var lastCheck = parseInt(get(CHECKED_KEY) || '0');
    if (p && Date.now() - lastCheck < DAY && p.exp * 1000 - Date.now() > 3 * DAY) return;
    var r = await fetch('/api/pro-refresh', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t })
    });
    var body = await r.json().catch(function () { return {}; });
    if (r.ok && body.token) store(body.token);
    else if (r.status === 401 || r.status === 403) { set(TOKEN_KEY, null); set(CHECKED_KEY, null); }
    // Network or server errors: keep the current token until it expires
  }

  var sessionId = new URLSearchParams(location.search).get('session_id');

  var ready = (sessionId ? activate(sessionId) : refresh())
    .catch(function () {})
    .then(isPro);

  window.LibiPro = { isPro: isPro, ready: ready, activating: !!sessionId };
})();
