/* Shared helpers for every page: window.MK.
   Pages run inside shadow roots, so this file holds the things they all need: language, API calls,
   dates, stars, status colours, notification wording (English + Kiswahili) and photo compression. */
(function () {
  var MK = window.MK = window.MK || {};
  MK.me = undefined; // undefined = not asked yet, null = signed out, object = signed-in user (from /api/session)
  MK.unread = 0;

  MK.lang = function () { return document.documentElement.lang === 'sw' ? 'sw' : 'en'; };
  MK.L = function (en, sw) { return MK.lang() === 'sw' ? sw : en; };
  MK.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  MK.money = function (n) { return 'KSh ' + Number(n || 0).toLocaleString('en-KE'); };
  MK.num = function (n) { return Number(n || 0).toLocaleString('en-KE'); };
  MK.initials = function (name) { return String(name || 'M').trim().split(/\s+/).map(function (p) { return p[0] || ''; }).slice(0, 2).join('').toUpperCase() || 'M'; };

  /* ---- API: JSON in, JSON out. A 401 sends the user to the log-in page unless opts.quiet is set. ---- */
  MK.api = function (method, url, body, opts) {
    return fetch(url, {
      method: method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401 && !(opts && opts.quiet)) location.hash = '#/login';
        if (!res.ok) { var e = new Error(data.error || MK.L('Request failed', 'Ombi halikufaulu')); e.status = res.status; e.data = data; throw e; }
        return data;
      });
    });
  };

  /* ---- dates: SQLite stores UTC as "YYYY-MM-DD HH:MM:SS" ---- */
  MK.date = function (s) {
    if (!s) return null;
    s = String(s);
    return new Date(/^\d{4}-\d\d-\d\d$/.test(s) ? s + 'T00:00:00' : /Z|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
  };
  MK.fmtDate = function (s) {
    var d = MK.date(s); if (!d || isNaN(d)) return '';
    return d.toLocaleDateString(MK.lang() === 'sw' ? 'sw-KE' : 'en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  MK.ago = function (s) {
    var d = MK.date(s); if (!d || isNaN(d)) return '';
    var m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (m < 1) return MK.L('just now', 'sasa hivi');
    if (m < 60) return MK.L(m + ' min ago', 'dakika ' + m + ' zilizopita');
    var h = Math.round(m / 60); if (h < 24) return MK.L(h + ' h ago', 'saa ' + h + ' zilizopita');
    var dd = Math.round(h / 24); if (dd < 30) return MK.L(dd + ' d ago', 'siku ' + dd + ' zilizopita');
    return MK.fmtDate(s);
  };

  /* ---- listing status: colour is automatic. Sold out removes the listing, so it never shows on a live card. ---- */
  MK.STATUS = {
    available: { cls: 'st-ok', en: 'Available', sw: 'Inapatikana' },
    almost_out: { cls: 'st-warn', en: 'Almost out', sw: 'Karibu kuisha' },
    paused: { cls: 'st-mute', en: 'Paused', sw: 'Imesimamishwa' },
    sold: { cls: 'st-out', en: 'Sold out', sw: 'Imeuzwa' }
  };
  MK.statusPill = function (status) {
    var s = MK.STATUS[status] || MK.STATUS.available;
    return '<span class="st ' + s.cls + '"><i></i>' + MK.esc(MK.lang() === 'sw' ? s.sw : s.en) + '</span>';
  };

  /* ---- icons and star ratings (styles live in css/common.css) ---- */
  MK.verified = function (label) {
    return '<svg class="vb" viewBox="0 0 24 24" role="img" aria-label="' + MK.esc(label || MK.L('Verified', 'Amethibitishwa')) + '"><title>' + MK.esc(label || MK.L('Verified', 'Amethibitishwa')) + '</title><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>';
  };
  MK.stars = function (avg, count) {
    if (avg == null) return '<span class="stars-none">' + MK.esc(MK.L('No ratings yet', 'Bado hakuna ukadiriaji')) + '</span>';
    return '<span class="stars" style="--v:' + Number(avg) + '" role="img" aria-label="' + avg + ' / 5"></span> <b class="stars-n">' + Number(avg).toFixed(1) + '</b>' +
      (count != null ? ' <span class="stars-c">(' + count + ')</span>' : '');
  };

  /* ---- translations for a view: <el data-t="key"> (text), data-p (placeholder), data-a (aria-label). English stays in the markup. ---- */
  MK.i18n = function (root, SW, onChange) {
    var EN = {};
    root.querySelectorAll('[data-t]').forEach(function (e) { EN[e.dataset.t] = e.textContent; });
    root.querySelectorAll('[data-p]').forEach(function (e) { EN['p:' + e.dataset.p] = e.getAttribute('placeholder') || ''; });
    root.querySelectorAll('[data-a]').forEach(function (e) { EN['a:' + e.dataset.a] = e.getAttribute('aria-label') || ''; });
    var api = {
      T: function (k) { return MK.lang() === 'sw' && SW[k] != null ? SW[k] : (EN[k] != null ? EN[k] : (SW[k] != null && MK.lang() === 'sw' ? SW[k] : k)); },
      apply: function () {
        var sw = MK.lang() === 'sw';
        root.querySelectorAll('[data-t]').forEach(function (e) { var k = e.dataset.t; if (sw && SW[k] != null) e.textContent = SW[k]; else if (EN[k] != null) e.textContent = EN[k]; });
        root.querySelectorAll('[data-p]').forEach(function (e) { var k = e.dataset.p; e.setAttribute('placeholder', sw && SW['p:' + k] != null ? SW['p:' + k] : EN['p:' + k]); });
        root.querySelectorAll('[data-a]').forEach(function (e) { var k = e.dataset.a; e.setAttribute('aria-label', sw && SW['a:' + k] != null ? SW['a:' + k] : EN['a:' + k]); });
        if (onChange) onChange();
      }
    };
    document.addEventListener('mk:lang', api.apply);
    return api;
  };

  /* ---- notification wording ---- */
  var N = {
    listing_view: ['{count} new view(s) on "{title}".', 'Mitazamo mipya {count} kwenye "{title}".', 'eye'],
    listing_like: ['{count} thumbs up on "{title}".', 'Vidole gumba {count} juu kwenye "{title}".', 'up'],
    listing_dislike: ['{count} thumbs down on "{title}".', 'Vidole gumba {count} chini kwenye "{title}".', 'down'],
    listing_sold: ['"{title}" was marked sold out and removed from the marketplace.', '"{title}" imewekwa kuwa imeuzwa na kuondolewa sokoni.', 'check'],
    new_follower: ['{name} started following you.', '{name} ameanza kukufuata.', 'user'],
    new_rating: ['{name} rated you {stars} out of 5.', '{name} amekupa nyota {stars} kati ya 5.', 'star'],
    badge_requested: ['We received your blue badge request. Our team will contact you to arrange the visit.', 'Tumepokea ombi lako la beji ya buluu. Timu yetu itakupigia kupanga ziara.', 'badge'],
    badge_verified: ['Your blue badge is active until {until}.', 'Beji yako ya buluu inatumika hadi {until}.', 'badge'],
    badge_rejected: ['Your blue badge request was not approved. {note}', 'Ombi lako la beji ya buluu halikuidhinishwa. {note}', 'badge'],
    badge_expiring: ['Your blue badge ends in {days} day(s). Renew to keep it.', 'Beji yako ya buluu inaisha baada ya siku {days}. Fanya upya ili kuiendeleza.', 'badge'],
    badge_expired: ['Your blue badge has ended. Renew to show it again.', 'Beji yako ya buluu imeisha. Fanya upya ili ionekane tena.', 'badge'],
    advert_submitted: ['Your advert "{title}" was sent for approval.', 'Tangazo lako "{title}" limetumwa kuidhinishwa.', 'ad'],
    advert_approved: ['"{title}" is now live for {days} days.', '"{title}" sasa linaonekana kwa siku {days}.', 'ad'],
    advert_rejected: ['"{title}" was not approved. {note}', '"{title}" halikuidhinishwa. {note}', 'ad'],
    advert_ended: ['"{title}" has ended.', '"{title}" limeisha.', 'ad'],
    quote_request: ['{name} asked for a quote: {loadKg} kg on "{route}".', '{name} ameomba bei: kg {loadKg} kwenye "{route}".', 'truck'],
    quote_response: ['{name} {status} your quote request.', '{name} {status} ombi lako la bei.', 'truck'],
    plan_changed: ['Your plan is now {plan} ({images} photos per listing).', 'Mpango wako sasa ni {plan} (picha {images} kwa kila tangazo).', 'info']
  };
  var STATUS_WORD = { accepted: ['accepted', 'amekubali'], declined: ['declined', 'amekataa'] };
  MK.notifText = function (n) {
    var t = N[n.type]; if (!t) return String(n.type || '');
    var sw = MK.lang() === 'sw', d = Object.assign({}, n.data || {});
    if (d.status && STATUS_WORD[d.status]) d.status = STATUS_WORD[d.status][sw ? 1 : 0];
    if (d.until) d.until = MK.fmtDate(d.until);
    if (d.kind) d.kind = d.kind === 'sponsored' ? MK.L('sponsored listing', 'tangazo lililodhaminiwa') : MK.L('advert', 'tangazo');
    if (n.type === 'advert_submitted') d.title = d.title || '';
    return (sw ? t[1] : t[0]).replace(/\{(\w+)\}/g, function (m, k) { return d[k] == null ? '' : d[k]; }).replace(/\s+$/, '');
  };
  var ICONS = {
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    up: '<path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7"/>',
    down: '<path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    ad: '<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.3-4.1a1 1 0 0 0-.8-.4H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
  };
  MK.notifIcon = function (type) {
    var t = N[type]; var k = t ? t[2] : 'info';
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k] + '</svg>';
  };

  /* ---- photos: shrink before upload so slow phone connections cope ---- */
  MK.compressImage = function (file, maxDim, quality) {
    maxDim = maxDim || 1280; quality = quality || 0.8;
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error(MK.L('Choose an image file.', 'Chagua faili la picha.')));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var r = Math.min(1, maxDim / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(MK.L('That image could not be read.', 'Picha hiyo haikusomeka.'))); };
      img.src = url;
    });
  };

  /* ---- toast (the element lives in index.html) ---- */
  MK.toast = function (msg, ms) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(MK._tt); MK._tt = setTimeout(function () { t.hidden = true; }, ms || 4000);
  };

  /* ---- ask the shell to re-check who is signed in (after log in / out) ---- */
  MK.refreshSession = function () { document.dispatchEvent(new CustomEvent('mk:session-refresh')); };
})();
