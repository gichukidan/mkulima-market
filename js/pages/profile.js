/* Profile view: #/profile (my profile) and #/profile/<id> (anyone's public profile).
   Follow / unfollow, suggestions, star rating after a real transaction, and (own profile) edit, password, delete, log out. */
(function (root) {
  var MK = window.MK, esc = MK.esc, L = MK.L;
  var $ = function (id) { return root.getElementById(id); };

  var SW = {
    nf_h: 'Wasifu haupatikani', nf_p: 'Huenda mtu huyu amefuta akaunti yake, au kiungo si sahihi.', back_market: 'Rudi sokoni',
    err_h: 'Wasifu haukupakia', retry: 'Jaribu tena', close: 'Funga',
    h_det: 'Maelezo ya mtumiaji', h_sug: 'Unaweza kufuata', sug_p: 'Watu ambao unaweza kutaka kuwafuata.',
    h_rate: 'Mpe mtu huyu nyota', rate_guest_p: 'Nyota hutolewa baada ya muamala halisi.', rate_login: 'Ingia ili kutoa nyota',
    rate_legend: 'Ukadiriaji wako (nyota 1 hadi 5)', s1: 'Nyota 1', s2: 'Nyota 2', s3: 'Nyota 3', s4: 'Nyota 4', s5: 'Nyota 5',
    rate_comment: 'Maoni (si lazima)', 'p:rate_comment_p': 'Ilikuwaje kufanya biashara na mtu huyu?',
    rate_done: 'Nimekamilisha muamala na mtu huyu', rate_submit: 'Tuma ukadiriaji',
    h_lst: 'Matangazo ya mazao', h_rts: 'Njia za usafirishaji', h_rev: 'Maoni na nyota',
    h_edit: 'Hariri wasifu', f_name: 'Jina kamili', f_phone: 'Simu', f_loc: 'Mahali (mji au soko)', f_biz: 'Aina ya biashara', f_spec: 'Utaalamu',
    'p:f_biz_p': 'mf. Mkulima mdogo', 'p:f_spec_p': 'mf. Viazi, kabichi', save_profile: 'Hifadhi wasifu',
    h_pw: 'Badilisha nenosiri', f_curpw: 'Nenosiri la sasa', f_newpw: 'Nenosiri jipya (angalau herufi 8)', change_pw: 'Badilisha nenosiri',
    h_del: 'Futa akaunti yangu', del_p: 'Hii inafuta akaunti yako na kila ulichochapisha. Haiwezi kurudishwa.', f_delpw: 'Thibitisha kwa nenosiri lako', del_btn: 'Futa akaunti yangu'
  };
  var I = MK.i18n(root, SW, function () { if (P) render(); });

  var P = null, token = 0, openList = '', sug = null, delArmed = null;

  /* ---------- small helpers ---------- */
  function say(text, bad) { var s = $('status'); s.textContent = text || ''; s.className = 'status' + (text ? (bad ? ' err' : ' ok') : ''); }
  function msg(id, text, bad) { var s = $(id); s.textContent = text || ''; s.className = 'msg full' + (text ? (bad ? ' err' : ' ok') : ''); }
  function roleName(r) { return { seller: L('Seller', 'Muuzaji'), buyer: L('Buyer', 'Mnunuzi'), transporter: L('Transporter', 'Msafirishaji') }[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : ''); }
  function planName(p) { return { free: L('Free', 'Bure'), biashara: 'Biashara', agribusiness: 'Agribusiness' }[p] || p || ''; }
  function badgeText(b) {
    if (!b) return '';
    var d = b.until ? MK.fmtDate(b.until) : '';
    return { none: L('No blue badge yet', 'Bado huna beji ya buluu'), pending: L('Request being reviewed', 'Ombi linakaguliwa'),
      active: L('Active until ', 'Inatumika hadi ') + d, expiring: L('Ends on ', 'Inaisha tarehe ') + d + L(' (renew soon)', ' (fanya upya hivi karibuni)'),
      expired: L('Ended on ', 'Iliisha tarehe ') + d, rejected: L('Last request not approved', 'Ombi la mwisho halikuidhinishwa') }[b.status] || '';
  }
  function reasonText(r) { return { area: L('Same area as you', 'Eneo moja na wewe'), verified: L('Verified', 'Amethibitishwa'), popular: L('Popular', 'Maarufu'), new: L('New member', 'Mwanachama mpya') }[r] || ''; }
  function ic(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>'; }
  var BASKET = '<path d="M5 9h14l-1.5 10a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 9zM9 9l3-5 3 5"/>';
  var TRUCK = '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.3-4.1a1 1 0 0 0-.8-.4H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>';

  function profileId() { // undefined when the hash is not a profile route; 0 when no usable id
    var parts = (location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/');
    if (parts[0] !== 'profile') return undefined;
    if (parts[1]) return /^\d+$/.test(parts[1]) ? Number(parts[1]) : 0;
    return MK.me ? MK.me.id : 0;
  }
  function state(s) {
    $('loading').hidden = s !== 'loading'; $('notfound').hidden = s !== 'nf'; $('errbox').hidden = s !== 'err'; $('main').hidden = s !== 'ok';
  }

  /* ---------- loading ---------- */
  function load() {
    var id = profileId(); if (id === undefined) return;
    var t = ++token; say(''); openList = ''; sug = null; P = null; state('loading');
    if (!id) { state('nf'); return; }
    MK.api('GET', '/api/profiles/' + id, null, { quiet: true }).then(function (p) {
      if (t !== token) return;
      P = p; fillForms(); state('ok'); render();
      if (p.isMe) loadSuggestions(t);
    }).catch(function (e) {
      if (t !== token) return;
      if (e.status === 404) state('nf'); else { $('errmsg').textContent = e.message; state('err'); }
    });
  }
  function loadSuggestions(t) {
    MK.api('GET', '/api/users/suggestions', null, { quiet: true }).then(function (d) { if (t === token) { sug = d.users || []; renderSug(); } })
      .catch(function () { if (t === token) { sug = []; renderSug(); } });
  }

  /* ---------- rendering ---------- */
  function userRow(u, withReason) {
    var follow = u.isMe ? '' : followBtn(u.id, u.iFollow, 'small');
    return '<div class="urow"><span class="av" aria-hidden="true">' + esc(MK.initials(u.fullName)) + '</span>' +
      '<div class="who"><a href="#/profile/' + Number(u.id) + '">' + esc(u.fullName) + (u.verified ? ' ' + MK.verified() : '') + '</a>' +
      '<small>' + esc(roleName(u.role)) + (u.location ? ' · ' + esc(u.location) : '') + (withReason && u.reason ? ' · <span class="why">' + esc(reasonText(u.reason)) + '</span>' : '') + '</small></div>' + follow + '</div>';
  }
  function followBtn(id, on, size) {
    return '<button type="button" class="btn ' + (size || '') + ' ' + (on ? 'outline' : 'primary') + '" data-follow="' + Number(id) + '" data-on="' + (on ? 1 : 0) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(on ? L('Unfollow', 'Acha kufuata') : L('Follow', 'Fuata')) + '</button>';
  }

  function render() {
    if (!P) return;
    var p = P, me = !!p.isMe, name = p.fullName || L('Mkulima member', 'Mwanachama wa Mkulima');
    var counts = me
      ? '<button type="button" class="count" data-list="followers" aria-expanded="' + (openList === 'followers') + '"><b>' + MK.num(p.followers) + '</b><span>' + esc(L('Followers', 'Wafuasi')) + '</span></button>' +
        '<button type="button" class="count" data-list="following" aria-expanded="' + (openList === 'following') + '"><b>' + MK.num(p.following) + '</b><span>' + esc(L('Following', 'Wanaofuatwa')) + '</span></button>'
      : '<div class="count"><b>' + MK.num(p.followers) + '</b><span>' + esc(L('Followers', 'Wafuasi')) + '</span></div><div class="count"><b>' + MK.num(p.following) + '</b><span>' + esc(L('Following', 'Wanaofuatwa')) + '</span></div>';
    var acts;
    if (me) acts = '<button type="button" class="btn primary" id="editBtn" aria-expanded="' + (!$('editCard').hidden) + '" aria-controls="editCard">' + esc(L('Edit profile', 'Hariri wasifu')) + '</button>' +
      '<a class="btn outline" href="#/dashboard">' + esc(L('Go to dashboard', 'Nenda dashibodi')) + '</a>' +
      '<button type="button" class="btn outline" id="logoutBtn">' + esc(L('Log out', 'Toka')) + '</button>';
    else if (MK.me) acts = followBtn(p.id, p.iFollow, '');
    else acts = '<a class="btn primary" href="#/login">' + esc(L('Log in to follow', 'Ingia ili kufuata')) + '</a>';

    $('head').innerHTML =
      '<div class="id"><span class="avatar" aria-hidden="true">' + esc(MK.initials(name)) + '</span><div style="min-width:0">' +
      '<h1>' + (me ? esc(L('Hello, ', 'Habari, ')) + esc(name) : esc(name)) + (p.verified ? ' ' + MK.verified() : '') + '</h1>' +
      '<div class="sub"><span class="rate-line">' + MK.stars(p.rating && p.rating.avg, p.rating && p.rating.count) + '</span></div></div></div>' +
      '<div class="counts">' + counts + '</div>' +
      '<div class="pills" style="grid-column:1/-1"><span class="pill">' + esc(roleName(p.role)) + '</span>' +
      (me ? '<span class="pill outline">' + esc(L('Plan: ', 'Mpango: ') + planName(p.plan)) + '</span>' : '') +
      (p.verified ? '<span class="pill outline">' + MK.verified() + ' ' + esc(L('Verified', 'Amethibitishwa')) + '</span>' : '') +
      (p.location ? '<span class="pill outline">' + esc(p.location) + '</span>' : '') + '</div>' +
      '<div class="acts">' + acts + '</div>';

    // details
    var rows = [];
    function row(k, v) { rows.push('<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>'); }
    var dash = '<span style="color:var(--mute)">' + esc(L('Not added', 'Haijaongezwa')) + '</span>';
    row(L('Name', 'Jina'), esc(name));
    if (me) { row(L('Email', 'Barua pepe'), p.email ? esc(p.email) : dash); row(L('Phone', 'Simu'), p.phone ? esc(p.phone) : dash); }
    row(L('Role', 'Jukumu'), esc(roleName(p.role)));
    row(L('Location', 'Mahali'), p.location ? esc(p.location) : dash);
    row(L('Business type', 'Aina ya biashara'), p.businessType ? esc(p.businessType) : dash);
    row(L('Speciality', 'Utaalamu'), p.speciality ? esc(p.speciality) : dash);
    row(L('Member since', 'Mwanachama tangu'), esc(MK.fmtDate(p.memberSince)) || dash);
    if (me) {
      row(L('Plan', 'Mpango'), esc(planName(p.plan)) + (p.imageLimit ? ' · ' + esc(L(p.imageLimit + ' photos per listing', 'picha ' + p.imageLimit + ' kwa kila tangazo')) : ''));
      row(L('Blue badge', 'Beji ya buluu'), (p.verified ? MK.verified() + ' ' : '') + esc(badgeText(p.badge)));
    } else if (p.verified) row(L('Blue badge', 'Beji ya buluu'), MK.verified() + ' ' + esc(L('Verified', 'Amethibitishwa')));
    $('details').innerHTML = rows.join('');

    // listings and routes
    var ls = p.listings || [], rs = p.routes || [];
    $('lstCard').hidden = !(ls.length || me);
    $('lstBody').innerHTML = ls.length ? '<div class="mini">' + ls.map(function (l) {
      return '<a class="mcard" href="#/listing/' + Number(l.id) + '"><span class="th">' + (l.image_id ? '<img alt="" loading="lazy" src="/api/listing-images/' + Number(l.image_id) + '">' : ic(BASKET)) + '</span>' +
        '<span class="bd"><h3>' + esc(l.title) + '</h3><span class="meta">' + esc(l.commodity || '') + ' · ' + MK.num(l.quantity_kg) + ' ' + esc(l.unit || 'kg') + '</span>' +
        '<span><span class="pr">' + esc(MK.money(l.price_per_kg)) + '</span> <span class="meta">/ kg</span></span></span>' + MK.statusPill(l.status) + '</a>';
    }).join('') + '</div>' : '<p class="empty">' + esc(me ? L('You have no live listings yet.', 'Huna matangazo yanayoonekana bado.') : L('No live listings right now.', 'Hakuna matangazo kwa sasa.')) + '</p>';
    $('rtsCard').hidden = !(rs.length || (me && p.role === 'transporter'));
    $('rtsBody').innerHTML = rs.length ? '<div class="mini">' + rs.map(function (r) {
      return '<div class="mcard"><span class="th">' + ic(TRUCK) + '</span><span class="bd"><h3>' + esc(r.route_name) + '</h3>' +
        '<span class="meta">' + esc(r.origin) + ' → ' + esc(r.destination) + (r.vehicle ? ' · ' + esc(r.vehicle) : '') + '</span>' +
        '<span><span class="pr">' + esc(MK.money(r.rate)) + '</span> <span class="meta">/ km · ' + esc(L('up to ', 'hadi ')) + MK.num(r.capacity_kg) + ' kg</span></span></span></div>';
    }).join('') + '</div>' : '<p class="empty">' + esc(L('No routes added yet.', 'Hakuna njia zilizoongezwa bado.')) + '</p>';

    // reviews
    var rv = p.reviews || [];
    $('revBody').innerHTML = rv.length ? rv.map(function (r) {
      return '<div class="rev"><div>' + MK.stars(r.stars) + '</div>' + (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') +
        '<span class="by"><a href="#/profile/' + Number(r.raterId) + '">' + esc(r.raterName) + '</a> · ' + esc(MK.fmtDate(r.createdAt)) + '</span></div>';
    }).join('') : '<p class="empty">' + esc(L('No reviews yet.', 'Bado hakuna maoni.')) + '</p>';

    // rating form (others only)
    $('rateCard').hidden = me;
    if (!me) {
      var signed = !!MK.me;
      $('rateGuest').hidden = signed; $('rateForm').hidden = !signed;
      $('h-rate').textContent = p.myRating ? L('Update your rating', 'Sasisha ukadiriaji wako') : L('Rate this person', 'Mpe mtu huyu nyota');
      $('rateBtn').textContent = p.myRating ? L('Update rating', 'Sasisha ukadiriaji') : L('Submit rating', 'Tuma ukadiriaji');
      $('rateNote').textContent = L('Give stars only after you really bought, sold or transported with ' + name + '. You can change your rating later.',
        'Toa nyota tu baada ya kununua, kuuza au kusafirisha kweli na ' + name + '. Unaweza kubadilisha ukadiriaji wako baadaye.');
    }
    $('editCard').hidden = $('editCard').hidden || !me;
    $('sugCard').hidden = !me;
    if (me) renderSug();
    renderList();
  }

  function renderSug() {
    if (!P || !P.isMe) return;
    var b = $('sugBody');
    if (sug === null) { b.innerHTML = '<div class="skel" style="min-height:90px"></div>'; return; }
    b.innerHTML = sug.length ? sug.map(function (u) { return userRow(u, true); }).join('')
      : '<div class="empty-note">' + esc(L('No suggestions right now. Check back as more people join.', 'Hakuna mapendekezo kwa sasa. Angalia tena watu wengi wakijiunga.')) + '</div>';
  }

  function renderList() {
    var panel = $('listPanel');
    panel.hidden = !openList;
    if (!openList) return;
    $('listTitle').textContent = openList === 'followers' ? L('Followers', 'Wafuasi') : L('Following', 'Wanaofuatwa');
  }
  function openUserList(kind) {
    if (openList === kind) { openList = ''; render(); return; }
    openList = kind; render();
    var t = token, body = $('listBody'); body.innerHTML = '<div class="skel" style="min-height:90px"></div>';
    MK.api('GET', '/api/users/me/' + kind).then(function (d) {
      if (t !== token || openList !== kind) return;
      var us = d.users || [];
      body.innerHTML = us.length ? us.map(function (u) { return userRow(u, false); }).join('')
        : '<div class="empty-note">' + esc(kind === 'followers' ? L('Nobody follows you yet.', 'Bado hakuna anayekufuata.') : L('You are not following anyone yet.', 'Bado hujaanza kufuata mtu.')) + '</div>';
    }).catch(function (e) { body.innerHTML = '<p class="msg err">' + esc(e.message) + '</p>'; });
  }

  /* ---------- forms ---------- */
  function fillForms() {
    var p = P; if (!p) return;
    if (p.isMe) {
      var f = $('profileForm');
      f.fullName.value = p.fullName || ''; f.phone.value = p.phone || ''; f.location.value = p.location || '';
      f.businessType.value = p.businessType || ''; f.speciality.value = p.speciality || '';
      ['profileMsg', 'passwordMsg', 'deleteMsg'].forEach(function (m) { msg(m, ''); });
      $('editCard').hidden = true; resetDelete();
    } else {
      var r = p.myRating;
      setStars(r ? r.stars : 0); $('rateComment').value = r && r.comment ? r.comment : ''; $('rateDone').checked = false; msg('rateMsg', '');
    }
  }
  function setStars(n) {
    root.querySelectorAll('#starrow input').forEach(function (i) { i.checked = Number(i.value) === n; });
    syncStars();
  }
  function syncStars() {
    var v = 0; root.querySelectorAll('#starrow input').forEach(function (i) { if (i.checked) v = Number(i.value); });
    root.querySelectorAll('#starrow label').forEach(function (l, idx) { l.classList.toggle('on', idx < v); });
    return v;
  }
  root.getElementById('starrow').addEventListener('change', syncStars);

  $('rateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var stars = syncStars();
    if (!stars) return msg('rateMsg', L('Choose 1 to 5 stars first.', 'Chagua nyota 1 hadi 5 kwanza.'), true);
    if (!$('rateDone').checked) return msg('rateMsg', L('Please confirm that you completed a transaction with this person.', 'Tafadhali thibitisha kuwa umekamilisha muamala na mtu huyu.'), true);
    var btn = $('rateBtn'); btn.disabled = true;
    MK.api('POST', '/api/users/' + P.id + '/rate', { stars: stars, comment: $('rateComment').value.trim(), completedTransaction: true }).then(function () {
      msg('rateMsg', L('Thank you. Your rating was saved.', 'Asante. Ukadiriaji wako umehifadhiwa.'));
      return MK.api('GET', '/api/profiles/' + P.id, null, { quiet: true }).then(function (p) { P = p; render(); setStars(stars); });
    }).catch(function (err) { msg('rateMsg', err.message, true); }).then(function () { btn.disabled = false; });
  });

  $('profileForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    MK.api('PUT', '/api/users/me', { fullName: f.fullName.value, phone: f.phone.value, location: f.location.value, businessType: f.businessType.value, speciality: f.speciality.value }).then(function () {
      msg('profileMsg', L('Profile saved.', 'Wasifu umehifadhiwa.')); MK.refreshSession();
      return MK.api('GET', '/api/profiles/' + P.id, null, { quiet: true }).then(function (p) { P = p; render(); });
    }).catch(function (err) { msg('profileMsg', err.message, true); });
  });
  $('passwordForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    MK.api('PUT', '/api/users/me/password', { currentPassword: f.currentPassword.value, newPassword: f.newPassword.value })
      .then(function () { f.reset(); msg('passwordMsg', L('Password changed.', 'Nenosiri limebadilishwa.')); })
      .catch(function (err) { msg('passwordMsg', err.message, true); });
  });
  function resetDelete() { clearTimeout(delArmed); delArmed = null; var b = $('delBtn'); b.classList.remove('armed'); b.textContent = L('Delete my account', 'Futa akaunti yangu'); }
  $('deleteForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, b = $('delBtn');
    if (!delArmed) {
      b.classList.add('armed'); b.textContent = L('Tap again to delete forever', 'Bonyeza tena kufuta moja kwa moja');
      msg('deleteMsg', L('This cannot be undone. Tap the button again within 6 seconds to confirm.', 'Haiwezi kurudishwa. Bonyeza kitufe tena ndani ya sekunde 6 kuthibitisha.'), true);
      delArmed = setTimeout(function () { resetDelete(); msg('deleteMsg', ''); }, 6000); return;
    }
    MK.api('DELETE', '/api/users/me', { password: f.password.value }, { quiet: true }).then(function () {
      try { localStorage.removeItem('mkulima_user'); } catch (x) {}
      MK.refreshSession(); location.hash = '#/home';
    }).catch(function (err) { resetDelete(); msg('deleteMsg', err.message, true); });
  });

  /* ---------- clicks (delegated) ---------- */
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.follow) return toggleFollow(t);
    if (t.dataset.list) return openUserList(t.dataset.list);
    if (t.id === 'listClose') { var k = openList; openList = ''; render(); var c = root.querySelector('[data-list="' + k + '"]'); if (c) c.focus(); return; }
    if (t.id === 'retry') return load();
    if (t.id === 'editBtn') {
      var c2 = $('editCard'); c2.hidden = !c2.hidden; t.setAttribute('aria-expanded', String(!c2.hidden));
      if (!c2.hidden) { c2.scrollIntoView({ behavior: 'smooth', block: 'start' }); c2.querySelector('input').focus({ preventScroll: true }); }
      return;
    }
    if (t.id === 'logoutBtn') {
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(function () {}).then(function () {
        try { localStorage.removeItem('mkulima_user'); } catch (x) {}
        MK.refreshSession(); location.hash = '#/login';
      });
    }
  });

  function toggleFollow(btn) {
    var id = Number(btn.dataset.follow), on = btn.dataset.on === '1';
    btn.disabled = true;
    MK.api(on ? 'DELETE' : 'POST', '/api/users/' + id + '/follow').then(function (r) {
      var now = !!r.following;
      if (P.isMe) P.following = Math.max(0, (P.following || 0) + (now ? 1 : -1)); else if (P.id === id) { P.iFollow = now; P.followers = r.followers; }
      if (sug) sug.forEach(function (u) { if (u.id === id) u.iFollow = now; });
      say(now ? L('You are now following this person.', 'Sasa unamfuata mtu huyu.') : L('You stopped following this person.', 'Umeacha kumfuata mtu huyu.'));
      var kind = openList; render();
      if (kind) { openList = ''; openUserList(kind); } // reload the open list so it stays accurate
    }).catch(function (err) { btn.disabled = false; say(err.message, true); });
  }

  /* ---------- wiring ---------- */
  document.addEventListener('mk:route', function (e) { if (e.detail && e.detail.view === 'profile') load(); });
  document.addEventListener('mk:auth', function () { if (profileId() !== undefined) load(); });
  I.apply();
  if (profileId() !== undefined) load();
})(window.__r.profile);
