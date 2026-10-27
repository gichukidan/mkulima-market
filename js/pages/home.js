/* Landing page. Runs inside a shadow root passed in as `root`.
   Listings come from the live API. English text is in the markup; Kiswahili is below. */
(function (root) {
  var SW = {
    heroPill: "Mtandao wa Kenya wa shambani hadi sokoni",
    h1a: "Uza mavuno yako.", h1b: "Pata wanunuzi wako.", h1c: "Yafikishe sokoni.",
    lead: "Mkulima Market inaunganisha wakulima, wavuvi, wafugaji, wanunuzi na wasafirishaji kote Kenya, kwa Kiingereza na Kiswahili. Matangazo halisi, bei za kweli na hakuna maoni ya uongo.",
    srProd: "Mazao", srLoc: "Mji au soko", phProd: "Viazi, samaki, mahindi…", phLoc: "Mji au soko", search: "Tafuta", popular: "Maarufu:",
    a1h: "Uza mazao yako", a1p: "Weka tangazo kwa dakika chache. Auto-write hukusaidia kuandika.",
    a2h: "Tembelea soko", a2p: "Mazao, samaki na mifugo kwa bei na eneo.",
    a3h: "Pata usafiri", a3p: "Ona wasafirishaji na njia karibu na shamba lako.",
    a4h: "Uliza Mkulima AI", a4p: "Uliza kwa Kiingereza au Kiswahili. Majibu yanatoka kwenye matangazo halisi.",
    prH: "Mazao mapya kutoka sokoni", prP: "Bei za kuuliza zilizowekwa na wauzaji. Kila tangazo ni la muuzaji halisi wa Mkulima Market.", prAll: "Muulize AI apate zaidi",
    empty: "Bado hakuna matangazo katika kundi hili.", emptySell: "Kuwa wa kwanza kuweka", emptyAi: "Uliza Mkulima AI",
    sH: "Mavuno yako yanastahili soko la haki.", sP: "Fikia wanunuzi nje ya kijiji chako. Weka ulicho nacho, weka bei yako na wanunuzi wakufikie.",
    s1: "Weka tangazo kwa dakika, kwa Kiingereza au Kiswahili", s2: "Auto-write huandika tangazo kutokana na maelezo yako", s3: "Sasisha akiba na bei wakati wowote kwenye dashibodi", s4: "Eneo kamili la shamba lako linabaki siri",
    sB: "Weka mazao yako", sB2: "Fungua akaunti bure",
    segS: "Muuzaji sokoni", segT: "Msafirishaji",
    aiH: "Msaidizi wako wa soko, kwa lugha yako.", aiP: "Uliza swali kama unavyomuuliza rafiki. Mkulima AI hutafuta matangazo halisi, wauzaji wa karibu na miongozo yetu ya kilimo, kisha huonyesha vyanzo.",
    ai1: "Hupata mazao karibu nawe na kulinganisha wauzaji", ai2: "Huunganisha wasafirishaji na mizigo kwenye njia zao", ai3: "Haibuni bei, wauzaji wala maoni", aiB: "Uliza Mkulima AI",
    hwH: "Kutoka shambani hadi kwa mnunuzi kwa hatua tatu", hwP: "Gusa hatua kuona kinachotokea.", cur: "Fungua",
    st1h: "Weka tangazo au tafuta", st1p: "Wauzaji huweka mazao na bei na kiasi. Wanunuzi hutafuta kwa zao, eneo na bei.",
    st2h: "Linganisha na uunganike", st2p: "Linganisha matangazo, ona umbali na maelezo ya muuzaji, kisha mkubaliane moja kwa moja.",
    st3h: "Yafikishe sokoni", st3p: "Pata msafirishaji wa njia yako, pima na kagua, kisha lipa kwa usalama.",
    trH: "Fikisha mazao yako sokoni kwa wakati.", trP: "Wasafirishaji huweka njia, magari na uwezo wao. Ona anayepita njia yako na umwombe bei.",
    trB: "Fungua ramani", trB2: "Weka njia ya usafiri",
    tH: "Kwa nini wafanyabiashara wanatuamini", tP: "Tumejengwa juu ya data halisi.",
    t0h: "AI inayosoma soko kwa ajili yako", t0p: "Mkulima AI hulinganisha bei za kuuliza kati ya wauzaji na masoko, huona mabadiliko ya bei kwa muda na hukuambia data isipotosha.", t0l: "Ona taarifa za soko",
    t1h: "Hakuna maoni ya uongo", t1p: "Ukadiriaji hutoka kwa biashara zilizokamilika pekee. Beji ya buluu hutolewa baada ya ziara halisi, si kwa kulipa tu.",
    t2h: "Bei za kweli", t2p: "Bei za kuuliza, bei za soko zilizoripotiwa na bei za biashara zilizothibitishwa huandikwa wazi na hazichanganywi.",
    t3h: "Faragha yako", t3p: "Tunaonyesha eneo lako kwa makadirio, si nyumbani kwako. Namba za simu si za umma. Futa akaunti yako wakati wowote.",
    t4h: "Inafanya kazi kwenye simu yoyote", t4p: "Isakinishe kama programu, itumie kwenye mtandao wa polepole, na endelea kuona kurasa ulizotembelea bila intaneti.",
    prcH: "Anza bure. Kua ukiwa tayari.", prcP: "Bei zilizopendekezwa za uzinduzi, zitajaribiwa na watumiaji halisi.",
    pf0: "Kwa wakulima wanaojaribu", pf1: "Kwa wafanyabiashara wa kila wiki", pf2: "Kwa vyama vya ushirika na kampuni",
    l5: "Hadi matangazo 5 yanayoendelea", img5: "Picha 5 kwa kila tangazo", aiAcc: "Mkulima AI na Auto-write", bp: "Wasifu wa msingi", pB1: "Anza bure", pop: "Maarufu zaidi", mo: " / mwezi",
    ev1: "Kila kitu kwenye Free", l25: "Hadi matangazo 25 yanayoendelea", img15: "Picha 15 kwa kila tangazo", stats: "Takwimu za mitazamo na maswali (imepangwa)", pB2: "Chagua Biashara",
    ev2: "Kila kitu kwenye Biashara", unl: "Matangazo bila kikomo", imgU: "Picha bila kikomo", care: "Huduma maalum kwa wateja", team: "Akaunti za timu (imepangwa)", pB3: "Wasiliana nasi",
    adH: "Tangaza shamba au biashara yako", adP: "Weka mazao, pembejeo au huduma zako mbele ya wakulima, wafanyabiashara na wasafirishaji kote Kenya. Chagua aina uone mfano.",
    ad1: "Tangazo lililodhaminiwa", ad1s: "Tangazo lako juu ya matokeo ya utafutaji na makundi", ad2: "Tangazo la ukurasa wa mbele", ad2s: "Bango linaloonwa na kila mgeni sokoni", ad3: "Mshirika maalum", ad3s: "Wasifu maalum kwa wauzaji wa pembejeo, vyama na maduka ya kilimo",
    adB: "Uliza kuhusu matangazo", adF: "Matangazo huandikwa \"Sponsored\" kila wakati. Hayabadilishi ukadiriaji wala usawa wa utafutaji.",
    bH: "Pata beji ya buluu", bP: "Timu yetu hutembelea shamba, biashara au gari lako na kuthibitisha ni halisi. Wasifu uliothibitishwa huonyesha beji ya buluu, na wanunuzi wanakuamini haraka.",
    bw1: "Mkulima", bw2: "Muuzaji", bw3: "Msafirishaji", bf1: "Omba", bf1p: "Lipa KSh 2,000 mara moja", bf2: "Tunakutembelea", bf2p: "Wakala hukagua ana kwa ana", bf3: "Beji inaonekana", bf3p: "Kwenye wasifu na matangazo yako", once: " mara moja", bB: "Omba beji ya buluu",
    fqH: "Maswali, majibu", fqP: "Kila kitu kuhusu kuuza, usafiri na akaunti yako.", fa: "Yote", fs: "Kuuza", fm: "Usafiri", fc: "Akaunti na usalama", fqA: "Bado una swali?", fqB: "Uliza Mkulima AI",
    q0: "Nani anaweza kujiunga na Mkulima Market?", q0a: "Wauzaji (wakulima, wavuvi, wafugaji na wafanyabiashara) na wasafirishaji wanaweza kufungua akaunti. Mtu yeyote anaweza kuangalia matangazo na kuuliza Mkulima AI bila akaunti.",
    q1: "Je, Mkulima Market ni bure?", q1a: "Ndiyo. Kuangalia na kuuliza Mkulima AI ni bure. Wauzaji wanaweza kuweka hadi matangazo 5 bure, kila moja na picha 5.",
    q2: "Nitalipwa vipi?", q2a: "Mnakubaliana malipo moja kwa moja na mnunuzi, kwa kawaida M-Pesa. Pima na kagua mazao kwanza, na hifadhi ujumbe wa M-Pesa kama kumbukumbu.",
    q6: "Wasafirishaji hupataje mizigo?", q6a: "Weka njia, gari na uwezo wako. Wauzaji walio njiani mwako hukuona kwenye ramani, na Mkulima AI hukupendekeza mtu anapohitaji usafiri.",
    q7: "Beji ya buluu ni nini?", q7a: "Uthibitisho wa mara moja wa KSh 2,000. Timu yetu hutembelea shamba, biashara au gari lako, na wasifu uliothibitishwa huonyesha beji ya buluu. Kulipa pekee hakutoshi.",
    q3: "Naweza kuitumia kwa Kiswahili?", q3a: "Ndiyo. Badilisha lugha juu ya ukurasa wowote, na muulize Mkulima AI kwa Kiswahili.",
    q4: "Je, eneo langu linaonyeshwa?", q4a: "Ni eneo la makadirio pekee (takriban km 1) linaloonyeshwa, si shamba wala nyumba yako.",
    q5: "Inafanya kazi bila intaneti?", q5a: "Isakinishe kutoka kwenye kivinjari. Kurasa ulizofungua zinaendelea kufanya kazi bila mtandao, na data mpya huja ukiunganika tena.",
    clH: "Tujenge masoko bora ya kilimo pamoja.", clP: "Jiunge bure kama muuzaji au msafirishaji.", js: "Jiunge kama muuzaji", jt: "Jiunge kama msafirishaji",
    fAbout: "Soko la kilimo la Kenya kwa wakulima, wavuvi, wafugaji, masoko na wasafirishaji.", fE: "Gundua", fProd: "Sokoni", fMap: "Ramani na usafiri", fAi: "Uliza Mkulima AI", fPrice: "Bei",
    fA: "Akaunti", fLogin: "Ingia", fSign: "Jisajili", fDash: "Dashibodi", fL: "Lugha", credits: "Wapiga picha", fMade: "Imetengenezwa Kenya"
  };

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lang = 'en', cat = 'all', items = [], loaded = false;
  var $ = function (i) { return root.getElementById(i); };
  var EN = {};
  root.querySelectorAll('[data-t]').forEach(function (e) { EN[e.dataset.t] = e.textContent; });
  root.querySelectorAll('[data-p]').forEach(function (e) { EN['p_' + e.dataset.p] = e.placeholder; });
  function t(k) { return lang === 'sw' && SW[k] != null ? SW[k] : EN[k]; }
  function L(en, sw) { return lang === 'sw' ? sw : en; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return 'KSh ' + Number(n || 0).toLocaleString('en-KE'); }
  var SPARK = '<svg class="ic" viewBox="0 0 24 24"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/></svg>';

  /* ---------- Hero slideshow ---------- */
  var SLIDES = [
    { img: 'hero', en: 'Market', sw: 'Soko' },
    { img: 'tea-farm', en: 'Farm', sw: 'Shamba' },
    { img: 'fishing', en: 'Lake', sw: 'Ziwa' },
    { img: 'livestock', en: 'Cattle', sw: 'Ng\'ombe' },
    { img: 'sheep-goats', en: 'Goats', sw: 'Mbuzi' }
  ];
  var DUR = 7000, cur = 0, timer = null, paused = reduced;
  function buildSlides() {
    var box = $('slides');
    SLIDES.forEach(function (s, i) {
      if (i === 0) return; // first slide is in the markup for a fast first paint
      var p = document.createElement('picture');
      p.className = 'slide';
      p.innerHTML = '<source media="(max-width: 760px)" data-srcset="/assets/images/landing/' + s.img + '-sm.webp"><img alt="" data-src="/assets/images/landing/' + s.img + '.webp" width="1920" height="1080" decoding="async">';
      box.appendChild(p);
    });
    $('dots').style.setProperty('--dur', DUR + 'ms');
  }
  function dots() {
    $('dots').innerHTML = SLIDES.map(function (s, i) {
      return '<button type="button" aria-label="' + esc(L('Show photo: ', 'Onyesha picha: ') + s[lang]) + '" aria-current="' + (i === cur) + '"><i></i>' + esc(s[lang]) + '</button>';
    }).join('');
  }
  function warm(i) { // load a slide's image just before it is shown
    var p = $('slides').children[i]; if (!p) return;
    p.querySelectorAll('[data-src],[data-srcset]').forEach(function (n) {
      if (n.dataset.src) { n.src = n.dataset.src; n.removeAttribute('data-src'); }
      if (n.dataset.srcset) { n.srcset = n.dataset.srcset; n.removeAttribute('data-srcset'); }
    });
  }
  function show(i) {
    var kids = $('slides').children;
    cur = (i + SLIDES.length) % SLIDES.length;
    warm(cur); warm((cur + 1) % SLIDES.length);
    for (var k = 0; k < kids.length; k++) kids[k].classList.toggle('on', k === cur);
    dots(); schedule();
  }
  function schedule() { clearTimeout(timer); if (!paused) timer = setTimeout(function () { show(cur + 1); }, DUR); }
  function setPaused(p) {
    paused = p; root.querySelector('.hero').classList.toggle('paused', p);
    $('pause').setAttribute('aria-pressed', p); $('pause').setAttribute('aria-label', p ? L('Play slideshow', 'Endesha picha') : L('Pause slideshow', 'Simamisha picha'));
    $('pause').innerHTML = p ? '<svg class="ic" viewBox="0 0 24 24"><path d="M7 4v16l13-8Z"/></svg>' : '<svg class="ic" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>';
    schedule();
  }
  $('dots').onclick = function (e) { var b = e.target.closest('button'); if (b) show([].indexOf.call($('dots').children, b)); };
  $('pause').onclick = function () { setPaused(!paused); };
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else schedule(); });

  /* ---------- Marketplace: categories and listings ---------- */
  var IMG = [
    [/potato|viazi/i, 'potatoes'], [/tomato|nyanya|onion|vitunguu|avocado|garlic/i, 'produce-crates'],
    [/cabbage|kabichi|kale|sukuma|carrot|spinach|lettuce|tea|chai/i, 'farmer-field'], [/mango|fruit|banana|pineapple|orange|pawpaw|tunda/i, 'fruits'],
    [/maize|mahindi|bean|gram|ndengu|rice|wheat|sorghum|millet|pea|sunflower|alizeti/i, 'maize'],
    [/fish|samaki|tilapia|omena|dagaa/i, 'fishing'], [/cow|cattle|ng'ombe|beef|dairy|milk|maziwa/i, 'livestock'], [/goat|mbuzi|sheep|kondoo/i, 'sheep-goats']
  ];
  function imgFor(c) { for (var i = 0; i < IMG.length; i++) if (IMG[i][0].test(c)) return IMG[i][1]; return 'stall'; }
  var CATS = [
    ['all', 'All', 'Yote', /./, '#3e8b61'],
    ['veg', 'Vegetables', 'Mboga', /potato|viazi|tomato|nyanya|onion|vitunguu|cabbage|kabichi|kale|sukuma|carrot|spinach|pepper/i, '#60a77e'],
    ['fruit', 'Fruit', 'Matunda', /mango|banana|pineapple|orange|avocado|pawpaw|fruit|watermelon|tunda/i, '#d08a2a'],
    ['grain', 'Grains and pulses', 'Nafaka na kunde', /maize|mahindi|bean|gram|ndengu|rice|wheat|sorghum|millet|pea/i, '#b98f3c'],
    ['maize', 'Maize', 'Mahindi', /maize|mahindi/i, '#e0b13a'],
    ['beans', 'Beans', 'Maharagwe', /bean|maharagwe|ndengu|gram/i, '#8a5a3c'],
    ['sunflower', 'Sunflower', 'Alizeti', /sunflower|alizeti/i, '#f0c419'],
    ['potato', 'Potatoes', 'Viazi', /potato|viazi/i, '#a77b4f'],
    ['tomato', 'Tomatoes', 'Nyanya', /tomato|nyanya/i, '#d2493a'],
    ['onion', 'Onions', 'Vitunguu', /onion|vitunguu/i, '#9b5fa8'],
    ['fish', 'Fish', 'Samaki', /fish|samaki|tilapia|omena|dagaa|nile perch/i, '#2f7fb5'],
    ['cattle', 'Cattle', 'Ng\'ombe', /cow|cattle|ng'ombe|bull|heifer|beef/i, '#7a4b2a'],
    ['sheep', 'Sheep', 'Kondoo', /sheep|kondoo|lamb/i, '#9aa59f'],
    ['goat', 'Goats', 'Mbuzi', /goat|mbuzi/i, '#6d6152'],
    ['poultry', 'Poultry', 'Kuku', /chicken|kuku|poultry|broiler|layer/i, '#c46a2b'],
    ['eggs', 'Eggs', 'Mayai', /egg|mayai/i, '#e3c27a'],
    ['dairy', 'Milk and dairy', 'Maziwa', /milk|maziwa|dairy|cheese|yoghurt/i, '#7fa7c9'],
    ['honey', 'Honey', 'Asali', /honey|asali/i, '#d39b1c'],
    ['coffee', 'Coffee', 'Kahawa', /coffee|kahawa/i, '#5b3a29'],
    ['tea', 'Tea', 'Chai', /\btea\b|chai/i, '#2d6e4c']
  ];
  function catBy(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return CATS[i]; return CATS[0]; }

  var pin = '<svg class="ic" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  var box = '<svg class="ic" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>';

  function card(l) {
    var low = l.status === 'almost_out';
    return '<article class="card">' +
      '<div class="im"><img src="/assets/images/landing/' + imgFor(l.commodity + ' ' + l.title) + '-sm.webp" alt="" loading="lazy" width="480" height="360">' +
      '<span class="badge' + (low ? ' low' : '') + '">' + (low ? L('Almost out', 'Karibu kuisha') : L('Available', 'Inapatikana')) + '</span>' +
      (l.is_demo ? '<span class="badge demo">Demo</span>' : '') + '</div>' +
      '<div class="b"><h3>' + esc(l.title) + '</h3>' +
      '<div class="price">' + money(l.price_per_kg) + ' <small>/ kg, ' + L('asking', 'bei ya kuuliza') + '</small></div>' +
      '<div class="meta"><span>' + box + Number(l.quantity_kg).toLocaleString('en-KE') + ' kg</span><span>' + pin + esc(l.area || '-') + '</span></div>' +
      '<div class="seller">' + esc(l.seller_name) + (l.grade ? ', ' + L('Grade ', 'Daraja ') + esc(l.grade) : '') + '</div>' +
      '</div></article>';
  }

  function render() {
    if (!loaded) { $('rail').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>'; $('empty').hidden = true; return; }
    var c = catBy(cat), re = c[3];
    var list = items.filter(function (l) { return re.test(l.commodity + ' ' + l.title); });
    $('rail').innerHTML = list.slice(0, 8).map(card).join('');
    $('empty').hidden = list.length > 0;
    $('catNow').textContent = cat === 'all'
      ? L(list.length + ' listings', 'Matangazo ' + list.length)
      : L(list.length + ' listings in ' + c[1], 'Matangazo ' + list.length + ' ya ' + c[2]);
  }

  function chips() {
    var one = function (hidden) {
      return CATS.map(function (c) {
        return '<button type="button" data-c="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '"' + (hidden ? ' tabindex="-1"' : '') + ' style="--c:' + c[4] + '"><i></i>' + esc(lang === 'sw' ? c[2] : c[1]) + '</button>';
      }).join('');
    };
    // Two copies make the loop seamless; the second is hidden from assistive tech.
    $('cats').innerHTML = '<span style="display:contents">' + one(false) + '</span><span aria-hidden="true" style="display:contents">' + one(true) + '</span>';
  }

  function loadListings(q, place) {
    loaded = false; render();
    var u = '/api/marketplace/listings?limit=40' + (q ? '&q=' + encodeURIComponent(q) : '');
    return fetch(u).then(function (r) { return r.json(); }).then(function (d) {
      items = (d.listings || []).filter(function (l) { return !place || String(l.area || '').toLowerCase().indexOf(place.toLowerCase()) > -1; });
      loaded = true; render();
    }).catch(function () { items = []; loaded = true; render(); });
  }

  /* ---------- Ask Mkulima: sample chats ---------- */
  var CHATS = {
    seller: {
      en: ['I have 40 bags of Shangi potatoes in Ol Kalou. What are other sellers asking?', 'I found 3 Shangi listings within 60 km, asking KSh 34 to 40 per kg. Want me to draft your listing with Auto-write?'],
      sw: ['Nina magunia 40 ya viazi Shangi Ol Kalou. Wauzaji wengine wanauliza bei gani?', 'Nimepata matangazo 3 ya Shangi ndani ya km 60, bei ya kuuliza KSh 34 hadi 40 kwa kilo. Nikuandikie tangazo kwa Auto-write?']
    },
    trans: {
      en: ['My 7-tonne lorry goes Nakuru to Nairobi on Friday. Who has a load?', '2 sellers near Nakuru have 5,200 kg of cabbages and potatoes for Wakulima Market. I can show them your route.'],
      sw: ['Lori langu la tani 7 linaenda Nakuru hadi Nairobi Ijumaa. Nani ana mzigo?', 'Wauzaji 2 karibu na Nakuru wana kilo 5,200 za kabichi na viazi kwa soko la Wakulima. Naweza kuwaonyesha njia yako.']
    }
  };
  var scene = 'seller', chatT = [];
  function playChat(animate) {
    chatT.forEach(clearTimeout); chatT = [];
    var c = CHATS[scene][lang], el = $('chatDemo');
    var u = '<div class="bub u">' + esc(c[0]) + '</div>', a = '<div class="bub a">' + SPARK + '<span>' + esc(c[1]) + '</span></div>';
    if (!animate || reduced) { el.innerHTML = u + a; return; }
    el.innerHTML = u;
    chatT.push(setTimeout(function () { el.insertAdjacentHTML('beforeend', '<div class="bub a typing"><span></span><span></span><span></span></div>'); }, 450));
    chatT.push(setTimeout(function () { el.innerHTML = u + a; }, 1500));
  }
  root.querySelectorAll('.seg [role=tab]').forEach(function (b) {
    b.onclick = function () {
      if (scene === b.dataset.s) return;
      scene = b.dataset.s;
      root.querySelectorAll('.seg [role=tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      playChat(true);
    };
  });

  /* ---------- How it works: tilt + custom cursor ---------- */
  (function steps() {
    var wrap = root.querySelector('#how .w'), cursor = $('cursor');
    var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    root.querySelectorAll('.step').forEach(function (s) {
      s.addEventListener('click', function () { if (!fine) s.classList.toggle('open'); });
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.classList.toggle('open'); } });
      if (!fine || reduced) return;
      s.addEventListener('pointermove', function (e) {
        var r = s.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        s.style.setProperty('--ry', (x * 8) + 'deg'); s.style.setProperty('--rx', (-y * 8) + 'deg');
        var w = wrap.getBoundingClientRect();
        cursor.style.setProperty('--cx', (e.clientX - w.left) + 'px'); cursor.style.setProperty('--cy', (e.clientY - w.top) + 'px');
        cursor.classList.add('on');
      });
      s.addEventListener('pointerleave', function () { s.style.removeProperty('--rx'); s.style.removeProperty('--ry'); cursor.classList.remove('on'); });
    });
  })();

  /* ---------- Trust cards: spotlight follows the pointer ---------- */
  root.querySelectorAll('.tc').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Advertising preview ---------- */
  var ad = 'listing';
  function adPreview() {
    var S = '<span class="spon">' + L('Sponsored', 'Imedhaminiwa') + '</span>', h = '';
    if (ad === 'listing') h = '<div class="pv"><img src="/assets/images/landing/maize-sm.webp" alt=""><div class="pvb">' + S + '<b>' + L('Dry maize, 90 kg bags', 'Mahindi makavu, magunia ya kg 90') + '</b><span class="pp">KSh 42 <small>/ kg</small></span><small>' + L('Your Farm Ltd, Eldoret', 'Shamba Lako Ltd, Eldoret') + '</small></div></div>';
    else if (ad === 'banner') h = '<div class="pv banner"><img src="/assets/images/landing/tea-farm-sm.webp" alt=""><div class="pvb">' + S + '<b>' + L('Certified seed for the long rains', 'Mbegu bora kwa mvua za masika') + '</b><small>' + L('Your agrovet name and offer here', 'Jina la duka lako na ofa hapa') + '</small><span class="cta">' + L('See offer', 'Ona ofa') + '</span></div></div>';
    else h = '<div class="pv spot"><span class="lg"><svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg></span>' + S + '<b style="display:block;margin-top:6px">' + L('Your Co-operative', 'Chama Chako cha Ushirika') + '</b><small>' + L('Buying avocados from 1,200 members in Murang\'a', 'Kununua parachichi kutoka kwa wanachama 1,200 Murang\'a') + '</small></div>';
    $('adPrev').innerHTML = h;
  }
  root.querySelectorAll('[data-ad]').forEach(function (b) {
    b.onclick = function () { ad = b.dataset.ad; root.querySelectorAll('[data-ad]').forEach(function (x) { x.setAttribute('aria-selected', x === b); }); adPreview(); };
  });

  /* ---------- Blue badge ---------- */
  var BADGE = {
    farmer: { av: 'WK', name: 'Wanjiku Farm', role: ['Farmer, Nyandarua', 'Mkulima, Nyandarua'],
      en: ['The farm exists at the location you gave', 'You grow or rear what you list', 'Your ID matches your profile'],
      sw: ['Shamba lipo mahali ulipotaja', 'Unalima au kufuga unachotangaza', 'Kitambulisho chako kinalingana na wasifu'] },
    seller: { av: 'OT', name: 'Otieno Traders', role: ['Seller, Kisumu', 'Muuzaji, Kisumu'],
      en: ['Your shop, stall or store is real', 'Your business permit is valid', 'Your stock matches your listings'],
      sw: ['Duka, kibanda au ghala lako ni halisi', 'Kibali chako cha biashara ni halali', 'Bidhaa zako zinalingana na matangazo'] },
    trans: { av: 'KM', name: 'Kamau Movers', role: ['Transporter, Nakuru', 'Msafirishaji, Nakuru'],
      en: ['The vehicle and logbook match your profile', 'Driving licence and insurance are valid', 'Capacity is what you advertise'],
      sw: ['Gari na kadi yake vinalingana na wasifu', 'Leseni na bima ni halali', 'Uwezo wa gari ni ule unaotangaza'] }
  };
  var who = 'farmer';
  function badge() {
    var b = BADGE[who];
    $('bpAv').textContent = b.av; $('bpName').textContent = b.name; $('bpRole').textContent = lang === 'sw' ? b.role[1] : b.role[0];
    $('badgeChecks').innerHTML = b[lang].map(function (x, i) { return '<li style="animation-delay:' + (i * 70) + 'ms">' + esc(x) + '</li>'; }).join('');
  }
  root.querySelectorAll('[data-w]').forEach(function (b) {
    b.onclick = function () { who = b.dataset.w; root.querySelectorAll('[data-w]').forEach(function (x) { x.setAttribute('aria-selected', x === b); }); badge(); };
  });

  /* ---------- FAQ: one open at a time, smooth height, category filter ---------- */
  var faqs = [].slice.call(root.querySelectorAll('#faqList details'));
  function animateDetails(d, open) {
    var a = d.querySelector('.ans');
    if (reduced) { d.open = open; return; }
    if (open) {
      d.open = true;
      var h = a.scrollHeight;
      a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else {
      var anim = a.animate([{ height: a.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 240, easing: 'ease-in' });
      anim.onfinish = function () { d.open = false; };
    }
  }
  faqs.forEach(function (d) {
    d.querySelector('summary').addEventListener('click', function (e) {
      e.preventDefault();
      var willOpen = !d.open;
      faqs.forEach(function (o) { if (o !== d && o.open) animateDetails(o, false); });
      animateDetails(d, willOpen);
    });
  });
  $('faqTabs').onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return;
    root.querySelectorAll('#faqTabs button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    faqs.forEach(function (d) { var show = b.dataset.f === 'all' || d.dataset.c === b.dataset.f; d.hidden = !show; if (!show) d.open = false; });
  };

  function credits() {
    fetch('/assets/images/landing/credits.json').then(function (r) { return r.json(); }).then(function (list) {
      $('creditList').innerHTML = list.map(function (c) {
        return '<li><a href="' + esc(c.page) + '" target="_blank" rel="noopener">' + esc(c.title.replace(/\.(jpe?g|png)$/i, '')) + '</a>, ' + esc(c.author || 'Unknown') + ', ' +
          (c.licenseUrl ? '<a href="' + esc(c.licenseUrl) + '" target="_blank" rel="noopener">' + esc(c.license) + '</a>' : esc(c.license)) + '</li>';
      }).join('');
    }).catch(function () {});
  }

  function apply() {
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-t]').forEach(function (e) { e.textContent = t(e.dataset.t); });
    root.querySelectorAll('[data-p]').forEach(function (e) { e.placeholder = lang === 'sw' ? SW[e.dataset.p] : EN['p_' + e.dataset.p]; });
    $('lang').textContent = lang === 'en' ? 'SW' : 'EN';
    chips(); render(); dots(); playChat(false); adPreview(); badge();
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
    loadListings($('q').value.trim(), $('loc').value.trim()).then(function () { $('produce').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });
  };
  root.querySelectorAll('[data-q]').forEach(function (b) {
    b.onclick = function () { $('q').value = b.textContent; $('loc').value = ''; $('sf').requestSubmit(); };
  });

  // Scroll reveal
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    root.querySelectorAll('.rv').forEach(function (e) { io.observe(e); });
  } else root.querySelectorAll('.rv').forEach(function (e) { e.classList.add('on'); });

  buildSlides();
  apply();
  setPaused(reduced);
  loadListings('');
  credits();
})(window.__r.home);
