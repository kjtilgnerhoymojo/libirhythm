// LibiRhythm — "Compartir" buttons: any element with data-share opens the phone's share menu,
// or, where that doesn't exist (most desktops), a small panel with WhatsApp, Telegram, email and copy link.
// Only the page address and a fixed text are shared, never the user's dates or results.
// Optional attributes: data-share-url (default: the page's canonical URL), data-share-text, data-share-title.
(function () {
  var DEFAULT_TEXT = 'Mira LibiRhythm: tu ciclo y tus biorritmos en un solo calendario, sin cuenta.';

  function canonical() {
    var l = document.querySelector('link[rel="canonical"]');
    return l ? l.href : location.origin + location.pathname;
  }

  var css = '' +
    '.ls-back{position:fixed;inset:0;z-index:1000;background:rgba(10,6,16,.6);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:16px;}' +
    '@media(min-width:600px){.ls-back{align-items:center;}}' +
    '.ls-panel{width:100%;max-width:360px;background:#1e1629;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px 20px 18px;color:#fff;font-family:"DM Sans",sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);}' +
    '.ls-title{font-family:"Cormorant Garamond",serif;font-size:24px;font-weight:400;margin-bottom:4px;}' +
    '.ls-sub{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:16px;}' +
    '.ls-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
    '.ls-opt{display:block;text-align:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 8px;font:inherit;font-size:13px;color:#fff;text-decoration:none;cursor:pointer;transition:all .2s;}' +
    '.ls-opt:hover{border-color:rgba(232,132,154,.6);background:rgba(200,85,111,.12);}' +
    '.ls-copy{grid-column:1/-1;background:linear-gradient(135deg,#c8556f,#9b7fc8);border:none;font-weight:500;}' +
    '.ls-close{display:block;margin:14px auto 0;background:none;border:none;font:inherit;font-size:12px;color:rgba(255,255,255,.45);cursor:pointer;}';

  function openPanel(url, text, title) {
    if (!document.getElementById('ls-style')) {
      var s = document.createElement('style');
      s.id = 'ls-style';
      s.textContent = css;
      document.head.appendChild(s);
    }
    var msg = encodeURIComponent(text + ' ' + url);
    var back = document.createElement('div');
    back.className = 'ls-back';
    back.innerHTML =
      '<div class="ls-panel" role="dialog" aria-modal="true" aria-labelledby="ls-title">' +
        '<div class="ls-title" id="ls-title">' + title + '</div>' +
        '<div class="ls-sub">Solo se comparte el enlace a la web, nunca tus fechas ni tus resultados.</div>' +
        '<div class="ls-opts">' +
          '<a class="ls-opt" target="_blank" rel="noopener" href="https://wa.me/?text=' + msg + '">WhatsApp</a>' +
          '<a class="ls-opt" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text) + '">Telegram</a>' +
          '<a class="ls-opt" href="mailto:?subject=' + encodeURIComponent('LibiRhythm') + '&body=' + msg + '">Email</a>' +
          '<a class="ls-opt" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '">Facebook</a>' +
          '<button type="button" class="ls-opt ls-copy">Copiar enlace</button>' +
        '</div>' +
        '<button type="button" class="ls-close">Cerrar</button>' +
      '</div>';
    function close() { back.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.ls-close').addEventListener('click', close);
    var copy = back.querySelector('.ls-copy');
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = '✓ Enlace copiado'; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copia el enlace:', url); });
      else prompt('Copia el enlace:', url);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    copy.focus();
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-share]');
    if (!el) return;
    e.preventDefault();
    var url = el.getAttribute('data-share-url') || canonical();
    var text = el.getAttribute('data-share-text') || DEFAULT_TEXT;
    var title = el.getAttribute('data-share-title') || 'Compartir LibiRhythm';
    if (navigator.share && matchMedia('(pointer:coarse)').matches) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
    } else {
      openPanel(url, text, title);
    }
  });
})();
