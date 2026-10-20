/* Landing page. Runs inside a shadow root passed in as `root`.
   Listings and counts come from the live API. English text is in the markup; Kiswahili is below. */
(function (root) {
  var SW = {
    heroPill: "Mtandao wa Kenya wa shambani hadi sokoni",
    h1a: "Uza mavuno yako.", h1b: "Pata mazao mapya.", h1c: "Yafikishe sokoni.",
    lead: "Mkulima Market inaunganisha wakulima, wanunuzi na wasafirishaji kote Kenya, kwa Kiingereza na Kiswahili. Matangazo halisi, bei za kweli na hakuna maoni ya uongo.",
    srProd: "Mazao", srLoc: "Mji au soko", phProd: "Viazi, nyanya, vitunguu…", phLoc: "Mji au soko", search: "Tafuta", popular: "Maarufu:",
    hsTitle: "Kwenye Mkulima Market leo", stListings: "matangazo yanayoendelea", stSellers: "wauzaji", stCommodities: "aina za mazao", stRoutes: "njia za usafiri", hsNote: "Takwimu halisi kutoka sokoni.",
    a1h: "Pata mnunuzi", a1p: "Weka mazao yako kwa dakika chache. Auto-write hukusaidia kuandika.",
    a2h: "Pata muuzaji", a2p: "Tafuta mazao kwa bei, kiasi na eneo.",
    a3h: "Pata usafiri", a3p: "Ona wasafirishaji na njia karibu na shamba lako.",
    a4h: "Uliza Mkulima AI", a4p: "Uliza kwa Kiingereza au Kiswahili. Majibu yanatoka kwenye matangazo halisi.",
    prK: "Sokoni", prH: "Mazao mapya kutoka sokoni", prP: "Bei za kuuliza zilizowekwa na wauzaji. Kila tangazo ni la muuzaji halisi wa Mkulima Market.", prAll: "Muulize AI apate zaidi",
    empty: "Bado hakuna matangazo yanayolingana na utafutaji wako.", emptyAi: "Uliza Mkulima AI",
    sK: "Kwa wakulima na wauzaji", sH: "Mavuno yako yanastahili soko la haki.", sP: "Fikia wanunuzi nje ya kijiji chako. Weka ulicho nacho, weka bei yako na wanunuzi wakufikie.",
    s1: "Weka tangazo kwa dakika, kwa Kiingereza au Kiswahili", s2: "Auto-write huandika tangazo kutokana na maelezo yako", s3: "Sasisha akiba na bei wakati wowote kwenye dashibodi", s4: "Eneo kamili la shamba lako linabaki siri",
    sB: "Weka mazao yako", sB2: "Fungua akaunti bure",
    c1: "Nitafute viazi karibu na Karatina, angalau magunia 40", c2: "Nimepata tangazo 1: Shangi, Daraja A, kilo 4,500, KSh 38/kg, km 87 (mstari ulionyooka).",
    aiK: "Uliza Mkulima AI", aiH: "Msaidizi wako wa soko, kwa lugha yako.", aiP: "Uliza swali kama unavyomuuliza rafiki. Mkulima AI hutafuta matangazo halisi, wauzaji wa karibu na miongozo yetu ya kilimo, kisha huonyesha vyanzo.",
    ai1: "Hupata mazao karibu nawe na kulinganisha wauzaji", ai2: "Ushauri wa kuhifadhi, usalama na kuuza, wenye vyanzo", ai3: "Haibuni bei, wauzaji wala maoni", aiB: "Uliza Mkulima AI",
    hwK: "Jinsi inavyofanya kazi", hwH: "Kutoka shambani hadi kwa mnunuzi kwa hatua tatu",
    st1h: "Weka tangazo au tafuta", st1p: "Wauzaji huweka mazao na bei na kiasi. Wanunuzi hutafuta kwa zao, eneo na bei.",
    st2h: "Linganisha na uunganike", st2p: "Linganisha matangazo, ona umbali na maelezo ya muuzaji, kisha mkubaliane moja kwa moja.",
    st3h: "Yafikishe sokoni", st3p: "Pata msafirishaji wa njia yako, pima na kagua, kisha lipa kwa usalama.",
    trK: "Usafiri", trH: "Fikisha mazao yako sokoni kwa wakati.", trP: "Wasafirishaji huweka njia, magari na uwezo wao. Ona anayepita njia yako na umwombe bei. Umbali ni wa mstari ulionyooka isipokuwa umeandikwa \"kwa barabara\".",
    trB: "Fungua ramani", trB2: "Weka njia ya usafiri",
    tK: "Kwa nini wafanyabiashara wanatuamini", tH: "Tumejengwa juu ya data halisi",
    t1h: "Hakuna maoni ya uongo", t1p: "Ukadiriaji hutoka kwa biashara zilizokamilika pekee. Beji ya buluu hutolewa baada ya ziara halisi, si kwa kulipa tu.",
    t2h: "Bei za kweli", t2p: "Bei za kuuliza, bei za soko zilizoripotiwa na bei za biashara zilizothibitishwa huandikwa wazi na hazichanganywi.",
    t3h: "Faragha yako", t3p: "Tunaonyesha eneo lako kwa makadirio, si nyumbani kwako. Namba za simu si za umma. Futa akaunti yako wakati wowote.",
    t4h: "Inafanya kazi kwenye simu yoyote", t4p: "Isakinishe kama programu, itumie kwenye mtandao wa polepole, na endelea kuona kurasa ulizotembelea bila intaneti.",
    pK: "Bei", prcH: "Anza bure. Kua ukiwa tayari.", prcP: "Bei zilizopendekezwa za uzinduzi, zitajaribiwa na watumiaji halisi.",
    l5: "Hadi matangazo 5 yanayoendelea", aiAcc: "Mkulima AI na Auto-write", bp: "Wasifu wa msingi", pB1: "Anza bure", pop: "Maarufu zaidi", mo: " / mwezi",
    ev1: "Kila kitu kwenye Free", l25: "Hadi matangazo 25 yanayoendelea", stats: "Takwimu za mitazamo na maswali (imepangwa)", pB2: "Chagua Biashara",
    ev2: "Kila kitu kwenye Biashara", unl: "Matangazo bila kikomo", team: "Akaunti za timu (imepangwa)", pB3: "Wasiliana nasi",
    fqK: "Maswali", fqH: "Maswali yanayoulizwa mara kwa mara",
    q1: "Je, Mkulima Market ni bure?", q1a: "Ndiyo. Wanunuzi hutumia bure kila wakati, na wauzaji wanaweza kuweka hadi matangazo 5 bure.",
    q2: "Nitalipwa vipi?", q2a: "Mnakubaliana malipo moja kwa moja na mnunuzi, kwa kawaida M-Pesa. Pima na kagua mazao kwanza, na hifadhi ujumbe wa M-Pesa kama kumbukumbu.",
    q3: "Naweza kuitumia kwa Kiswahili?", q3a: "Ndiyo. Badilisha lugha juu ya ukurasa wowote, na muulize Mkulima AI kwa Kiswahili.",
    q4: "Je, eneo langu linaonyeshwa?", q4a: "Ni eneo la makadirio pekee (takriban km 1) linaloonyeshwa, si shamba wala nyumba yako.",
    q5: "Inafanya kazi bila intaneti?", q5a: "Isakinishe kutoka kwenye kivinjari. Kurasa ulizofungua zinaendelea kufanya kazi bila mtandao, na data mpya huja ukiunganika tena.",
    clH: "Tujenge masoko bora ya kilimo pamoja.", clP: "Jiunge bure kama mnunuzi, muuzaji au msafirishaji.", jb: "Jiunge kama mnunuzi", js: "Jiunge kama muuzaji", jt: "Jiunge kama msafirishaji",
    fAbout: "Soko la kilimo la Kenya kwa wakulima, wanunuzi, masoko na wasafirishaji.", fE: "Gundua", fProd: "Mazao", fMap: "Ramani na usafiri", fAi: "Uliza Mkulima AI", fPrice: "Bei",
    fA: "Akaunti", fLogin: "Ingia au jisajili", fDash: "Dashibodi", fSell: "Uza mazao", fL: "Lugha", credits: "Wapiga picha", fMade: "Imetengenezwa Kenya"
  };

  // Produce photo for each commodity (falls back to a mixed market stall).
  var IMG = [
    [/potato|viazi/i, 'potatoes'], [/tomato|nyanya|onion|vitunguu|avocado|garlic/i, 'produce-crates'],
    [/cabbage|kabichi|kale|sukuma|carrot|spinach|lettuce/i, 'farmer-field'], [/mango|fruit|banana|pineapple|orange|pawpaw|tunda/i, 'fruits'],
    [/maize|mahindi|bean|gram|ndengu|rice|wheat|sorghum|millet|pea/i, 'maize']
  ];
  var CATS = {
    all: { en: 'All', sw: 'Yote', re: /./ },
    veg: { en: 'Vegetables', sw: 'Mboga', re: /potato|viazi|tomato|nyanya|onion|vitunguu|cabbage|kabichi|kale|sukuma|carrot|spinach|pepper/i },
    fruit: { en: 'Fruit', sw: 'Matunda', re: /mango|banana|pineapple|orange|avocado|pawpaw|fruit|watermelon/i },
    grain: { en: 'Grains and pulses', sw: 'Nafaka na kunde', re: /maize|mahindi|bean|gram|ndengu|rice|wheat|sorghum|millet|pea/i }
  };

  var lang = 'en', cat = 'all', items = [], loaded = false;
  var $ = function (i) { return root.getElementById(i); };
  var EN = {};
  root.querySelectorAll('[data-t]').forEach(function (e) { EN[e.dataset.t] = e.textContent; });
  root.querySelectorAll('[data-p]').forEach(function (e) { EN['p_' + e.dataset.p] = e.placeholder; });
  function t(k) { return lang === 'sw' && SW[k] != null ? SW[k] : EN[k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return 'KSh ' + Number(n || 0).toLocaleString('en-KE'); }
  function imgFor(c) { for (var i = 0; i < IMG.length; i++) if (IMG[i][0].test(c)) return IMG[i][1]; return 'stall'; }

  var pin = '<svg class="ic" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  var box = '<svg class="ic" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>';

  function card(l) {
    var name = imgFor(l.commodity + ' ' + l.title);
    var low = l.status === 'almost_out';
    return '<article class="card">' +
      '<div class="im"><img src="/assets/images/landing/' + name + '-sm.webp" alt="" loading="lazy" width="480" height="360">' +
      '<span class="badge' + (low ? ' low' : '') + '">' + (low ? (lang === 'sw' ? 'Karibu kuisha' : 'Almost out') : (lang === 'sw' ? 'Inapatikana' : 'Available')) + '</span>' +
      (l.is_demo ? '<span class="badge demo">Demo</span>' : '') + '</div>' +
      '<div class="b"><h3>' + esc(l.title) + '</h3>' +
      '<div class="price">' + money(l.price_per_kg) + ' <small>/ kg · ' + (lang === 'sw' ? 'bei ya kuuliza' : 'asking') + '</small></div>' +
      '<div class="meta"><span>' + box + Number(l.quantity_kg).toLocaleString('en-KE') + ' kg</span><span>' + pin + esc(l.area || '—') + '</span></div>' +
      '<div class="seller">' + esc(l.seller_name) + (l.grade ? ' · ' + (lang === 'sw' ? 'Daraja ' : 'Grade ') + esc(l.grade) : '') + '</div>' +
      '</div></article>';
  }

  function render() {
    if (!loaded) { $('rail').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>'; return; }
    var re = CATS[cat].re;
    var list = items.filter(function (l) { return re.test(l.commodity + ' ' + l.title); });
    $('rail').innerHTML = list.slice(0, 8).map(card).join('');
    $('empty').hidden = list.length > 0;
  }

  function chips() {
    $('cats').innerHTML = Object.keys(CATS).map(function (k) {
      return '<button type="button" data-c="' + k + '" aria-pressed="' + (cat === k) + '">' + CATS[k][lang] + '</button>';
    }).join('');
  }

  function loadListings(q, place) {
    loaded = false; render();
    var u = '/api/marketplace/listings?limit=40' + (q ? '&q=' + encodeURIComponent(q) : '');
    return fetch(u).then(function (r) { return r.json(); }).then(function (d) {
      items = (d.listings || []).filter(function (l) { return !place || String(l.area || '').toLowerCase().indexOf(place.toLowerCase()) > -1; });
      loaded = true; render();
    }).catch(function () { items = []; loaded = true; render(); });
  }

  function loadStats() {
    fetch('/api/stats').then(function (r) { return r.json(); }).then(function (s) {
      [['stListings', s.activeListings], ['stSellers', s.sellers], ['stCommodities', s.commodities], ['stRoutes', s.routes]].forEach(function (p) { countUp($(p[0]), p[1] || 0); });
    }).catch(function () {});
  }
  function countUp(el, to) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || to < 2) { el.textContent = to; return; }
    var start = performance.now();
    (function step(now) { var k = Math.min(1, (now - start) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(start);
  }

  function credits() {
    fetch('/assets/images/landing/credits.json').then(function (r) { return r.json(); }).then(function (list) {
      $('creditList').innerHTML = list.map(function (c) {
        return '<li><a href="' + esc(c.page) + '" target="_blank" rel="noopener">' + esc(c.title.replace(/\.(jpe?g|png)$/i, '')) + '</a> · ' + esc(c.author || 'Unknown') + ' · ' +
          (c.licenseUrl ? '<a href="' + esc(c.licenseUrl) + '" target="_blank" rel="noopener">' + esc(c.license) + '</a>' : esc(c.license)) + '</li>';
      }).join('');
    }).catch(function () {});
  }

  function apply() {
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-t]').forEach(function (e) { e.textContent = t(e.dataset.t); });
    root.querySelectorAll('[data-p]').forEach(function (e) { e.placeholder = lang === 'sw' ? SW[e.dataset.p] : EN['p_' + e.dataset.p]; });
    $('lang').textContent = lang === 'en' ? 'SW' : 'EN';
    chips(); render();
  }

  // The global navbar's language button clicks this hidden button (see js/shell.js).
  $('lang').onclick = function () { lang = lang === 'en' ? 'sw' : 'en'; apply(); };
  root.querySelectorAll('[data-l]').forEach(function (a) {
    a.onclick = function (e) { e.preventDefault(); if (lang !== a.dataset.l) { var g = document.getElementById('sl2'); if (g) g.click(); else { lang = a.dataset.l; apply(); } } };
  });
  $('cats').onclick = function (e) { var b = e.target.closest('button'); if (b) { cat = b.dataset.c; chips(); render(); } };
  $('sf').onsubmit = function (e) {
    e.preventDefault();
    cat = 'all'; chips();
    loadListings($('q').value.trim(), $('loc').value.trim()).then(function () { $('produce').scrollIntoView({ behavior: 'smooth' }); });
  };
  root.querySelectorAll('[data-q]').forEach(function (b) {
    b.onclick = function () { $('q').value = b.textContent; $('loc').value = ''; $('sf').requestSubmit(); };
  });

  // Scroll reveal
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    root.querySelectorAll('.rv').forEach(function (e) { io.observe(e); });
  } else root.querySelectorAll('.rv').forEach(function (e) { e.classList.add('on'); });

  apply();
  loadListings('');
  loadStats();
  credits();
})(window.__r.home);
