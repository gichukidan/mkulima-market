/* Map view: OpenStreetMap (Leaflet) with real sellers, buyers and transporters from /api/map/data.
   Runs inside a shadow root passed in as `root`. Language: the shell clicks the hidden #lg button after it sets <html lang>. */
(function (root) {
  var MK = window.MK, TOWNS = (window.MKDATA && window.MKDATA.towns) || [];
  var $ = function (i) { return root.getElementById(i); };

  var D = {
    en: {
      h1: 'Map', gps: 'Use my location', town: 'Town', townA: 'Town', save: 'Save this point as my location', legend: 'Legend', mapA: 'Interactive map',
      lgRoute: 'Transporter route', mapH: 'Discover what is near you',
      mapNote: 'Tap or click the map to set a point. Locations are approximate (about 1 km) to protect privacy, and distances are straight-line, not by road.',
      hint: 'Share your location so buyers and transporters can find you',
      f1h: 'Nearby', f1p: 'See sellers, buyers and transporters around you, and what is on offer.',
      f2h: 'Distance', f2p: 'Pick a search radius and see the straight-line distance to each place.',
      f3h: 'Transport', f3p: 'Find a transporter by route and vehicle, then request a quote.',
      trH: 'Transporters', trP: 'Search transporters by name, route, vehicle or town, then ask for a quote for your load.',
      search: 'Search', trSearch: 'Search transporter, route, vehicle or town', vehicle: 'Vehicle',
      foot: 'Positions on this map are approximate (about 1 km). Distances are straight lines; real road distance and travel time will be longer. Map data (c) OpenStreetMap contributors.',
      leadG: 'Find sellers, buyers and transporters near you on a real map. Log in and share your location to appear on it.',
      leadS: 'See who is buying near you and which transporters can move your produce. Share your location so buyers and transporters can find your listings.',
      leadB: 'Find sellers and their produce near you, and transporters who can deliver it. Share your location to be found by sellers.',
      leadT: 'Show buyers and sellers where you work. Share your location, add your routes, and receive quote requests.',
      roleS: 'Seller', roleB: 'Buyer', roleT: 'Transporter', sellers: 'Sellers', buyers: 'Buyers', transporters: 'Transporters',
      setAs: 'Distances measured from: ', myLoc: 'My location', chosen: 'Chosen point', radius: 'Search radius', km: 'km',
      cnt: '{n} within {r} km (straight-line)', none: 'Nothing within {r} km. Try a larger radius or another town.',
      emptyAll: 'No sellers or transporters on the map yet. Be the first: share your location.', emptyAllB: 'Use my location',
      line: 'straight-line', dir: 'Directions on OpenStreetMap', profile: 'View profile', listing: 'Open listing',
      perKg: '/kg', from: 'From', to: 'to', cap: 'Capacity', rateKm: '/km', days: 'Days', anyDay: 'Days not stated',
      listings: 'Listings', routes: 'Routes', noListings: 'No active listings', noRoutes: 'No routes added yet',
      denied: 'Location unavailable or permission declined. Choose a town or tap the map instead.',
      noGeo: 'This device cannot share its location. Choose a town or tap the map instead.',
      locating: 'Finding your location...', locSaved: 'Your location was saved.', locSaveFail: 'Could not save your location: ',
      saved: 'Your saved location', loadErr: 'Could not load the map data. ', retry: 'Try again',
      mapFail: 'The interactive map could not be loaded. The list next to it still works.',
      tileFail: 'Map tiles could not be loaded (check your connection). Markers and the list still work.',
      allV: 'All vehicles', noTr: 'No transporter routes match your search.', noTrAll: 'No transporter routes have been added yet.',
      quote: 'Request a quote', quoteClose: 'Close', login: 'Log in to request a quote', own: 'This is your own route',
      load: 'Load (kg)', pickup: 'Pickup', dest: 'Destination', msg: 'Message (optional)', msgP: 'Anything the transporter should know',
      send: 'Send request', sending: 'Sending...', sentOk: 'Request sent. The transporter has been notified.',
      badLoad: 'Enter a load greater than 0 kg.', dupe: 'You already have a pending request for this route.', mine: 'This is your own route.',
      indic: 'Indicative cost', indicNote: 'indicative, straight-line', away: 'from your point', trRoutes: 'Route',
      popDist: 'Distance', noRating: 'No ratings yet', demo: ''
    },
    sw: {
      h1: 'Ramani', gps: 'Tumia eneo langu', town: 'Mji', townA: 'Mji', save: 'Hifadhi eneo hili kama eneo langu', legend: 'Maelezo ya alama', mapA: 'Ramani shirikishi',
      lgRoute: 'Njia ya msafirishaji', mapH: 'Gundua kilicho karibu nawe',
      mapNote: 'Gusa au bofya ramani kuweka eneo. Maeneo ni ya makadirio (takriban km 1) kulinda faragha, na umbali ni wa mstari ulionyooka, si wa barabara.',
      hint: 'Shiriki eneo lako ili wanunuzi na wasafirishaji wakupate',
      f1h: 'Karibu nawe', f1p: 'Ona wauzaji, wanunuzi na wasafirishaji wanaokuzunguka, na kinachouzwa.',
      f2h: 'Umbali', f2p: 'Chagua eneo la utafutaji kisha ona umbali wa mstari ulionyooka hadi kila mahali.',
      f3h: 'Usafiri', f3p: 'Tafuta msafirishaji kwa njia na aina ya gari, kisha omba bei.',
      trH: 'Wasafirishaji', trP: 'Tafuta wasafirishaji kwa jina, njia, gari au mji, kisha omba bei ya mzigo wako.',
      search: 'Tafuta', trSearch: 'Tafuta msafirishaji, njia, gari au mji', vehicle: 'Gari',
      foot: 'Maeneo kwenye ramani hii ni ya makadirio (takriban km 1). Umbali ni wa mstari ulionyooka; umbali halisi wa barabara na muda wa safari utakuwa mkubwa zaidi. Data ya ramani (c) wachangiaji wa OpenStreetMap.',
      leadG: 'Pata wauzaji, wanunuzi na wasafirishaji karibu nawe kwenye ramani halisi. Ingia na ushiriki eneo lako ili uonekane.',
      leadS: 'Ona wanaonunua karibu nawe na wasafirishaji wanaoweza kusafirisha mazao yako. Shiriki eneo lako ili wanunuzi na wasafirishaji wapate matangazo yako.',
      leadB: 'Pata wauzaji na mazao yao karibu nawe, na wasafirishaji wanaoweza kuyaleta. Shiriki eneo lako ili wauzaji wakupate.',
      leadT: 'Waonyeshe wanunuzi na wauzaji unapofanyia kazi. Shiriki eneo lako, ongeza njia zako, na upokee maombi ya bei.',
      roleS: 'Muuzaji', roleB: 'Mnunuzi', roleT: 'Msafirishaji', sellers: 'Wauzaji', buyers: 'Wanunuzi', transporters: 'Wasafirishaji',
      setAs: 'Umbali unapimwa kutoka: ', myLoc: 'Eneo langu', chosen: 'Eneo ulilochagua', radius: 'Eneo la utafutaji', km: 'km',
      cnt: '{n} ndani ya km {r} (mstari ulionyooka)', none: 'Hakuna kitu ndani ya km {r}. Jaribu eneo kubwa zaidi au mji mwingine.',
      emptyAll: 'Bado hakuna wauzaji wala wasafirishaji kwenye ramani. Kuwa wa kwanza: shiriki eneo lako.', emptyAllB: 'Tumia eneo langu',
      line: 'mstari ulionyooka', dir: 'Maelekezo kwenye OpenStreetMap', profile: 'Ona wasifu', listing: 'Fungua tangazo',
      perKg: '/kg', from: 'Kutoka', to: 'hadi', cap: 'Uwezo', rateKm: '/km', days: 'Siku', anyDay: 'Siku hazijatajwa',
      listings: 'Matangazo', routes: 'Njia', noListings: 'Hakuna matangazo yanayoendelea', noRoutes: 'Bado hajaongeza njia',
      denied: 'Eneo halipatikani au ruhusa imekataliwa. Chagua mji au gusa ramani.',
      noGeo: 'Kifaa hiki hakiwezi kushiriki eneo. Chagua mji au gusa ramani.',
      locating: 'Inatafuta eneo lako...', locSaved: 'Eneo lako limehifadhiwa.', locSaveFail: 'Eneo lako halikuhifadhiwa: ',
      saved: 'Eneo lako lililohifadhiwa', loadErr: 'Data ya ramani haikupakiwa. ', retry: 'Jaribu tena',
      mapFail: 'Ramani shirikishi haikupakiwa. Orodha iliyo kando yake bado inafanya kazi.',
      tileFail: 'Vigae vya ramani havikupakiwa (angalia mtandao wako). Alama na orodha bado zinafanya kazi.',
      allV: 'Magari yote', noTr: 'Hakuna njia za wasafirishaji zinazolingana na utafutaji wako.', noTrAll: 'Bado hakuna njia za wasafirishaji zilizoongezwa.',
      quote: 'Omba bei', quoteClose: 'Funga', login: 'Ingia ili kuomba bei', own: 'Hii ni njia yako mwenyewe',
      load: 'Mzigo (kg)', pickup: 'Kuchukulia', dest: 'Unakoenda', msg: 'Ujumbe (si lazima)', msgP: 'Chochote msafirishaji anachopaswa kujua',
      send: 'Tuma ombi', sending: 'Inatuma...', sentOk: 'Ombi limetumwa. Msafirishaji amearifiwa.',
      badLoad: 'Weka mzigo zaidi ya kilo 0.', dupe: 'Tayari una ombi linalosubiri kwa njia hii.', mine: 'Hii ni njia yako mwenyewe.',
      indic: 'Gharama ya makadirio', indicNote: 'makadirio, mstari ulionyooka', away: 'kutoka eneo lako', trRoutes: 'Njia',
      popDist: 'Umbali', noRating: 'Bado hakuna ukadiriaji', demo: ''
    }
  };
  var LF = null; // Leaflet, once loaded
  var T = function (k, v) {
    var s = (D[MK.lang()] || D.en)[k]; if (s == null) s = D.en[k]; if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.replace('{' + n + '}', v[n]); });
    return s;
  };

  var TOWN0 = TOWNS[0] || ['Nairobi', -1.2864, 36.8172];
  var loc = { n: TOWN0[0], a: TOWN0[1], o: TOWN0[2], src: 'town' };
  var rad = 50, RADS = [5, 10, 25, 50, 100, 250], ly = { s: 1, b: 1, t: 1 }, sel = null;
  var data = { sellers: [], buyers: [], transporters: [] }, loaded = false, loadFailed = false;
  var items = [], routesAll = [], mine = null; // mine = my entry in the map data, or null
  var qstate = {}; // route id -> {open, load, pickup, dest, msg, busy, text, kind}
  var map = null, layer = null, markers = {}, meMarker = null, ring = null, needFit = true, tiles = { ok: 0, bad: 0 }, mapStarted = false, active = false;
  var lastLoad = 0;

  function hv(a, b, c, d) { var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2), h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 12742 * Math.asin(Math.sqrt(h)); }
  function fk(d) { return (d < 10 ? d.toFixed(1) : String(Math.round(d))) + ' km'; }
  function ok(n) { return typeof n === 'number' && isFinite(n); }
  function dirUrl(a, o, c, d) { return 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' + Number(a) + '%2C' + Number(o) + '%3B' + Number(c) + '%2C' + Number(d); }
  function roleLabel(k) { return { s: T('roleS'), b: T('roleB'), t: T('roleT') }[k]; }

  /* ---------- text on the page (data-t / data-p / data-a) ---------- */
  function applyText() {
    root.querySelectorAll('[data-t]').forEach(function (e) { e.textContent = T(e.dataset.t); });
    root.querySelectorAll('[data-p]').forEach(function (e) { e.setAttribute('placeholder', T(e.dataset.p)); });
    root.querySelectorAll('[data-a]').forEach(function (e) { e.setAttribute('aria-label', T(e.dataset.a)); });
    var r = MK.me && MK.me.role;
    $('lead').textContent = T(r === 'seller' ? 'leadS' : r === 'buyer' ? 'leadB' : r === 'transporter' ? 'leadT' : 'leadG');
    $('rad').setAttribute('aria-label', T('radius'));
  }
  function chips() {
    $('rad').innerHTML = RADS.map(function (r) { return '<button type="button" aria-pressed="' + (r === rad) + '" data-r="' + r + '">' + r + ' km</button>'; }).join('');
  }
  function townOpts() {
    var sel0 = $('town'), v = sel0.value;
    sel0.innerHTML = '<option value="">-</option>' + TOWNS.map(function (t, i) { return '<option value="' + i + '">' + MK.esc(t[0]) + '</option>'; }).join('');
    sel0.value = v !== '' ? v : '0';
  }

  /* ---------- data ---------- */
  function normalise(map_, ml) {
    var out = { sellers: [], buyers: [], transporters: [] }, byId = {};
    function base(p, kind) {
      return { key: kind + p.id, kind: kind, id: p.id, name: p.name || '', area: p.area || '', lat: p.lat, lng: p.lng, verified: !!p.verified, rating: p.rating || null, listings: [], routes: [] };
    }
    (map_.sellers || []).forEach(function (p) {
      if (!ok(p.lat) || !ok(p.lng)) return;
      var s = base(p, 's'); s.listings = (p.listings || []).slice(); out.sellers.push(s); byId[p.id] = s;
    });
    (map_.buyers || []).forEach(function (p) { if (ok(p.lat) && ok(p.lng)) out.buyers.push(base(p, 'b')); });
    (map_.transporters || []).forEach(function (p) {
      if (!ok(p.lat) || !ok(p.lng)) return;
      var t = base(p, 't'); t.routes = (p.routes || []).slice(); out.transporters.push(t);
    });
    // marketplace listings: fill in sellers that are missing, and add listings the map data did not carry
    (ml || []).forEach(function (l) {
      var s = byId[l.seller_id];
      if (!s && ok(Number(l.lat)) && ok(Number(l.lng)) && l.lat != null && l.lng != null) {
        s = { key: 's' + l.seller_id, kind: 's', id: l.seller_id, name: l.seller_name || '', area: l.area || '', lat: Math.round(Number(l.lat) * 100) / 100, lng: Math.round(Number(l.lng) * 100) / 100, verified: !!l.seller_verified, rating: null, listings: [], routes: [] };
        out.sellers.push(s); byId[l.seller_id] = s;
      }
      if (s && !s.listings.some(function (x) { return x.id === l.id; }) && s.listings.length < 6 && (l.status === 'available' || l.status === 'almost_out')) {
        s.listings.push({ id: l.id, title: l.title, commodity: l.commodity, price: l.price_per_kg, kg: l.quantity_kg, status: l.status });
      }
    });
    return out;
  }
  function rebuildItems() {
    items = [].concat(data.sellers, data.buyers, data.transporters);
    routesAll = [];
    data.transporters.forEach(function (t) { t.routes.forEach(function (r) { routesAll.push({ r: r, t: t }); }); });
    mine = null;
    if (MK.me) items.forEach(function (it) { if (it.id === MK.me.id) mine = it; });
  }
  function loadData(force) {
    if (!force && loaded && Date.now() - lastLoad < 20000) { return Promise.resolve(); }
    var q = '?_=' + Date.now();
    return Promise.all([
      MK.api('GET', '/api/map/data' + q, null, { quiet: true }),
      MK.api('GET', '/api/marketplace/listings?limit=100', null, { quiet: true }).catch(function () { return { listings: [] }; })
    ]).then(function (r) {
      data = normalise(r[0], r[1].listings); loaded = true; loadFailed = false; lastLoad = Date.now();
      $('dataErr').innerHTML = '';
      rebuildItems();
      // a signed-in user who already shared a location starts from it
      if (mine && loc.src === 'town' && !loc._user) { loc = { n: '', k: 'saved', a: mine.lat, o: mine.lng, src: 'saved' }; needFit = true; }
      renderAll();
    }).catch(function (e) {
      loadFailed = true;
      $('dataErr').innerHTML = MK.esc(T('loadErr') + (e && e.message ? e.message + ' ' : '')) + '<button class="btn o sm" type="button" id="retry" style="margin-left:8px">' + MK.esc(T('retry')) + '</button>';
      var b = $('retry'); if (b) b.onclick = function () { loadData(true); };
      renderAll();
    });
  }

  /* ---------- compute visible results ---------- */
  function ranked() {
    items.forEach(function (p) { p.d = hv(loc.a, loc.o, p.lat, p.lng); });
    return items.filter(function (p) { return ly[p.kind]; }).sort(function (a, b) { return a.d - b.d; });
  }

  /* ---------- html bits ---------- */
  function ratingHtml(p) { return p.rating ? MK.stars(p.rating.avg, p.rating.count) : '<span class="stars-none">' + MK.esc(T('noRating')) + '</span>'; }
  function listingsHtml(p, cls) {
    if (!p.listings.length) return '<div class="m">' + MK.esc(T('noListings')) + '</div>';
    return '<ul class="' + cls + '">' + p.listings.slice(0, cls === 'ls' ? 6 : 3).map(function (l) {
      return '<li><a href="#/listing/' + Number(l.id) + '">' + MK.esc(l.title) + '</a><span class="price">' + MK.esc(MK.money(l.price) + T('perKg')) + '</span>' + MK.statusPill(l.status) + '</li>';
    }).join('') + '</ul>';
  }
  function routeLine(r) { return MK.esc(r.origin || '') + ' &rarr; ' + MK.esc(r.destination || ''); }
  function routeDetail(r) {
    return MK.esc(r.vehicle || '') + ' &middot; ' + MK.esc(T('cap')) + ' ' + MK.esc(MK.num(r.capacityKg)) + ' kg &middot; ' + MK.esc(MK.money(r.rate) + T('rateKm')) + ' &middot; ' + MK.esc(r.days || T('anyDay'));
  }
  function routesHtml(p, cls) {
    if (!p.routes.length) return '<div class="m">' + MK.esc(T('noRoutes')) + '</div>';
    return '<ul class="' + cls + '">' + p.routes.slice(0, cls === 'rt' ? 8 : 2).map(function (r) {
      return '<li><span class="route-line">' + MK.esc(r.name || '') + '</span><span>' + routeLine(r) + '</span><span class="m">' + routeDetail(r) + '</span></li>';
    }).join('') + '</ul>';
  }
  function popupHtml(p) {
    var h = '<h3>' + MK.esc(p.name) + (p.verified ? MK.verified() : '') + '</h3><div class="pop-m">' + MK.esc(roleLabel(p.kind)) + (p.area ? ' &middot; ' + MK.esc(p.area) : '') + '</div><p class="pop-m">' + ratingHtml(p) + '</p><p class="pop-m">' + MK.esc(T('popDist')) + ': ' + MK.esc(fk(p.d)) + ' (' + MK.esc(T('line')) + ')</p>';
    if (p.kind === 's') h += listingsHtml(p, 'pop-ls');
    if (p.kind === 't') h += routesHtml(p, 'pop-ls');
    h += '<p><a href="#/profile/' + Number(p.id) + '">' + MK.esc(T('profile')) + '</a> &middot; <a target="_blank" rel="noopener" href="' + dirUrl(loc.a, loc.o, p.lat, p.lng) + '">' + MK.esc(T('dir')) + '</a></p>';
    return h;
  }
  function itemHtml(p) {
    var cls = { s: 's1', b: 'b1', t: 't1' }[p.kind];
    return '<article class="it' + (p.key === sel ? ' sel' : '') + '" id="i-' + p.key + '" data-key="' + p.key + '">' +
      '<div class="t"><h3><button type="button" class="nm" data-fly="' + p.key + '">' + MK.esc(p.name) + '</button>' + (p.verified ? MK.verified() : '') + '</h3><span class="km">' + MK.esc(fk(p.d)) + ' ' + MK.esc(T('line')) + '</span></div>' +
      '<div class="m"><i class="k ' + cls + '">' + MK.esc(roleLabel(p.kind)) + '</i>' + MK.esc(p.area) + '</div>' +
      '<div class="m">' + ratingHtml(p) + '</div>' +
      (p.kind === 's' ? listingsHtml(p, 'ls') : '') + (p.kind === 't' ? routesHtml(p, 'rt') : '') +
      '<div class="acts"><a href="#/profile/' + Number(p.id) + '">' + MK.esc(T('profile')) + '</a><a class="dir" target="_blank" rel="noopener" href="' + dirUrl(loc.a, loc.o, p.lat, p.lng) + '">' + MK.esc(T('dir')) + '</a></div></article>';
  }

  /* ---------- render ---------- */
  function renderList() {
    var rk = ranked(), near = rk.filter(function (p) { return p.d <= rad; });
    $('cur').textContent = T('setAs') + locName() + ' (' + loc.a.toFixed(3) + ', ' + loc.o.toFixed(3) + ')';
    $('lgS').textContent = T('sellers') + ' (' + data.sellers.length + ')';
    $('lgB').textContent = T('buyers') + ' (' + data.buyers.length + ')';
    $('lgT').textContent = T('transporters') + ' (' + data.transporters.length + ')';
    if (!items.length && loaded) {
      $('cnt').textContent = '';
      $('list').innerHTML = '<div class="empty"><b>' + MK.esc(T('emptyAll')) + '</b></div>';
      return;
    }
    $('cnt').textContent = loaded ? T('cnt', { n: near.length, r: rad }) : '';
    $('list').innerHTML = !loaded ? '' : near.length ? near.map(itemHtml).join('') : '<div class="empty">' + MK.esc(T('none', { r: rad })) + '</div>';
  }
  function renderHint() {
    var show = !!MK.me && loaded && !mine;
    $('shareHint').hidden = !show;
    $('saveLoc').hidden = !MK.me;
  }

  /* ---------- Leaflet ---------- */
  function loadLeaflet() {
    var tryUrl = 'https://unpkg.com/leaflet@1.9.4/dist/';
    var cssP = root._lfCss ? Promise.resolve() : fetch(tryUrl + 'leaflet.css').then(function (r) { if (!r.ok) throw new Error('css'); return r.text(); }).then(function (t) {
      var st = document.createElement('style'); st.textContent = t; root.insertBefore(st, root.firstChild); root._lfCss = true;
    });
    var jsP = window.L && window.L.map ? Promise.resolve() : new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = tryUrl + 'leaflet.js'; s.onload = res; s.onerror = function () { rej(new Error('js')); }; document.head.appendChild(s);
    });
    return Promise.all([cssP, jsP]).then(function () { if (!window.L || !window.L.map) throw new Error('L'); LF = window.L; });
  }
  function startMap() {
    if (mapStarted) return; mapStarted = true;
    loadLeaflet().then(function () {
      var el = $('leafletMap');
      map = LF.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: false }).setView([loc.a, loc.o], 9);
      map.attributionControl.setPrefix(false);
      var tl = LF.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { subdomains: 'abc', maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);
      tl.on('tileload', function () { tiles.ok++; $('tileWarn').hidden = true; });
      tl.on('tileerror', function () { tiles.bad++; if (tiles.bad >= 3 && !tiles.ok) { $('tileWarn').textContent = T('tileFail'); $('tileWarn').hidden = false; } });
      layer = LF.layerGroup().addTo(map);
      map.on('click', function (e) { setLoc('', e.latlng.lat, e.latlng.lng, 'click', 'chosen'); });
      map.on('popupclose', function () { if (sel) { sel = null; paintSel(); } });
      drawMap(); fitMap();
      setTimeout(function () { if (map) { map.invalidateSize(); fitMap(); } }, 120);
    }).catch(function (e) {
      console.warn('Leaflet unavailable', e);
      $('leafletMap').hidden = true; $('mapFail').hidden = false; $('mapFail').textContent = T('mapFail');
      map = null;
    });
  }
  function pin(p) {
    return LF.divIcon({ className: 'mkpin ' + p.kind + (p.d > rad ? ' out' : '') + (p.key === sel ? ' on' : ''), html: '<i></i>', iconSize: p.kind === 't' ? [22, 22] : [24, 24], iconAnchor: p.kind === 't' ? [11, 11] : [12, 12], popupAnchor: [0, -12] });
  }
  function drawMap() {
    if (!map || !layer) return;
    layer.clearLayers(); markers = {};
    ring = LF.circle([loc.a, loc.o], { radius: rad * 1000, color: '#e11d48', weight: 1.5, dashArray: '2 6', fillColor: '#e11d48', fillOpacity: .06, interactive: false }).addTo(layer);
    meMarker = LF.marker([loc.a, loc.o], { icon: LF.divIcon({ className: 'mkme', html: '<i></i>', iconSize: [18, 18], iconAnchor: [9, 9] }), title: locName(), keyboard: false, zIndexOffset: 1000 }).addTo(layer);
    meMarker.bindTooltip(MK.esc(locName()));
    var rk = ranked();
    rk.forEach(function (p) {
      var m = LF.marker([p.lat, p.lng], { icon: pin(p), title: p.name, alt: p.name, riseOnHover: true }).addTo(layer);
      m.bindPopup(popupHtml(p), { maxWidth: 300 });
      m.on('click', function () { sel = p.key; paintSel(true); });
      markers[p.key] = m;
    });
    if (ly.t) rk.forEach(function (p) {
      if (p.kind !== 't') return;
      p.routes.forEach(function (r) {
        if (!r.from || !r.to || !ok(r.from[0]) || !ok(r.to[0])) return;
        var pl = LF.polyline([r.from, r.to], { color: getComputedStyle(root.host).getPropertyValue('--c-t').trim() || '#2563EB', weight: 3, dashArray: '8 8', opacity: .85, bubblingMouseEvents: false }).addTo(layer);
        pl.bindPopup('<h3>' + MK.esc(r.name || '') + '</h3><div class="pop-m">' + MK.esc(p.name) + '</div><p>' + routeLine(r) + '</p><p class="pop-m">' + routeDetail(r) + '</p>');
      });
    });
  }
  function fitMap() {
    if (!map || !ring) return;
    var sz = map.getSize(); if (!sz.x || !sz.y) return;
    map.fitBounds(ring.getBounds(), { padding: [20, 20], animate: false }); needFit = false;
  }
  function paintSel(scroll) {
    root.querySelectorAll('.it.sel').forEach(function (e) { e.classList.remove('sel'); });
    if (sel) { var el = $('i-' + sel); if (el) { el.classList.add('sel'); if (scroll) el.scrollIntoView({ block: 'nearest' }); } }
    Object.keys(markers).forEach(function (k) { var m = markers[k], p = items.filter(function (x) { return x.key === k; })[0]; if (p) m.setIcon(pin(p)); });
  }
  function flyTo(key) {
    var p = items.filter(function (x) { return x.key === key; })[0]; if (!p) return;
    sel = key; paintSel(false);
    if (map && markers[key]) { map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 12), { duration: .6 }); markers[key].setPopupContent(popupHtml(p)); markers[key].openPopup(); }
    var mw = root.querySelector('.mapw'); if (mw && matchMedia('(max-width:900px)').matches) mw.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function renderAll() { applyText(); chips(); renderList(); renderHint(); drawMap(); renderTransporters(); if (needFit) fitMap(); }

  function locName() { return loc.k ? T(loc.k) : loc.n; }
  function setLoc(n, a, o, src, k) { loc = { n: n, k: k || null, a: a, o: o, src: src, _user: true }; sel = null; $('gerr').textContent = ''; needFit = true; renderList(); drawMap(); fitMap(); renderTransporters(); }

  /* ---------- location controls ---------- */
  function nearestTown(a, o) { var best = null, bd = 80; TOWNS.forEach(function (t) { var d = hv(a, o, t[1], t[2]); if (d < bd) { bd = d; best = t[0]; } }); return best; }
  function saveLocation(a, o, name) {
    if (!MK.me) return Promise.resolve();
    var nm = name || nearestTown(a, o) || MK.me.location || '';
    return MK.api('POST', '/api/users/location', { lat: a, lng: o, name: nm }, { quiet: true }).then(function () {
      $('gerr').textContent = ''; MK.toast(T('locSaved')); return loadData(true);
    }).catch(function (e) { $('gerr').textContent = T('locSaveFail') + e.message; });
  }
  function useGps() {
    var g = $('gerr'); g.textContent = '';
    if (!navigator.geolocation) { g.textContent = T('noGeo'); return; }
    g.textContent = T('locating');
    navigator.geolocation.getCurrentPosition(function (p) {
      var a = p.coords.latitude, o = p.coords.longitude;
      setLoc('', a, o, 'gps', 'myLoc');
      saveLocation(a, o, null);
    }, function () { g.textContent = T('denied'); }, { timeout: 12000, maximumAge: 60000 });
  }
  $('gps').onclick = useGps; $('hintGps').onclick = useGps;
  $('town').onchange = function () { var t = TOWNS[this.value]; if (t) setLoc(t[0], t[1], t[2], 'town'); };
  $('saveLoc').onclick = function () { saveLocation(loc.a, loc.o, loc.src === 'town' ? loc.n : null); };
  $('rad').onclick = function (e) { var b = e.target.closest('button'); if (b) { rad = +b.dataset.r; sel = null; chips(); needFit = true; renderList(); drawMap(); fitMap(); } };
  root.querySelectorAll('[data-ly]').forEach(function (c) { c.onchange = function () { ly[c.dataset.ly] = c.checked ? 1 : 0; renderList(); drawMap(); }; });
  $('list').addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    var it = e.target.closest('.it'); if (it) flyTo(it.dataset.key);
  });

  /* ---------- transporters section ---------- */
  function vehicleOpts() {
    var f = $('vehicleFilter'), cur = f.value, seen = {}, vs = [];
    routesAll.forEach(function (x) { var v = String(x.r.vehicle || '').trim(), k = v.toLowerCase(); if (v && !seen[k]) { seen[k] = 1; vs.push(v); } });
    vs.sort();
    f.innerHTML = '<option value="">' + MK.esc(T('allV')) + '</option>' + vs.map(function (v) { return '<option value="' + MK.esc(v.toLowerCase()) + '">' + MK.esc(v) + '</option>'; }).join('');
    f.value = cur; if (f.value !== cur) f.value = '';
  }
  function indicative(x) {
    var r = x.r; if (!r.from || !r.to || !ok(r.from[0]) || !ok(r.to[0]) || !(r.rate > 0)) return null;
    var d = hv(r.from[0], r.from[1], r.to[0], r.to[1]); return { d: d, cost: Math.round(d * r.rate) };
  }
  function quoteForm(x) {
    var r = x.r, s = qstate[r.id] || {};
    return '<form class="qf" data-rid="' + Number(r.id) + '"' + (s.open ? '' : ' hidden') + ' novalidate>' +
      '<label><span>' + MK.esc(T('load')) + '</span><input type="number" min="1" step="1" inputmode="numeric" name="load" value="' + MK.esc(s.load || '') + '" required></label>' +
      '<label><span>' + MK.esc(T('pickup')) + '</span><input type="text" name="pickup" maxlength="80" value="' + MK.esc(s.pickup != null ? s.pickup : (r.origin || '')) + '"></label>' +
      '<label><span>' + MK.esc(T('dest')) + '</span><input type="text" name="dest" maxlength="80" value="' + MK.esc(s.dest != null ? s.dest : (r.destination || '')) + '"></label>' +
      '<label><span>' + MK.esc(T('msg')) + '</span><textarea name="msg" maxlength="500" placeholder="' + MK.esc(T('msgP')) + '">' + MK.esc(s.msg || '') + '</textarea></label>' +
      '<button class="btn" type="submit"' + (s.busy ? ' disabled' : '') + '>' + MK.esc(s.busy ? T('sending') : T('send')) + '</button>' +
      '<div class="qmsg ' + (s.kind || '') + '" role="status" aria-live="polite">' + MK.esc(s.tk ? T(s.tk) : (s.raw || '')) + '</div></form>';
  }
  function trCard(x) {
    var r = x.r, t = x.t, ind = indicative(x), s = qstate[r.id] || {}, act;
    if (!MK.me) act = '<a class="btn o qbtn" href="#/login">' + MK.esc(T('login')) + '</a>';
    else if (MK.me.id === t.id) act = '<div class="m qbtn">' + MK.esc(T('own')) + '</div>';
    else act = '<button class="btn qbtn" type="button" data-q="' + Number(r.id) + '" aria-expanded="' + (!!s.open) + '">' + MK.esc(s.open ? T('quoteClose') : T('quote')) + '</button>' + quoteForm(x);
    return '<div class="transport-card" data-rid="' + Number(r.id) + '">' +
      '<div class="meta-row"><h3>' + MK.esc(r.name || '') + '</h3><span class="tag">' + MK.esc(r.vehicle || '') + '</span></div>' +
      '<div class="route-line">' + routeLine(r) + '</div>' +
      '<div class="who"><a href="#/profile/' + Number(t.id) + '">' + MK.esc(t.name) + '</a>' + (t.verified ? MK.verified() : '') + ' ' + ratingHtml(t) + '</div>' +
      '<div class="m">' + MK.esc(t.area) + ' &middot; ' + MK.esc(fk(t.d)) + ' ' + MK.esc(T('away')) + ' (' + MK.esc(T('line')) + ')</div>' +
      '<div class="rate">' + MK.esc(MK.money(r.rate)) + '<small> ' + MK.esc(T('rateKm')) + '</small></div>' +
      '<div class="m">' + MK.esc(T('cap')) + ': ' + MK.esc(MK.num(r.capacityKg)) + ' kg &middot; ' + MK.esc(T('days')) + ': ' + MK.esc(r.days || T('anyDay')) + '</div>' +
      (ind ? '<div class="m">' + MK.esc(T('indic')) + ': ~' + MK.esc(MK.money(ind.cost)) + ' (' + MK.esc(Math.round(ind.d) + ' km, ' + T('indicNote')) + ')</div>' : '') +
      act + '</div>';
  }
  function renderTransporters() {
    var list = $('transporterList'); if (!list) return;
    vehicleOpts();
    items.forEach(function (p) { p.d = hv(loc.a, loc.o, p.lat, p.lng); });
    var q = $('transporterSearch').value.trim().toLowerCase(), veh = $('vehicleFilter').value;
    if (!routesAll.length) { list.innerHTML = '<div class="empty">' + MK.esc(loaded ? T('noTrAll') : '') + '</div>'; if (!loaded) list.innerHTML = ''; return; }
    var res = routesAll.filter(function (x) {
      var hay = [x.t.name, x.t.area, x.r.name, x.r.origin, x.r.destination, x.r.vehicle].join(' ').toLowerCase();
      return (!q || hay.indexOf(q) > -1) && (!veh || String(x.r.vehicle || '').toLowerCase() === veh);
    }).sort(function (a, b) { return a.t.d - b.t.d; });
    list.innerHTML = res.length ? res.map(trCard).join('') : '<div class="empty">' + MK.esc(T('noTr')) + '</div>';
  }
  $('transporterSearch').addEventListener('input', renderTransporters);
  $('vehicleFilter').addEventListener('change', renderTransporters);
  $('transporterList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]'); if (!b) return;
    var id = b.dataset.q, s = qstate[id] = qstate[id] || {}; s.open = !s.open; renderTransporters();
    if (s.open) { var f = root.querySelector('.qf[data-rid="' + id + '"] input'); if (f) f.focus(); }
  });
  $('transporterList').addEventListener('input', function (e) {
    var f = e.target.closest('.qf'); if (!f) return;
    var s = qstate[f.dataset.rid] = qstate[f.dataset.rid] || {};
    s.load = f.elements.load.value; s.pickup = f.elements.pickup.value; s.dest = f.elements.dest.value; s.msg = f.elements.msg.value;
  });
  $('transporterList').addEventListener('submit', function (e) {
    var f = e.target.closest('.qf'); if (!f) return; e.preventDefault();
    var id = Number(f.dataset.rid), s = qstate[id] = qstate[id] || {};
    s.load = f.elements.load.value; s.pickup = f.elements.pickup.value; s.dest = f.elements.dest.value; s.msg = f.elements.msg.value;
    if (!(Number(s.load) > 0)) { s.tk = 'badLoad'; s.kind = 'bad'; renderTransporters(); var i = root.querySelector('.qf[data-rid="' + id + '"] input'); if (i) i.focus(); return; }
    s.busy = true; s.tk = ''; s.raw = ''; s.kind = ''; renderTransporters();
    MK.api('POST', '/api/quote-requests', { routeId: id, loadKg: Number(s.load), pickup: s.pickup.trim(), destination: s.dest.trim(), message: s.msg.trim() }, { quiet: true }).then(function () {
      s.busy = false; s.tk = 'sentOk'; s.kind = 'ok'; s.load = ''; s.msg = ''; renderTransporters();
    }).catch(function (err) {
      s.busy = false; s.kind = 'bad';
      s.tk = err.status === 409 ? 'dupe' : err.status === 401 ? 'login' : err.message === 'This is your own route' ? 'mine' : ''; s.raw = s.tk ? '' : err.message;
      renderTransporters();
    });
  });

  /* ---------- wiring ---------- */
  var lg = $('lg');
  if (!lg) { lg = document.createElement('button'); lg.id = 'lg'; lg.type = 'button'; lg.hidden = true; root.appendChild(lg); }
  lg.addEventListener('click', function () { applyText(); chips(); townOpts(); renderList(); renderHint(); if (map) { drawMap(); } renderTransporters(); if (!$('mapFail').hidden) $('mapFail').textContent = T('mapFail'); if (loadFailed) loadData(true); });
  document.addEventListener('mk:route', function (e) {
    active = e.detail.view === 'map';
    if (!active) return;
    startMap();
    loadData(false);
    setTimeout(function () { if (map) { map.invalidateSize(); if (needFit) fitMap(); } }, 80);
    setTimeout(function () { if (map) map.invalidateSize(); }, 400);
  });
  document.addEventListener('mk:auth', function () { rebuildItems(); applyText(); renderList(); renderHint(); drawMap(); renderTransporters(); if (active) loadData(true); });
  window.addEventListener('resize', function () { if (map && active) map.invalidateSize(); });

  townOpts(); applyText(); chips(); renderList(); renderTransporters();
})(window.__r.map);
