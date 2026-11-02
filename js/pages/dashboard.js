/* Dashboard: stats, badge, adverts, notifications, listings, routes and quotes for the signed-in user.
   Loads fresh data whenever #/dashboard opens. Uses window.MK helpers (js/core.js). */
(function (root) {
  var MK = window.MK, esc = MK.esc, L = MK.L;
  function $(id) { return root.getElementById(id); }

  var SW = {
    addListing: 'Ongeza tangazo', myProfile: 'Wasifu wangu', logout: 'Toka',
    adsTitle: 'Matangazo na orodha zilizodhaminiwa',
    adsIntro: 'Timu yetu hukagua kila ombi na kuthibitisha maelezo na bei kabla halijaanza kuonekana.',
    createAdvert: 'Tengeneza tangazo', advTitle: 'Kichwa', advText: 'Maelezo (si lazima)',
    advLink: 'Kiungo (si lazima, kianze na https://)', sendRequest: 'Tuma ombi',
    sponsorTitle: 'Dhamini tangazo la bidhaa', sponsorHint: 'Orodha zilizodhaminiwa huonekana kwanza sokoni.',
    sponsorPick: 'Chagua moja ya orodha zako', myRequests: 'Maombi yangu',
    notifTitle: 'Arifa', markAll: 'Weka zote kuwa zimesomwa',
    myListings: 'Orodha zangu', addRoute: 'Ongeza njia', myRoutes: 'Njia zangu za usafiri',
    locTitle: 'Weka eneo langu', locText: 'Kuhifadhi mahali ulipo kunasaidia wanunuzi na wasafirishaji kukupata kwenye Ramani.',
    locBtn: 'Tumia eneo langu la sasa', openMap: 'Fungua Ramani',
    'a:overview': 'Muhtasari', 'p:linkPh': 'https://'
  };
  var T = MK.i18n(root, SW, function () { renderAll(); });

  var S = { token: 0, stats: null, badge: null, adverts: null, notifs: null, listings: null, routes: null, quotes: null, err: {}, badgeOpen: false };

  function say(text, isError) { var s = $('dashStatus'); s.textContent = text || ''; s.className = 'dash-status' + (text ? (isError ? ' err' : '') : ''); }
  function errText(e) { return (e && e.message) || L('Something went wrong.', 'Kuna hitilafu.'); }
  function active() { return (location.hash || '').indexOf('#/dashboard') === 0; }
  function svg(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    up: '<path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7"/>',
    down: '<path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>'
  };
  function pill(txt, cls) { return '<span class="pill ' + (cls || '') + '">' + txt + '</span>'; }
  function n(x) { return MK.num(Number(x || 0)); }

  var ROLE = { seller: ['Seller', 'Muuzaji'], transporter: ['Transporter', 'Msafirishaji'], buyer: ['Buyer', 'Mnunuzi'] };
  var PLAN = { free: ['Free', 'Bure'], biashara: ['Biashara', 'Biashara'], agribusiness: ['Agribusiness', 'Agribusiness'] };
  function roleOf() { return (S.stats && S.stats.role) || (MK.me && MK.me.role) || ''; }
  function planKey() { return String((S.stats && S.stats.plan) || (MK.me && MK.me.plan) || 'free').toLowerCase(); }
  function planName() { var p = PLAN[planKey()]; return p ? L(p[0], p[1]) : planKey(); }
  function limitOf() { return Number((S.stats && S.stats.imageLimit) || (MK.me && MK.me.imageLimit) || 0); }
  function isSeller() { return roleOf() === 'seller' || !!(S.listings && S.listings.length); }
  function isTransporter() { return roleOf() === 'transporter' || !!(S.routes && S.routes.length); }
  function loadErr(key, retry) { return '<p class="err-msg">' + esc(L('Could not load this section: ', 'Imeshindwa kupakia sehemu hii: ') + errText(S.err[key])) + '</p>'; }

  /* ---------------- header ---------------- */
  function renderHead() {
    var me = MK.me; if (!me) return;
    var first = String(me.fullName || '').trim().split(/\s+/)[0] || '';
    $('dashGreeting').textContent = L('Hello', 'Habari') + (first ? ', ' + first : '');
    var r = ROLE[roleOf()], bs = S.badge && S.badge.status;
    var verified = bs ? (bs === 'active' || bs === 'expiring') : !!(me.badge && me.badge.active);
    $('headPills').innerHTML =
      (r ? pill(esc(L(r[0], r[1]))) : '') +
      pill(esc(L('Plan: ', 'Mpango: ') + planName()), 'line') +
      (verified ? pill(MK.verified() + esc(L('Verified', 'Amethibitishwa')), 'line') : '');
    var pa = $('primaryAction'), role = roleOf();
    if (role === 'transporter') { pa.hidden = false; pa.setAttribute('href', '#/transporter-form'); $('primaryLabel').textContent = L('Add route', 'Ongeza njia'); }
    else if (role === 'seller') { pa.hidden = false; pa.setAttribute('href', '#/seller-form'); $('primaryLabel').textContent = L('Add listing', 'Ongeza tangazo'); }
    else pa.hidden = true;
  }

  /* ---------------- stats ---------------- */
  function stat(label, val) { return '<div class="stat"><span class="l">' + esc(label) + '</span><strong>' + val + '</strong></div>'; }
  function renderStats() {
    var el = $('stats');
    if (S.err.stats) { el.innerHTML = loadErr('stats'); return; }
    var s = S.stats; if (!s) return;
    var h = '';
    if (isSeller()) {
      var sl = s.seller;
      h += stat(L('Active listings', 'Orodha hai'), n(sl.listings.available + sl.listings.almostOut)) +
        stat(L('Views (last 7 days)', 'Mitazamo (siku 7)'), n(sl.views.last7)) +
        stat(L('Thumbs up', 'Vidole gumba juu'), n(sl.likes)) +
        stat(L('Thumbs down', 'Vidole gumba chini'), n(sl.dislikes)) +
        stat(L('Sold out', 'Zilizouzwa'), n(sl.listings.sold));
    }
    if (isTransporter()) {
      var t = s.transporter;
      h += stat(L('Routes', 'Njia'), n(t.routes)) + stat(L('Total capacity (kg)', 'Uwezo wote (kg)'), n(t.capacityKg)) +
        stat(L('Pending quote requests', 'Maombi ya bei yanayosubiri'), n(t.quotes.pending)) + stat(L('Quotes accepted', 'Bei zilizokubaliwa'), n(t.quotes.accepted));
    }
    h += stat(L('Followers', 'Wafuasi'), n(s.followers));
    h += stat(L('Rating', 'Ukadiriaji'), '<span class="rate">' + MK.stars(s.rating && s.rating.avg, s.rating && s.rating.count) + '</span>');
    el.innerHTML = h;
  }

  /* ---------------- chart ---------------- */
  function renderChart() {
    var c = $('chartCard');
    if (S.err.stats) { c.hidden = false; c.innerHTML = loadErr('stats'); return; }
    var s = S.stats; if (!s) return;
    var seller = roleOf() === 'seller' || (roleOf() !== 'transporter' && isSeller());
    var trans = !seller && isTransporter();
    if (!seller && !trans) { c.hidden = true; return; }
    c.hidden = false;
    var series = seller ? s.seller.views.series : s.transporter.quotes.series;
    var title = seller ? L('Listing views, last 14 days', 'Mitazamo ya orodha, siku 14 zilizopita') : L('Quote requests, last 14 days', 'Maombi ya bei, siku 14 zilizopita');
    var unit = seller ? L('views', 'mitazamo') : L('requests', 'maombi');
    var total = series.reduce(function (a, p) { return a + Number(p.count || 0); }, 0);
    var max = Math.max.apply(null, series.map(function (p) { return Number(p.count || 0); }).concat([1]));
    var bars = series.map(function (p) {
      var v = Number(p.count || 0);
      return '<div class="bar' + (v ? '' : ' z') + '" title="' + esc(MK.fmtDate(p.date) + ': ' + v) + '"><i style="height:' + (v ? Math.max(4, Math.round(v / max * 100)) : 0) + '%"></i></div>';
    }).join('');
    var rows = series.map(function (p) { return '<tr><td>' + esc(MK.fmtDate(p.date)) + '</td><td>' + Number(p.count || 0) + '</td></tr>'; }).join('');
    c.innerHTML = '<h2>' + esc(title) + '</h2><p class="sub">' + esc(L('Total: ', 'Jumla: ') + total + ' ' + unit) + '</p>' +
      '<div class="bars" role="img" aria-label="' + esc(title + '. ' + L('Total: ', 'Jumla: ') + total + ' ' + unit) + '">' + bars + '</div>' +
      '<div class="axis" aria-hidden="true"><span>' + esc(MK.fmtDate(series[0].date)) + '</span><span>' + esc(MK.fmtDate(series[series.length - 1].date)) + '</span></div>' +
      (total ? '' : '<p class="chart-empty">' + esc(seller ? L('No views yet. They appear here once buyers open your listings.', 'Bado hakuna mitazamo. Itaonekana hapa wanunuzi wakifungua orodha zako.') : L('No quote requests yet. They appear here when someone asks for a quote on your routes.', 'Bado hakuna maombi ya bei. Yataonekana hapa mtu akiomba bei kwenye njia zako.')) + '</p>') +
      '<table class="sr-only"><caption>' + esc(title) + '</caption><thead><tr><th>' + esc(L('Date', 'Tarehe')) + '</th><th>' + esc(unit) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    if (seller) c.innerHTML += topListings();
  }
  function topListings() {
    var top = (S.stats.seller.top || []);
    var h = '<h3 class="sub-h">' + esc(L('Top listings', 'Orodha bora')) + '</h3>';
    if (!top.length) return h + '<p class="empty">' + esc(L('You have no listings yet.', 'Bado huna orodha.')) + '</p>';
    return h + '<div class="rows">' + top.map(function (t) {
      return '<div class="row-item"><div><a class="t" href="#/listing/' + Number(t.id) + '">' + esc(t.title) + '</a><div>' + MK.statusPill(t.status) + '</div></div>' +
        '<div class="mini"><span class="ic" aria-label="' + esc(L('Views', 'Mitazamo')) + '">' + svg(IC.eye) + n(t.views) + '</span><span class="ic" aria-label="' + esc(L('Thumbs up', 'Vidole gumba juu')) + '">' + svg(IC.up) + n(t.likes) + '</span><span class="ic" aria-label="' + esc(L('Thumbs down', 'Vidole gumba chini')) + '">' + svg(IC.down) + n(t.dislikes) + '</span></div></div>';
    }).join('') + '</div>';
  }

  /* ---------------- blue badge ---------------- */
  function renderBadge() {
    var c = $('badgeCard');
    if (S.err.badge) { c.innerHTML = loadErr('badge'); return; }
    var b = S.badge; if (!b) return;
    var st = b.status, price = L('KSh 2,000 every 6 months', 'KSh 2,000 kila miezi 6');
    var msg = '', btn = '';
    if (st === 'none') { msg = esc(L('Show buyers you are a trusted, verified seller or transporter.', 'Waonyeshe wanunuzi kuwa wewe ni muuzaji au msafirishaji unayeaminika.')); btn = L('Get blue badge', 'Pata beji ya buluu'); }
    else if (st === 'pending') msg = '<b>' + esc(L('Request received, our team will contact you to arrange the visit.', 'Ombi limepokelewa, timu yetu itakupigia kupanga ziara.')) + '</b>';
    else if (st === 'active' || st === 'expiring') {
      msg = '<b>' + esc(L('Valid until ', 'Inatumika hadi ') + MK.fmtDate(b.until)) + '</b> ' + esc('(' + L(b.daysLeft + ' days left', 'siku ' + b.daysLeft + ' zimebaki') + ')');
      if (st === 'expiring') { msg += '<br>' + esc(L('It ends soon. Renew to keep your badge.', 'Inaisha hivi karibuni. Fanya upya ili uendelee kuwa nayo.')); btn = L('Renew blue badge', 'Fanya upya beji ya buluu'); }
    } else if (st === 'expired') { msg = '<b>' + esc(L('Your badge ended on ', 'Beji yako iliisha tarehe ') + MK.fmtDate(b.until)) + '</b>'; btn = L('Renew blue badge', 'Fanya upya beji ya buluu'); }
    else if (st === 'rejected') {
      msg = '<b>' + esc(L('Your last request was not approved.', 'Ombi lako la mwisho halikuidhinishwa.')) + '</b>' + (b.request && b.request.note ? '<br>' + esc(L('Reason: ', 'Sababu: ') + b.request.note) : '');
      btn = L('Try again', 'Jaribu tena');
    }
    c.innerHTML = '<h2>' + esc(L('Blue badge', 'Beji ya buluu')) + '</h2>' +
      '<div class="badge-box" style="margin-top:14px"><div class="badge-ico">' + MK.verified() + '</div><div class="badge-body">' +
      '<p><b>' + esc(price) + '</b></p><p>' + msg + '</p>' +
      '<p class="fine">' + esc(L('Our team visits you in person and confirms payment. Paying alone does not grant the badge.', 'Timu yetu inakutembelea ana kwa ana na kuthibitisha malipo. Kulipa pekee hakutoi beji.')) + '</p>' +
      (btn && b.canRequest ? '<button class="btn primary" type="button" data-act="badge-open" aria-expanded="' + S.badgeOpen + '">' + esc(btn) + '</button>' : '') +
      '</div></div>' +
      (b.canRequest ? '<form class="form-in" id="badgeForm" ' + (S.badgeOpen ? '' : 'hidden') + '><label><span>' + esc(L('M-Pesa payment reference (optional)', 'Namba ya malipo ya M-Pesa (si lazima)')) + '</span><input name="paymentRef" maxlength="40" autocomplete="off"></label>' +
        '<div class="lc-actions"><button class="btn primary" type="submit">' + esc(L('Send request', 'Tuma ombi')) + '</button><button class="btn outline" type="button" data-act="badge-close">' + esc(L('Cancel', 'Ghairi')) + '</button></div></form>' : '');
  }

  /* ---------------- adverts ---------------- */
  var AD_ST = { pending: ['Pending review', 'Inasubiri ukaguzi'], active: ['Active', 'Linaonekana'], rejected: ['Rejected', 'Limekataliwa'], ended: ['Ended', 'Limeisha'] };
  function renderAdverts() {
    var sel = $('sponsorSelect'), btn = $('sponsorBtn');
    var ls = (S.listings || []).filter(function (l) { return l.status === 'available' || l.status === 'almost_out'; });
    var prev = sel.value;
    sel.innerHTML = ls.length ? ls.map(function (l) { return '<option value="' + Number(l.id) + '">' + esc(l.title) + '</option>'; }).join('') : '<option value="">' + esc(L('No available listings', 'Hakuna orodha zinazopatikana')) + '</option>';
    if (prev) sel.value = prev;
    sel.disabled = btn.disabled = !ls.length;
    var el = $('advertList');
    if (S.err.adverts) { el.innerHTML = loadErr('adverts'); return; }
    var a = S.adverts; if (!a) return;
    if (!a.length) { el.innerHTML = '<p class="empty">' + esc(L('No requests yet.', 'Bado hakuna maombi.')) + '</p>'; return; }
    el.innerHTML = '<div class="rows">' + a.map(function (x) {
      var st = AD_ST[x.status] || [x.status, x.status];
      var kind = x.kind === 'sponsored' ? L('Sponsored listing', 'Orodha iliyodhaminiwa') + (x.listing_title ? ': ' + x.listing_title : '') : L('Advert', 'Tangazo');
      var dates = x.starts_at ? MK.fmtDate(x.starts_at) + (x.ends_at ? ' - ' + MK.fmtDate(x.ends_at) : '') : L('Requested ', 'Imeombwa ') + MK.fmtDate(x.created_at);
      return '<div class="row-item" data-id="' + Number(x.id) + '"><div><span class="t">' + esc(x.title) + '</span><div class="m">' + esc(kind) + '</div><div class="m">' + esc(dates) + '</div>' +
        (x.admin_note ? '<div class="m">' + esc(L('Note from our team: ', 'Ujumbe kutoka kwa timu yetu: ') + x.admin_note) + '</div>' : '') + '</div>' +
        '<div class="mini"><span class="sp sp-' + esc(x.status) + '">' + esc(L(st[0], st[1])) + '</span>' +
        '<span>' + esc(L('Impressions ', 'Mionekano ') + n(x.impressions)) + '</span><span>' + esc(L('Clicks ', 'Mibofyo ') + n(x.clicks)) + '</span>' +
        (x.status !== 'active' ? '<button class="btn small danger" type="button" data-act="del-advert">' + esc(L('Delete', 'Futa')) + '</button>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------------- notifications ---------------- */
  function renderNotifs() {
    var el = $('notifList');
    if (S.err.notifs) { el.innerHTML = loadErr('notifs'); return; }
    var items = S.notifs; if (!items) return;
    $('markAll').hidden = !items.some(function (i) { return !i.read; });
    if (!items.length) { el.innerHTML = '<p class="empty">' + esc(L('Nothing yet. You will see views, thumbs, new followers, ratings, quote requests and updates on your badge and adverts here.', 'Bado hakuna kitu. Utaona hapa mitazamo, vidole gumba, wafuasi wapya, ukadiriaji, maombi ya bei na taarifa za beji na matangazo yako.')) + '</p>'; return; }
    el.innerHTML = '<ul class="nlist">' + items.map(function (i) {
      return '<li><button class="nitem' + (i.read ? '' : ' unread') + '" type="button" data-act="notif" data-id="' + Number(i.id) + '" data-link="' + esc(i.link || '') + '"><span class="ni">' + MK.notifIcon(i.type) + '</span>' +
        '<span style="flex:1;min-width:0"><span class="nt">' + esc(MK.notifText(i)) + '</span><span class="nw">' + esc(MK.ago(i.createdAt)) + (i.read ? '' : ' · ' + esc(L('New', 'Mpya'))) + '</span></span>' + (i.read ? '' : '<span class="dot" aria-hidden="true"></span>') + '</button></li>';
    }).join('') + '</ul>';
  }

  /* ---------------- listings ---------------- */
  var STATUS_OPTS = [['available', 'Available', 'Inapatikana'], ['almost_out', 'Almost out', 'Karibu kuisha'], ['paused', 'Paused', 'Imesimamishwa'], ['sold', 'Sold out', 'Imeuzwa']];
  function renderListings() {
    var card = $('listingsCard'), el = $('listingGrid');
    if (S.err.listings) { card.hidden = false; el.innerHTML = loadErr('listings'); return; }
    var rows = S.listings; if (!rows) return;
    card.hidden = !(roleOf() === 'seller' || rows.length);
    var limit = limitOf();
    el.innerHTML = rows.length ? rows.map(function (l) {
      var thumb = l.image_id ? '<img src="/api/listing-images/' + Number(l.image_id) + '" alt="" loading="lazy">' : svg(IC.img);
      return '<article class="listing-card" data-id="' + Number(l.id) + '"><div class="lc-top"><div class="thumb-img">' + thumb + '</div><div class="lc-info">' +
        '<h3>' + esc(l.title) + '</h3><div class="price">' + esc(MK.money(l.price_per_kg)) + ' <small>/ ' + esc(l.unit || 'kg') + '</small></div>' +
        '<div class="fine">' + esc(n(l.quantity_kg) + ' kg') + '</div></div></div>' +
        '<div class="lc-line">' + MK.statusPill(l.status) + (l.sponsored ? '<span class="tag">' + esc(L('Sponsored', 'Imedhaminiwa')) + '</span>' : '') +
        '<span class="mini"><span class="ic" aria-label="' + esc(L('Views', 'Mitazamo')) + '">' + svg(IC.eye) + n(l.views) + '</span><span class="ic" aria-label="' + esc(L('Thumbs up', 'Vidole gumba juu')) + '">' + svg(IC.up) + n(l.likes) + '</span><span class="ic" aria-label="' + esc(L('Thumbs down', 'Vidole gumba chini')) + '">' + svg(IC.down) + n(l.dislikes) + '</span>' +
        '<span class="ic" aria-label="' + esc(L('Photos', 'Picha')) + '">' + svg(IC.cam) + n(l.image_count) + (limit ? ' / ' + limit : '') + ' ' + esc(L('photos', 'picha')) + '</span></span></div>' +
        '<div class="lc-actions"><label class="sr-only" for="st' + Number(l.id) + '">' + esc(L('Status', 'Hali')) + '</label><select id="st' + Number(l.id) + '" data-act="status">' +
        STATUS_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === l.status ? ' selected' : '') + '>' + esc(L(o[1], o[2])) + '</option>'; }).join('') + '</select>' +
        '<a class="btn small outline" href="#/seller-form/' + Number(l.id) + '">' + esc(L('Edit', 'Hariri')) + '</a>' +
        '<a class="btn small outline" href="#/listing/' + Number(l.id) + '">' + esc(L('View', 'Tazama')) + '</a>' +
        '<button class="btn small danger" type="button" data-act="del-listing">' + esc(L('Delete', 'Futa')) + '</button></div>' +
        '<div class="slot"></div></article>';
    }).join('') : '<p class="empty">' + esc(L('You have no listings yet. Add your first one so buyers can find you.', 'Bado huna orodha. Ongeza ya kwanza ili wanunuzi wakupate.')) + '</p>';
  }

  /* ---------------- routes and quotes ---------------- */
  function renderRoutes() {
    var card = $('routesCard'), el = $('routeGrid'), q = S.quotes;
    var showRoutes = roleOf() === 'transporter' || !!(S.routes && S.routes.length);
    var hasQ = q && (q.received.length || q.sent.length);
    card.hidden = !(showRoutes || hasQ);
    $('routesHead').hidden = el.hidden = !showRoutes;
    if (S.err.routes) { el.hidden = false; el.innerHTML = loadErr('routes'); }
    else if (S.routes) {
      el.innerHTML = S.routes.length ? S.routes.map(function (r) {
        return '<article class="listing-card" data-id="' + Number(r.id) + '"><div class="lc-info"><h3>' + esc(r.route_name) + '</h3>' +
          '<div class="fine">' + esc(r.origin) + ' → ' + esc(r.destination) + '</div></div>' +
          '<div class="lc-line"><span class="fine">' + esc((r.vehicle || '-') + ' · ' + L('Capacity ', 'Uwezo ') + n(r.capacity_kg) + ' kg') + '</span></div>' +
          '<div class="price">' + esc(MK.money(r.rate)) + ' <small>/ km</small></div>' +
          '<div class="lc-actions"><a class="btn small outline" href="#/transporter-form/' + Number(r.id) + '">' + esc(L('Edit', 'Hariri')) + '</a>' +
          '<button class="btn small danger" type="button" data-act="del-route">' + esc(L('Delete', 'Futa')) + '</button></div></article>';
      }).join('') : '<p class="empty">' + esc(L('You have no routes yet. Add the routes you drive so sellers can ask for quotes.', 'Bado huna njia. Ongeza njia unazoendesha ili wauzaji waombe bei.')) + '</p>';
    }
    var qe = $('quotes');
    if (S.err.quotes) { qe.innerHTML = loadErr('quotes'); return; }
    if (!q) return;
    var h = '';
    if (showRoutes || q.received.length) {
      h += '<h3 class="sub-h">' + esc(L('Quote requests', 'Maombi ya bei')) + '</h3>' + (q.received.length ? q.received.map(function (x) {
        return '<div class="q-item" data-id="' + Number(x.id) + '"><p><b>' + esc(x.requester_name) + '</b>' + (x.requester_phone ? ' · <a href="tel:' + esc(String(x.requester_phone).replace(/[^\d+]/g, '')) + '">' + esc(x.requester_phone) + '</a>' : '') + ' <span class="sp sp-' + esc(x.status) + '">' + esc(qStatus(x.status)) + '</span></p>' +
          '<p class="fine">' + esc(n(x.load_kg) + ' kg · ' + (x.pickup || '-') + ' → ' + (x.destination || '-') + (x.route_name ? ' · ' + x.route_name : '')) + '</p>' +
          (x.message ? '<p>' + esc(x.message) + '</p>' : '') +
          (x.status === 'pending' ? '<div class="lc-actions"><button class="btn small primary" type="button" data-act="quote-accept">' + esc(L('Accept', 'Kubali')) + '</button><button class="btn small outline" type="button" data-act="quote-decline">' + esc(L('Decline', 'Kataa')) + '</button></div>' : '') + '</div>';
      }).join('') : '<p class="empty">' + esc(L('No quote requests yet.', 'Bado hakuna maombi ya bei.')) + '</p>');
    }
    if (q.sent.length || showRoutes) {
      h += '<h3 class="sub-h">' + esc(L('Requests I sent', 'Maombi niliyotuma')) + '</h3>' + (q.sent.length ? q.sent.map(function (x) {
        return '<div class="q-item"><p><b>' + esc(x.transporter_name) + '</b>' + (x.route_name ? ' · ' + esc(x.route_name) : '') + ' <span class="sp sp-' + esc(x.status) + '">' + esc(qStatus(x.status)) + '</span></p>' +
          '<p class="fine">' + esc(n(x.load_kg) + ' kg · ' + (x.pickup || '-') + ' → ' + (x.destination || '-')) + '</p>' +
          (x.status === 'accepted' && x.transporter_phone ? '<p>' + esc(L('Call the transporter: ', 'Mpigie msafirishaji: ')) + '<a href="tel:' + esc(String(x.transporter_phone).replace(/[^\d+]/g, '')) + '"><b>' + esc(x.transporter_phone) + '</b></a></p>' : '') + '</div>';
      }).join('') : '<p class="empty">' + esc(L('You have not asked for any quotes.', 'Hujaomba bei yoyote.')) + '</p>');
    }
    qe.innerHTML = h;
  }
  function qStatus(s) { return s === 'accepted' ? L('Accepted', 'Imekubaliwa') : s === 'declined' ? L('Declined', 'Imekataliwa') : L('Pending', 'Inasubiri'); }

  /* ---------------- plan ---------------- */
  function renderPlan() {
    var lim = limitOf();
    $('planCard').innerHTML = '<h2>' + esc(L('Your plan: ', 'Mpango wako: ') + planName()) + '</h2><p class="sub">' +
      esc(L('Up to ' + lim + ' photos per listing.', 'Hadi picha ' + lim + ' kwa kila tangazo.')) + ' ' +
      esc(L('Contact us to upgrade. Our team changes plans; there is no online payment yet.', 'Wasiliana nasi ili kupandisha mpango. Timu yetu hubadilisha mipango; bado hakuna malipo mtandaoni.')) +
      '</p><a class="link" href="#/home/pricing">' + esc(L('See plans and pricing', 'Tazama mipango na bei')) + '</a>';
  }

  function renderAll() {
    if (!MK.me) return;
    renderHead(); renderStats(); renderChart(); renderBadge(); renderAdverts(); renderNotifs(); renderListings(); renderRoutes(); renderPlan();
  }

  /* ---------------- loading ---------------- */
  function load(quiet) {
    if (!MK.me) return;
    var tok = ++S.token;
    if (!quiet) {
      $('stats').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
      ['chartCard', 'badgeCard'].forEach(function (id) { $(id).hidden = false; $(id).innerHTML = '<div class="skel tall"></div>'; });
      ['notifList', 'listingGrid', 'routeGrid'].forEach(function (id) { $(id).innerHTML = '<div class="skel"></div>'; });
      renderHead();
    }
    var keys = ['stats', 'badge', 'adverts', 'notifs', 'listings', 'routes', 'quotes'];
    var calls = [
      MK.api('GET', '/api/dashboard/stats'), MK.api('GET', '/api/badge/me'), MK.api('GET', '/api/adverts/me'),
      MK.api('GET', '/api/notifications?limit=30'), MK.api('GET', '/api/listings'), MK.api('GET', '/api/routes'), MK.api('GET', '/api/quote-requests/me')
    ];
    return Promise.allSettled(calls).then(function (res) {
      if (tok !== S.token) return;
      S.err = {};
      res.forEach(function (r, i) {
        var k = keys[i];
        if (r.status === 'rejected') { S.err[k] = r.reason; return; }
        var d = r.value;
        S[k] = k === 'adverts' ? (d.adverts || []) : k === 'notifs' ? (d.items || []) : d;
      });
      renderAll();
    });
  }

  /* ---------------- actions ---------------- */
  function cardId(el) { var c = el.closest('[data-id]'); return c ? c.dataset.id : null; }
  function twoStep(btn, label) {
    if (btn.dataset.confirm === '1') return true;
    btn.dataset.confirm = '1'; btn.textContent = L('Tap again to confirm', 'Gusa tena kuthibitisha');
    setTimeout(function () { if (btn.isConnected) { btn.dataset.confirm = ''; btn.textContent = label; } }, 4000);
    return false;
  }
  function fail(e) { say(errText(e), true); }

  root.addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-act="status"]'); if (!sel) return;
    var card = sel.closest('.listing-card'), id = cardId(sel);
    if (sel.value === 'sold') {
      var prev = (S.listings.filter(function (l) { return String(l.id) === id; })[0] || {}).status || 'available';
      sel.value = prev;
      var slot = card.querySelector('.slot');
      slot.innerHTML = '<div class="confirm" role="alertdialog" aria-label="' + esc(L('Confirm sold out', 'Thibitisha imeuzwa')) + '"><p>' + esc(L('Mark this listing as sold out? It will be removed from the marketplace and cannot be undone.', 'Weka tangazo hili kuwa limeuzwa? Litaondolewa sokoni na haliwezi kurudishwa.')) + '</p>' +
        '<div class="lc-actions"><button class="btn small danger" type="button" data-act="sold-yes">' + esc(L('Yes, sold out and remove', 'Ndiyo, imeuzwa na iondolewe')) + '</button><button class="btn small outline" type="button" data-act="sold-no">' + esc(L('Cancel', 'Ghairi')) + '</button></div></div>';
      slot.querySelector('[data-act="sold-no"]').focus();
      return;
    }
    MK.api('PATCH', '/api/listings/' + encodeURIComponent(id) + '/status', { status: sel.value })
      .then(function () { say(L('Status updated.', 'Hali imesasishwa.')); load(true); }).catch(fail);
  });

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.dataset.act, id = cardId(t);
    if (act === 'sold-no') { t.closest('.slot').innerHTML = ''; return; }
    if (act === 'sold-yes') {
      t.disabled = true;
      MK.api('PATCH', '/api/listings/' + encodeURIComponent(id) + '/status', { status: 'sold' }).then(function (r) {
        say(r && r.deleted ? L('Marked sold out and removed.', 'Imewekwa kuwa imeuzwa na kuondolewa.') : L('Status updated.', 'Hali imesasishwa.'));
        var c = t.closest('.listing-card'); if (c) c.remove();
        load(true);
      }).catch(function (err) { t.disabled = false; fail(err); });
      return;
    }
    if (act === 'del-listing' || act === 'del-route' || act === 'del-advert') {
      if (!twoStep(t, L('Delete', 'Futa'))) return;
      var url = act === 'del-listing' ? '/api/listings/' : act === 'del-route' ? '/api/routes/' : '/api/adverts/';
      MK.api('DELETE', url + encodeURIComponent(id)).then(function () { say(L('Deleted.', 'Imefutwa.')); load(true); }).catch(fail);
      return;
    }
    if (act === 'quote-accept' || act === 'quote-decline') {
      MK.api('PATCH', '/api/quote-requests/' + encodeURIComponent(id), { status: act === 'quote-accept' ? 'accepted' : 'declined' })
        .then(function () { say(L('Response sent.', 'Jibu limetumwa.')); load(true); }).catch(fail);
      return;
    }
    if (act === 'badge-open') { S.badgeOpen = true; var f = $('badgeForm'); f.hidden = false; t.setAttribute('aria-expanded', 'true'); f.querySelector('input').focus(); return; }
    if (act === 'badge-close') { S.badgeOpen = false; $('badgeForm').hidden = true; return; }
    if (act === 'notif') {
      var link = t.dataset.link, nid = Number(t.dataset.id);
      MK.api('POST', '/api/notifications/read', { ids: [nid] }).catch(function () {}).then(function () {
        S.notifs.forEach(function (i) { if (i.id === nid) i.read = true; });
        renderNotifs(); MK.refreshSession();
        if (/^#\/[\w\-\/]*$/.test(link) && link !== '#/dashboard') location.hash = link;
      });
    }
  });

  root.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    var btn = f.querySelector('button[type="submit"]');
    function done() { if (btn) btn.disabled = false; }
    if (btn) btn.disabled = true;
    if (f.id === 'badgeForm') {
      MK.api('POST', '/api/badge/request', { paymentRef: f.paymentRef.value.trim() }).then(function () {
        S.badgeOpen = false; say(L('Request received. Our team will contact you to arrange the visit.', 'Ombi limepokelewa. Timu yetu itakupigia kupanga ziara.')); load(true);
      }).catch(fail).then(done);
    } else if (f.id === 'advertForm') {
      var title = f.title.value.trim(), link = f.linkUrl.value.trim();
      if (!title) { say(L('Give your advert a title.', 'Weka kichwa cha tangazo.'), true); f.title.focus(); return done(); }
      if (link && !/^https:\/\//i.test(link)) { say(L('The link must start with https://', 'Kiungo lazima kianze na https://'), true); f.linkUrl.focus(); return done(); }
      MK.api('POST', '/api/adverts', { kind: 'advert', title: title, body: f.body.value.trim(), linkUrl: link }).then(function () {
        f.reset(); say(L('Advert sent. Our team will review it and confirm details and price.', 'Tangazo limetumwa. Timu yetu italikagua na kuthibitisha maelezo na bei.')); load(true);
      }).catch(fail).then(done);
    } else if (f.id === 'sponsorForm') {
      if (!f.listingId.value) { say(L('Choose a listing first.', 'Chagua orodha kwanza.'), true); return done(); }
      MK.api('POST', '/api/adverts', { kind: 'sponsored', listingId: Number(f.listingId.value) }).then(function () {
        say(L('Sponsorship request sent. Our team will confirm details and price.', 'Ombi la udhamini limetumwa. Timu yetu itathibitisha maelezo na bei.')); load(true);
      }).catch(fail).then(done);
    } else done();
  });

  $('markAll').addEventListener('click', function () {
    MK.api('POST', '/api/notifications/read', {}).then(function () {
      (S.notifs || []).forEach(function (i) { i.read = true; }); renderNotifs(); MK.refreshSession();
    }).catch(fail);
  });

  $('logoutBtn').addEventListener('click', function () {
    MK.api('POST', '/api/logout', null, { quiet: true }).catch(function () {}).then(function () {
      MK.refreshSession(); location.hash = '#/login';
    });
  });

  $('locBtn').addEventListener('click', function () {
    var b = this;
    if (!navigator.geolocation) { say(L('Your device cannot share its location.', 'Kifaa chako hakiwezi kushiriki eneo.'), true); return; }
    b.disabled = true; say(L('Finding your location...', 'Inatafuta eneo lako...'));
    navigator.geolocation.getCurrentPosition(function (p) {
      MK.api('POST', '/api/users/location', { lat: p.coords.latitude, lng: p.coords.longitude, name: (MK.me && MK.me.location) || '' })
        .then(function () { say(L('Location saved. Buyers and transporters can now find you on the Map.', 'Eneo limehifadhiwa. Wanunuzi na wasafirishaji sasa wanaweza kukupata kwenye Ramani.')); })
        .catch(fail).then(function () { b.disabled = false; });
    }, function (err) {
      b.disabled = false;
      say(err && err.code === 1 ? L('Location access was denied. You can allow it in your browser settings and try again.', 'Ruhusa ya eneo imekataliwa. Unaweza kuiruhusu kwenye mipangilio ya kivinjari na ujaribu tena.') : L('We could not find your location. Try again.', 'Hatukuweza kupata eneo lako. Jaribu tena.'), true);
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  });

  /* ---------------- events ---------------- */
  document.addEventListener('mk:route', function (e) { if (e.detail && e.detail.view === 'dashboard') { say(''); S.badgeOpen = false; load(); } });
  document.addEventListener('mk:auth', function () { if (active() && MK.me) load(); });
  document.addEventListener('mk:notifications-read', function () {
    if (!active()) return;
    MK.api('GET', '/api/notifications?limit=30').then(function (d) { S.notifs = d.items || []; S.err.notifs = null; renderNotifs(); }).catch(function () {});
  });
  T.apply();
  if (active() && MK.me) load();
})(window.__r.dashboard);
