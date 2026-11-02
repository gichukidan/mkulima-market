/* Listing detail view: #/listing/<id>. Public. Photos, asking price, status, views, thumbs up/down, seller card,
   and an owner bar (edit, status change, sold out = listing removed). No phone numbers or emails are shown. */
(function (root) {
  var MK = window.MK, esc = MK.esc, L = MK.L;
  var $ = function (id) { return root.getElementById(id); };

  var SW = {
    back_market: 'Rudi sokoni', back_market2: 'Rudi sokoni', nf_h: 'Tangazo halipatikani',
    nf_p: 'Tangazo hili halipatikani tena. Huenda limeuzwa.', err_h: 'Tangazo halikupakia', retry: 'Jaribu tena', 'a:photos_aria': 'Picha'
  };
  var I = MK.i18n(root, SW, function () { if (D) render(); });

  var D = null, token = 0, idx = 0, seller = null, sellerState = null, voting = false, askSold = false, lastLoadedId = null;

  var ICON = {
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    up: '<path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7"/>',
    down: '<path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17"/>',
    basket: '<path d="M5 9h14l-1.5 10a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 9zM9 9l3-5 3 5"/>',
    map: '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    spark: '<path d="M9.9 15.5A2 2 0 0 0 8.5 14.1l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6A2 2 0 0 0 9.9 8.5l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>'; }
  function say(text, bad) { var s = $('status'); s.textContent = text || ''; s.className = 'status' + (text ? (bad ? ' err' : ' ok') : ''); }

  function listingId() {
    var parts = (location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/');
    if (parts[0] !== 'listing') return undefined;
    return /^\d+$/.test(parts[1] || '') ? Number(parts[1]) : 0;
  }
  function state(s) { $('loading').hidden = s !== 'loading'; $('notfound').hidden = s !== 'nf'; $('errbox').hidden = s !== 'err'; $('main').hidden = s !== 'ok'; }

  /* ---------- loading ---------- */
  function load(opts) {
    var id = listingId(); if (id === undefined) return;
    var t = ++token, quiet = opts && opts.quiet;
    if (!quiet) { say(''); D = null; seller = null; sellerState = null; askSold = false; idx = 0; state('loading'); }
    if (!id) { state('nf'); return; }
    MK.api('GET', '/api/listings/' + id, null, { quiet: true }).then(function (l) {
      if (t !== token) return;
      D = l; if (idx >= (l.images || []).length) idx = 0;
      state('ok'); render();
      if (!quiet) {
        // count this visit once per page open; the owner's own visits are ignored by the server
        MK.api('POST', '/api/listings/' + id + '/view', null, { quiet: true }).then(function (v) { if (t === token && D && v && v.views != null) { D.views = v.views; renderInfo(); } }).catch(function () {});
        if (!l.is_owner && MK.me) loadSeller(l.seller_id, t);
      }
    }).catch(function (e) {
      if (t !== token) return;
      if (e.status === 404) state('nf'); else { $('errmsg').textContent = e.message; state('err'); }
    });
  }
  function loadSeller(sid, t) {
    MK.api('GET', '/api/profiles/' + sid, null, { quiet: true }).then(function (p) { if (t === token) { sellerState = !!p.iFollow; renderInfo(); } }).catch(function () {});
  }

  /* ---------- rendering ---------- */
  function render() { if (!D) return; renderGallery(); renderInfo(); renderOwner(); }

  function renderGallery() {
    var imgs = D.images || [], stage = $('stage'), th = $('thumbs');
    if (!imgs.length) {
      stage.innerHTML = '<div class="ph">' + ic('basket') + '<span>' + esc(L('No photos yet', 'Bado hakuna picha')) + '</span></div>';
      th.innerHTML = ''; return;
    }
    var n = imgs.length;
    stage.innerHTML = '<img alt="' + esc(D.title + ' (' + L('photo ', 'picha ') + (idx + 1) + ' / ' + n + ')') + '" src="/api/listing-images/' + Number(imgs[idx]) + '">' +
      (n > 1 ? '<button type="button" class="nav prev" data-nav="-1" aria-label="' + esc(L('Previous photo', 'Picha iliyotangulia')) + '">' + ic('left') + '</button>' +
        '<button type="button" class="nav next" data-nav="1" aria-label="' + esc(L('Next photo', 'Picha inayofuata')) + '">' + ic('right') + '</button>' +
        '<span class="count" aria-hidden="true">' + (idx + 1) + ' / ' + n + '</span>' : '');
    th.innerHTML = n > 1 ? imgs.map(function (id, i) {
      return '<button type="button" data-i="' + i + '" aria-current="' + (i === idx) + '" aria-label="' + esc(L('Show photo ', 'Onyesha picha ') + (i + 1)) + '"><img alt="" loading="lazy" src="/api/listing-images/' + Number(id) + '"></button>';
    }).join('') : '';
  }
  function go(i, focusThumb) {
    var n = (D.images || []).length; if (n < 2) return;
    idx = (i + n) % n; renderGallery();
    if (focusThumb) { var b = root.querySelector('#thumbs button[data-i="' + idx + '"]'); if (b) b.focus(); }
  }

  function thumb(kind, active, count, off) {
    return '<button type="button" class="thumb ' + kind + '" data-vote="' + (kind === 'up' ? 1 : -1) + '" aria-pressed="' + (active ? 'true' : 'false') + '"' + (off ? ' disabled' : '') +
      ' aria-label="' + esc(kind === 'up' ? L('Thumbs up', 'Kidole gumba juu') : L('Thumbs down', 'Kidole gumba chini')) + '">' + ic(kind) + '<span>' + MK.num(count) + '</span></button>';
  }

  function renderInfo() {
    var l = D; if (!l) return;
    var owner = !!l.is_owner, area = l.area || l.location, posted = l.listed_on || l.created_at;
    var sid = Number(l.seller_id), sname = l.seller_name || L('Seller', 'Muuzaji');
    var unit = l.unit && String(l.unit).toLowerCase() !== 'kg' ? l.unit : '';
    var follow = '';
    if (!owner) {
      if (!MK.me) follow = '<a class="btn small outline" href="#/login">' + esc(L('Log in to follow', 'Ingia ili kufuata')) + '</a>';
      else if (sellerState !== null) follow = '<button type="button" class="btn small ' + (sellerState ? 'outline' : 'primary') + '" id="followBtn" aria-pressed="' + sellerState + '">' + esc(sellerState ? L('Unfollow', 'Acha kufuata') : L('Follow', 'Fuata')) + '</button>';
    }
    $('info').innerHTML =
      '<div class="tags">' + MK.statusPill(l.status) + (l.sponsored ? '<span class="spons">' + ic('spark').replace('<svg', '<svg width="13" height="13" style="fill:none;stroke:currentColor;stroke-width:2"') + esc(L('Sponsored', 'Imedhaminiwa')) + '</span>' : '') + '</div>' +
      '<h1>' + esc(l.title) + '</h1>' +
      '<div class="price"><small>' + esc(L('Asking price', 'Bei ya kuuza')) + '</small><b>' + esc(MK.money(l.price_per_kg)) + ' <span>/ kg</span></b></div>' +
      '<dl class="facts">' +
        '<div><dt>' + esc(L('Quantity', 'Kiasi')) + '</dt><dd>' + MK.num(l.quantity_kg) + ' kg' + (unit ? ' · ' + esc(unit) : '') + '</dd></div>' +
        '<div><dt>' + esc(L('Grade', 'Daraja')) + '</dt><dd>' + (l.grade ? esc(l.grade) : '—') + '</dd></div>' +
        '<div><dt>' + esc(L('Area', 'Eneo')) + '</dt><dd>' + (area ? esc(area) : '—') + '</dd></div>' +
        '<div><dt>' + esc(L('Posted', 'Imechapishwa')) + '</dt><dd>' + (posted ? esc(MK.fmtDate(posted)) : '—') + '</dd></div>' +
      '</dl>' +
      (l.description ? '<p class="desc">' + esc(l.description) + '</p>' : '') +
      '<div class="eng"><span class="views">' + ic('eye') + esc(MK.num(l.views) + ' ' + (Number(l.views) === 1 ? L('view', 'mtazamo') : L('views', 'mitazamo'))) + '</span>' +
        thumb('up', l.my_vote === 1, l.likes, owner) + thumb('down', l.my_vote === -1, l.dislikes, owner) + '</div>' +
      (owner ? '<p class="note">' + esc(L('You cannot vote on your own listing. Only buyers can.', 'Huwezi kupigia kura tangazo lako mwenyewe. Wanunuzi pekee wanaweza.')) + '</p>' : '') +
      '<div class="seller"><span class="av" aria-hidden="true">' + esc(MK.initials(sname)) + '</span><div class="who"><a href="#/profile/' + sid + '">' + esc(sname) + (l.seller_verified ? ' ' + MK.verified() : '') + '</a>' +
        '<small>' + (l.seller_rating ? MK.stars(l.seller_rating.avg, l.seller_rating.count) : '') + '</small></div>' + follow + '</div>' +
      '<div class="links"><a class="btn outline small" href="#/map">' + ic('map') + esc(L('See on map', 'Tazama kwenye ramani')) + '</a>' +
        '<a class="btn outline small" href="#/ai">' + ic('spark') + esc(L('Ask Mkulima AI', 'Uliza Mkulima AI')) + '</a>' +
        '<a class="btn outline small" href="#/home/produce">' + esc(L('Back to marketplace', 'Rudi sokoni')) + '</a></div>';
  }

  function statusOpts(cur) {
    return ['available', 'almost_out', 'paused', 'sold'].map(function (k) {
      var s = MK.STATUS[k]; return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(L(s.en, s.sw)) + '</option>';
    }).join('');
  }
  function renderOwner() {
    var bar = $('ownerBar'), l = D;
    bar.hidden = !l.is_owner; if (!l.is_owner) { bar.innerHTML = ''; return; }
    bar.innerHTML = '<h2>' + esc(L('This is your listing', 'Hili ni tangazo lako')) + '</h2>' +
      '<div class="row"><a class="btn primary small" href="#/seller-form/' + Number(l.id) + '">' + ic('pen') + esc(L('Edit listing', 'Hariri tangazo')) + '</a>' +
      '<label>' + esc(L('Status', 'Hali')) + '<select id="stSel">' + statusOpts(l.status) + '</select></label>' +
      '<a class="btn outline small" href="#/dashboard">' + esc(L('Back to dashboard', 'Rudi dashibodini')) + '</a></div>' +
      (askSold ? '<div class="confirm" role="alertdialog" aria-labelledby="soldq"><p id="soldq">' + esc(L('Mark as sold out? The listing will be removed from the marketplace automatically, along with its photos, views and votes. This cannot be undone.',
        'Weka kuwa imeuzwa? Tangazo litaondolewa sokoni moja kwa moja pamoja na picha, mitazamo na kura zake. Haiwezi kurudishwa.')) + '</p>' +
        '<div class="row"><button type="button" class="btn danger solid small" id="soldYes">' + esc(L('Yes, mark sold out and remove', 'Ndiyo, weka imeuzwa na uondoe')) + '</button>' +
        '<button type="button" class="btn outline small" id="soldNo">' + esc(L('Cancel', 'Ghairi')) + '</button></div></div>' : '');
    if (askSold) { var y = $('soldNo'); if (y) y.focus({ preventScroll: true }); }
  }

  /* ---------- actions ---------- */
  function vote(v) {
    if (voting || D.is_owner) return;
    voting = true;
    var prev = { my: D.my_vote, up: D.likes, down: D.dislikes };
    var next = D.my_vote === v ? 0 : v; // same vote again removes it
    if (D.my_vote === 1) D.likes--; if (D.my_vote === -1) D.dislikes--;
    if (next === 1) D.likes++; if (next === -1) D.dislikes++;
    D.my_vote = next; renderInfo();
    var back = root.querySelector('[data-vote="' + v + '"]'); if (back) back.focus();
    MK.api('POST', '/api/listings/' + D.id + '/vote', { vote: v }, { quiet: true }).then(function (r) {
      D.likes = r.likes; D.dislikes = r.dislikes; D.my_vote = r.my_vote; say('');
    }).catch(function (e) {
      D.my_vote = prev.my; D.likes = prev.up; D.dislikes = prev.down; say(e.message, true);
    }).then(function () { voting = false; renderInfo(); var b2 = root.querySelector('[data-vote="' + v + '"]'); if (b2) b2.focus(); });
  }
  function setStatus(s) {
    MK.api('PATCH', '/api/listings/' + D.id + '/status', { status: s }).then(function (r) {
      if (r && r.deleted) { MK.toast(L('Marked sold out. The listing was removed.', 'Imewekwa imeuzwa. Tangazo limeondolewa.')); location.hash = '#/dashboard'; return; }
      askSold = false; D.status = s; say(L('Status updated.', 'Hali imesasishwa.')); render();
    }).catch(function (e) { askSold = false; say(e.message, true); render(); });
  }

  root.addEventListener('click', function (e) {
    var el = e.target.closest('button'); if (!el) return;
    if (el.dataset.vote) return vote(Number(el.dataset.vote));
    if (el.dataset.nav) return go(idx + Number(el.dataset.nav));
    if (el.dataset.i != null && el.closest('#thumbs')) return go(Number(el.dataset.i));
    if (el.id === 'retry') return load();
    if (el.id === 'soldYes') return setStatus('sold');
    if (el.id === 'soldNo') { askSold = false; renderOwner(); var s = $('stSel'); if (s) s.focus(); return; }
    if (el.id === 'followBtn') {
      el.disabled = true;
      MK.api(sellerState ? 'DELETE' : 'POST', '/api/users/' + D.seller_id + '/follow').then(function (r) {
        sellerState = !!r.following; say(sellerState ? L('You are now following this seller.', 'Sasa unamfuata muuzaji huyu.') : L('You stopped following this seller.', 'Umeacha kumfuata muuzaji huyu.')); renderInfo();
      }).catch(function (err) { say(err.message, true); renderInfo(); });
    }
  });
  root.addEventListener('change', function (e) {
    if (e.target.id !== 'stSel') return;
    if (e.target.value === 'sold') { askSold = true; renderOwner(); return; }
    askSold = false; setStatus(e.target.value);
  });
  root.addEventListener('keydown', function (e) {
    if (!D || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (!e.target.closest || !e.target.closest('.gal')) return;
    e.preventDefault(); go(idx + (e.key === 'ArrowRight' ? 1 : -1), !!e.target.closest('#thumbs'));
  });

  /* ---------- wiring ---------- */
  document.addEventListener('mk:route', function (e) { if (e.detail && e.detail.view === 'listing') load(); });
  document.addEventListener('mk:auth', function () { if (listingId() !== undefined) load(); });
  I.apply();
  if (listingId() !== undefined) load();
})(window.__r.listing);
