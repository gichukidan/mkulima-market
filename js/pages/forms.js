/* Seller (listing) and transporter (route) forms: create, edit and delete, in English and Kiswahili.
   The forms live inside shadow roots, so they are found through window.__r, not document.
   Edit mode:  #/seller-form/<listingId>   and   #/transporter-form/<routeId>
   Drafts of new entries are auto-saved on this device while typing. */
(function () {
  var api = MK.api;

  // Only store drafts when storage works (private windows may block it).
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- Kiswahili for the markup (English lives in the partials as data-t / data-p) ---------- */
  var SW_SELLER = {
    lTitle: 'Kichwa cha tangazo', 'p:pTitle': 'Kreti za nyanya (Tomato crates)',
    lCommodity: 'Zao au bidhaa', 'p:pCommodity': 'Nyanya (Tomatoes)',
    hSearch: 'Wanunuzi wanaweza kutafuta kwa Kiingereza au Kiswahili, kwa mfano "tomatoes" au "nyanya". Chagua kwenye orodha au andika yako.',
    lGrade: 'Daraja', 'p:pGrade': 'Daraja A', lUnit: 'Imefungwa kwa',
    uKg: 'kg', uCrate: 'kreti', uBag: 'gunia', uBox: 'boksi',
    lQty: 'Jumla ya kiasi (kg)', lPrice: 'Bei kwa kg (KSh)', lLoc: 'Eneo', 'p:pLoc': 'Nairobi, Kenya',
    lStatus: 'Hali', sAvail: 'Inapatikana', sAlmost: 'Karibu kuisha', sPaused: 'Imesimamishwa', sSold: 'Imeuzwa (itaondolewa)',
    hStatus: 'Rangi hufuata chaguo lako: kijani ni inapatikana, njano ni karibu kuisha, kijivu ni imesimamishwa.',
    soldWarn: 'Ukichagua imeuzwa, tangazo litaondolewa kiotomatiki ukihifadhi. Halitaonekana tena kwa wanunuzi.',
    lDesc: 'Maelezo', bAuto: 'Auto-write',
    'p:pDesc': 'Mazao mapya yaliyovunwa, yanafaa kwa wanunuzi wa jumla. Au jaza maelezo hapo juu kisha bonyeza Auto-write.',
    hDesc: 'Auto-write hutumia maelezo uliyoandika pekee. Yakague kabla ya kuhifadhi. Rasimu yako huhifadhiwa kwenye kifaa hiki unapoandika.',
    lPhotos: 'Picha', bAddPhotos: 'Ongeza picha', bSave: 'Hifadhi tangazo', bCancel: 'Ghairi', bDelete: 'Futa tangazo'
  };
  var SW_ROUTE = {
    lName: 'Jina la njia', 'p:pName': 'Nakuru hadi Nairobi', lVehicle: 'Gari', 'p:pVehicle': 'Lori / van / pikipiki ya mizigo',
    lOrigin: 'Mahali pa kuanzia', 'p:pOrigin': 'Nakuru', lDest: 'Mahali pa kufikia', 'p:pDest': 'Nairobi',
    hTown: 'Chagua mji kwenye orodha ili njia yako ionekane kwenye ramani, au andika mahali popote.',
    lCap: 'Uwezo (kg)', lRate: 'Bei (KSh kwa km)', lDays: 'Siku za huduma', 'p:pDays': 'Jumatatu - Jumamosi',
    lDesc: 'Maelezo', 'p:pDesc': 'Usafiri wa uhakika kutoka shambani hadi sokoni kwa mazao mapya na nafaka.',
    bSave: 'Hifadhi njia', bCancel: 'Ghairi', bDelete: 'Futa njia'
  };

  /* ---------- Texts built by JavaScript: [English, Kiswahili] ---------- */
  var M = {
    'sf.newEyebrow': ['Create listing', 'Weka tangazo'], 'sf.newTitle': ['Post a fresh produce listing', 'Weka tangazo la mazao mapya'],
    'sf.editEyebrow': ['Edit listing', 'Hariri tangazo'], 'sf.editTitle': ['Update your listing', 'Sasisha tangazo lako'],
    'sf.save': ['Save listing', 'Hifadhi tangazo'], 'sf.update': ['Update listing', 'Sasisha tangazo'], 'sf.del': ['Delete listing', 'Futa tangazo'],
    'sf.created': ['Listing created. Taking you to your dashboard…', 'Tangazo limewekwa. Tunakupeleka kwenye dashibodi yako…'],
    'sf.updated': ['Listing updated.', 'Tangazo limesasishwa.'], 'sf.deleted': ['Listing deleted.', 'Tangazo limefutwa.'],
    'sf.sold': ['Marked sold out and removed.', 'Imewekwa kuwa imeuzwa na kuondolewa.'],
    'tf.newEyebrow': ['Create route', 'Weka njia'], 'tf.newTitle': ['Offer a transport route', 'Toa njia ya usafiri'],
    'tf.editEyebrow': ['Edit route', 'Hariri njia'], 'tf.editTitle': ['Update your route', 'Sasisha njia yako'],
    'tf.save': ['Save route', 'Hifadhi njia'], 'tf.update': ['Update route', 'Sasisha njia'], 'tf.del': ['Delete route', 'Futa njia'],
    'tf.created': ['Route created. Taking you to your dashboard…', 'Njia imewekwa. Tunakupeleka kwenye dashibodi yako…'],
    'tf.updated': ['Route updated.', 'Njia imesasishwa.'], 'tf.deleted': ['Route deleted.', 'Njia imefutwa.'],
    confirmDelete: ['Tap again to delete', 'Gusa tena kufuta'],
    needCommodity: ['Enter at least the commodity, then press Auto-write.', 'Andika angalau zao, kisha bonyeza Auto-write.'],
    writing: ['Writing…', 'Inaandika…'],
    awTitle: ['Write the title and description from the details above', 'Andika kichwa na maelezo kutokana na maelezo yaliyo juu'],
    awDone: ['Draft written from your details. Check it, edit if needed, then save.', 'Rasimu imeandikwa kutokana na maelezo yako. Ikague, ihariri ukihitaji, kisha uhifadhi.'],
    photoCount: ['{a} of {b} photos', 'Picha {a} kati ya {b}'], plan: ['{a} plan', 'Mpango wa {a}'],
    photoHint: ['JPEG, PNG or WebP. Photos are shrunk on your phone before upload.', 'JPEG, PNG au WebP. Picha hupunguzwa kwenye simu yako kabla ya kupakiwa.'],
    atLimit: ['You have reached the limit of {b} photos on the {a} plan.', 'Umefikia kikomo cha picha {b} kwenye mpango wa {a}.'],
    upgrade: ['Upgrade your plan for more photos', 'Pandisha mpango wako upate picha zaidi'],
    onlySome: ['Only {a} more photo(s) fit your plan, so the rest were skipped.', 'Picha {a} pekee zaidi zinafaa mpango wako, kwa hiyo zilizobaki ziliachwa.'],
    tooBig: ['One photo was too large even after shrinking and was skipped.', 'Picha moja ilikuwa kubwa mno hata baada ya kupunguzwa na iliachwa.'],
    removePhoto: ['Remove photo {a}', 'Ondoa picha {a}'], photoN: ['Photo {a}', 'Picha {a}'], newTag: ['New', 'Mpya'],
    photoRemoved: ['Photo removed.', 'Picha imeondolewa.'],
    uploading: ['Uploading photos…', 'Inapakia picha…'],
    photoFailNew: ['The listing was saved, but the photos could not be uploaded ({a}). Opening the listing so you can add them again.', 'Tangazo limehifadhiwa, lakini picha hazikupakiwa ({a}). Tunafungua tangazo ili uziongeze tena.'],
    photoFailEdit: ['Your changes were saved, but the photos could not be uploaded: {a}', 'Mabadiliko yako yamehifadhiwa, lakini picha hazikupakiwa: {a}'],
    notFound: ['Not found', 'Haipatikani']
  };
  function m(k, a, b) {
    var p = M[k]; if (!p) return k;
    return MK.L(p[0], p[1]).replace('{a}', a == null ? '' : a).replace('{b}', b == null ? '' : b);
  }

  var PLAN_NAME = { free: 'Free', biashara: 'Biashara', agribusiness: 'Agribusiness' };
  var meCache = null;
  function getMe() {
    if (MK.me) return Promise.resolve(MK.me);
    if (meCache) return Promise.resolve(meCache);
    return MK.api('GET', '/api/session', null, { quiet: true }).then(function (d) { meCache = d.user || null; return meCache; }).catch(function () { return null; });
  }

  function setup(cfg) {
    var root = window.__r[cfg.view];
    if (!root) return;
    var form = root.getElementById(cfg.formId);
    var status = root.getElementById('formStatus');
    var del = root.getElementById(cfg.deleteId);
    var submit = root.getElementById(cfg.submitId);
    var editId = null, loaded = null, delTimer = null;
    var i18n = MK.i18n(root, cfg.sw, refresh);
    var ctx = { root: root, form: form, editId: function () { return editId; } };

    function say(text, isError) {
      status.textContent = text || '';
      status.className = text ? (isError ? 'err' : 'ok') : '';
      if (text) status.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function fill(values) {
      Object.keys(values || {}).forEach(function (k) {
        var el = form.elements[k];
        if (!el || values[k] == null) return;
        if (k === 'status' && values[k] === 'sold' && !editId) return;
        el.value = values[k];
      });
      if (cfg.onFill) cfg.onFill(ctx);
    }
    function readForm() {
      var fd = new FormData(form), out = {};
      fd.forEach(function (v, k) { out[k] = v; });
      cfg.numeric.forEach(function (k) { if (out[k] !== undefined && out[k] !== '') out[k] = Number(out[k]); });
      return out;
    }
    // Texts that depend on the mode (new / edit) and the language.
    function modeTexts() {
      var p = cfg.p;
      root.getElementById(cfg.eyebrowId).textContent = m(p + (editId ? '.editEyebrow' : '.newEyebrow'));
      root.getElementById(cfg.titleId).textContent = m(p + (editId ? '.editTitle' : '.newTitle'));
      submit.textContent = m(p + (editId ? '.update' : '.save'));
      if (del.dataset.confirm === '1') del.textContent = m('confirmDelete'); else del.textContent = m(p + '.del');
    }
    function refresh() { modeTexts(); if (cfg.onLang) cfg.onLang(ctx); }
    function setMode(id) {
      editId = id;
      del.hidden = !id;
      del.dataset.confirm = ''; clearTimeout(delTimer);
      modeTexts();
      if (cfg.onMode) cfg.onMode(ctx);
    }

    // Load the right record whenever this view opens.
    function onRoute() {
      var parts = (location.hash || '').replace(/^#\/?/, '').split('/');
      if (parts[0] !== cfg.view) return;
      say('');
      form.reset();
      loaded = null;
      var id = Number(parts[1]) || null;
      setMode(id);
      if (cfg.onFill) cfg.onFill(ctx);
      if (id) {
        api('GET', cfg.url + '/' + id).then(function (row) {
          loaded = row; fill(cfg.fromApi(row));
          if (cfg.onLoaded) cfg.onLoaded(ctx, row);
        }).catch(function (e) { say(e.message, true); setMode(null); });
      } else {
        fill(store.get(cfg.draftKey)); // restore an unsent draft
      }
    }
    window.addEventListener('hashchange', onRoute);
    form.addEventListener('reset', function () { setTimeout(function () { if (cfg.onFill) cfg.onFill(ctx); }, 0); });

    form.addEventListener('input', function () { if (!editId) store.set(cfg.draftKey, readForm()); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit.disabled = true;
      var wasEdit = editId, id = editId;
      var body = cfg.toApi(readForm(), loaded, wasEdit);
      var req = wasEdit ? api('PUT', cfg.url + '/' + wasEdit, body) : api('POST', cfg.url, body);
      req.then(function (res) {
        if (wasEdit && res && res.deleted) {
          store.del(cfg.draftKey);
          say(m(cfg.p + '.sold'), false); MK.toast(m(cfg.p + '.sold'));
          setTimeout(function () { location.hash = '#/dashboard'; }, 900);
          return;
        }
        id = wasEdit || (res && res.id);
        var up = cfg.uploadPhotos ? cfg.uploadPhotos(ctx, id) : Promise.resolve();
        return up.then(function () {
          store.del(cfg.draftKey);
          say(m(cfg.p + (wasEdit ? '.updated' : '.created')), false);
          if (!wasEdit) form.reset();
          setTimeout(function () { location.hash = '#/dashboard'; }, 900);
        }, function (err) {
          // The listing itself is saved; only the photos failed.
          store.del(cfg.draftKey);
          if (wasEdit) { say(m('photoFailEdit', err.message), true); if (cfg.reloadPhotos) cfg.reloadPhotos(ctx, id); }
          else { say(m('photoFailNew', err.message), true); setTimeout(function () { location.hash = '#/' + cfg.view + '/' + id; }, 2600); }
        });
      }).catch(function (err) { say(err.message, true); })
        .finally(function () { submit.disabled = false; });
    });

    del.addEventListener('click', function () {
      if (!editId) return;
      // Two-step confirm without a browser dialog.
      if (del.dataset.confirm !== '1') {
        del.dataset.confirm = '1'; del.textContent = m('confirmDelete');
        delTimer = setTimeout(function () { del.dataset.confirm = ''; modeTexts(); }, 4000);
        return;
      }
      api('DELETE', cfg.url + '/' + editId).then(function () {
        store.del(cfg.draftKey);
        say(m(cfg.p + '.deleted'), false);
        setTimeout(function () { location.hash = '#/dashboard'; }, 700);
      }).catch(function (err) { say(err.message, true); });
    });

    ctx.say = say; ctx.readForm = readForm; ctx.fill = fill; ctx.api = api; ctx.T = i18n.T;
    if (cfg.afterSetup) cfg.afterSetup(ctx);
    onRoute();
    refresh();
  }

  /* ================= Seller listing form ================= */
  setup({
    view: 'seller-form', p: 'sf', formId: 'sellerForm', deleteId: 'sfDelete', submitId: 'sfSubmit', eyebrowId: 'sfEyebrow', titleId: 'sfTitle',
    url: '/api/listings', draftKey: 'mkulima_draft_listing', numeric: ['quantityKg', 'pricePerKg'], sw: SW_SELLER,
    fromApi: function (r) { return { title: r.title, commodity: r.commodity, grade: r.grade, unit: r.unit, quantityKg: r.quantity_kg, pricePerKg: r.price_per_kg, location: r.location, status: r.status, description: r.description }; },
    toApi: function (v) { return v; },
    onMode: function (c) { c.syncStatus(); c.resetPhotos(); },
    onFill: function (c) { c.syncStatus(); },
    onLang: function (c) { c.syncStatus(); c.drawPhotos(); c.setAwTitle(); },
    onLoaded: function (c, row) { c.setExisting(row.images || [], row.image_limit); },
    uploadPhotos: function (c, id) { return c.upload(id); },
    reloadPhotos: function (c, id) { return c.reload(id); },
    afterSetup: function (ctx) {
      var root = ctx.root, form = ctx.form;
      var $ = function (id) { return root.getElementById(id); };

      /* ---- autowrite (sends the current language) ---- */
      var btn = $('autowriteBtn');
      ctx.setAwTitle = function () { btn.title = m('awTitle'); };
      btn.addEventListener('click', function () {
        var v = ctx.readForm();
        if (!v.commodity && !v.title) { ctx.say(m('needCommodity'), true); return; }
        btn.disabled = true;
        // Only swap the text label so the sparkles icon stays in place.
        var label = btn.querySelector('.btn-label') || btn;
        label.textContent = m('writing');
        btn.setAttribute('aria-busy', 'true');
        ctx.api('POST', '/api/ai/autowrite', Object.assign({}, v, { lang: MK.lang() }))
          .then(function (r) {
            ctx.fill({ title: r.title, description: r.description });
            form.dispatchEvent(new Event('input'));
            ctx.say(m('awDone'), false);
          })
          .catch(function (e) { ctx.say(e.message, true); })
          .finally(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); label.textContent = ctx.T('bAuto'); });
      });

      /* ---- status: coloured preview, and "sold out" only when editing ---- */
      var sel = $('sfStatus'), prev = $('statusPrev'), soldOpt = $('soldOpt'), warn = $('soldWarn');
      ctx.syncStatus = function () {
        var editing = !!ctx.editId();
        soldOpt.textContent = ctx.T('sSold');
        if (editing && !soldOpt.parentNode) sel.appendChild(soldOpt);
        if (!editing && soldOpt.parentNode) { if (sel.value === 'sold') sel.value = 'available'; soldOpt.remove(); }
        prev.innerHTML = MK.statusPill(sel.value);
        warn.hidden = !(editing && sel.value === 'sold');
      };
      sel.addEventListener('change', ctx.syncStatus);

      /* ---- photos, limited by the plan ---- */
      var input = $('photoInput'), grid = $('pgrid'), countEl = $('photoCount'), msg = $('photoMsg');
      var existing = [], pending = [], limit = 5;
      function setMsg(html) { msg.innerHTML = html || ''; }
      function planName() { var u = MK.me || meCache; return u ? (PLAN_NAME[u.plan] || String(u.plan || 'Free')) : 'Free'; }
      function total() { return existing.length + pending.length; }
      function limitMsg() { return MK.esc(m('atLimit', planName(), limit)) + ' <a href="#/home/pricing">' + MK.esc(m('upgrade')) + '</a>'; }
      ctx.drawPhotos = function () {
        var n = 0;
        var html = existing.map(function (id) {
          n++;
          return '<figure class="ph"><img src="/api/listing-images/' + Number(id) + '" alt="' + MK.esc(m('photoN', n)) + '" loading="lazy">' +
            '<button type="button" class="phx" data-e="' + Number(id) + '" aria-label="' + MK.esc(m('removePhoto', n)) + '">&times;</button></figure>';
        }).join('') + pending.map(function (p, i) {
          n++;
          return '<figure class="ph"><img src="' + MK.esc(p) + '" alt="' + MK.esc(m('photoN', n)) + '"><span class="phn">' + MK.esc(m('newTag')) + '</span>' +
            '<button type="button" class="phx" data-p="' + i + '" aria-label="' + MK.esc(m('removePhoto', n)) + '">&times;</button></figure>';
        }).join('');
        grid.innerHTML = html;
        countEl.textContent = m('photoCount', total(), limit) + ' · ' + m('plan', planName()) + '. ' + m('photoHint');
      };
      ctx.resetPhotos = function () {
        existing = []; pending = []; setMsg('');
        getMe().then(function (u) { if (u && u.imageLimit) limit = u.imageLimit; ctx.drawPhotos(); });
        ctx.drawPhotos();
      };
      ctx.setExisting = function (ids, lim) {
        existing = ids.slice(); if (lim) limit = lim; ctx.drawPhotos();
      };
      ctx.reload = function (id) {
        return api('GET', '/api/listings/' + id).then(function (r) { pending = []; ctx.setExisting(r.images || [], r.image_limit); });
      };
      grid.addEventListener('click', function (e) {
        var b = e.target.closest('.phx'); if (!b) return;
        if (b.dataset.p != null) { pending.splice(Number(b.dataset.p), 1); setMsg(''); ctx.drawPhotos(); return; }
        var imgId = Number(b.dataset.e), id = ctx.editId();
        if (!id) return;
        b.disabled = true;
        api('DELETE', '/api/listings/' + id + '/images/' + imgId).then(function () {
          existing = existing.filter(function (x) { return x !== imgId; });
          setMsg(MK.esc(m('photoRemoved'))); ctx.drawPhotos();
        }).catch(function (err) { b.disabled = false; setMsg(MK.esc(err.message)); });
      });
      input.addEventListener('click', function (e) {
        if (total() >= limit) { e.preventDefault(); setMsg(limitMsg()); }
      });
      // Shrink in the browser. Reads the file as a data: URL because the page's security policy does not allow blob: images.
      function compress(file, maxDim, quality) {
        return new Promise(function (resolve, reject) {
          if (file.type.indexOf('image/') !== 0) return reject(new Error(MK.L('Choose an image file.', 'Chagua faili la picha.')));
          var fr = new FileReader();
          fr.onerror = function () { reject(new Error(MK.L('That image could not be read.', 'Picha hiyo haikusomeka.'))); };
          fr.onload = function () {
            var img = new Image();
            img.onload = function () {
              var r = Math.min(1, maxDim / Math.max(img.width, img.height)), c = document.createElement('canvas');
              c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
              var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
              resolve(c.toDataURL('image/jpeg', quality));
            };
            img.onerror = function () { reject(new Error(MK.L('That image could not be read.', 'Picha hiyo haikusomeka.'))); };
            img.src = fr.result;
          };
          fr.readAsDataURL(file);
        });
      }
      function shrink(file) {
        return compress(file, 1280, 0.8).then(function (d) {
          if (d.length * 0.75 < 950000) return d;
          return compress(file, 1000, 0.6).then(function (d2) { return d2.length * 0.75 < 950000 ? d2 : null; });
        });
      }
      input.addEventListener('change', function () {
        var files = [].slice.call(input.files || []); input.value = '';
        if (!files.length) return;
        var room = Math.max(0, limit - total()), notes = [];
        if (!room) { setMsg(limitMsg()); return; }
        if (files.length > room) { notes.push(MK.esc(m('onlySome', room))); files = files.slice(0, room); }
        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () {
            return shrink(f).then(function (d) { if (d) pending.push(d); else notes.push(MK.esc(m('tooBig'))); })
              .catch(function (err) { notes.push(MK.esc(err.message)); });
          });
        });
        chain.then(function () {
          ctx.drawPhotos();
          setMsg(notes.join(' ') + (total() >= limit ? (notes.length ? ' ' : '') + limitMsg() : ''));
        });
      });
      // Send all new photos in one request (split only if they would be very large).
      ctx.upload = function (id) {
        if (!pending.length) return Promise.resolve();
        setMsg(MK.esc(m('uploading')));
        var batches = [], cur = [], size = 0;
        pending.forEach(function (d) {
          if (cur.length && size + d.length > 9e6) { batches.push(cur); cur = []; size = 0; }
          cur.push(d); size += d.length;
        });
        if (cur.length) batches.push(cur);
        var chain = Promise.resolve();
        batches.forEach(function (b) { chain = chain.then(function () { return api('POST', '/api/listings/' + id + '/images', { images: b }); }); });
        return chain.then(function () { pending = []; });
      };
      ctx.resetPhotos();
      ctx.setAwTitle();
    }
  });

  /* ================= Transporter route form ================= */
  setup({
    view: 'transporter-form', p: 'tf', formId: 'transporterForm', deleteId: 'tfDelete', submitId: 'tfSubmit', eyebrowId: 'tfEyebrow', titleId: 'tfTitle',
    url: '/api/routes', draftKey: 'mkulima_draft_route', numeric: ['capacityKg', 'rate'], sw: SW_ROUTE,
    fromApi: function (r) { return { routeName: r.route_name, vehicle: r.vehicle, origin: r.origin, destination: r.destination, capacityKg: r.capacity_kg || '', rate: r.rate, serviceDays: r.service_days, description: r.description }; },
    // Town coordinates let the Map draw the route. Stored coordinates are kept while the place text is unchanged.
    toApi: function (v, loaded, wasEdit) {
      var towns = (window.MKDATA && window.MKDATA.towns) || [];
      function find(name) {
        var n = String(name || '').trim().toLowerCase(); if (!n) return null;
        for (var i = 0; i < towns.length; i++) if (String(towns[i][0]).toLowerCase() === n) return towns[i];
        return null;
      }
      function end(text, oldText, oldLat, oldLng) {
        if (wasEdit && loaded && oldLat != null && oldLng != null && String(oldText || '').trim().toLowerCase() === String(text || '').trim().toLowerCase()) return [oldLat, oldLng];
        var t = find(text); return t ? [t[1], t[2]] : [null, null];
      }
      var a = end(v.origin, loaded && loaded.origin, loaded && loaded.pickup_lat, loaded && loaded.pickup_lng);
      var b = end(v.destination, loaded && loaded.destination, loaded && loaded.dest_lat, loaded && loaded.dest_lng);
      return Object.assign({}, v, { pickupLat: a[0], pickupLng: a[1], destLat: b[0], destLng: b[1] });
    },
    afterSetup: function (ctx) {
      var dl = ctx.root.getElementById('townList');
      var towns = (window.MKDATA && window.MKDATA.towns) || [];
      dl.innerHTML = towns.map(function (t) { return '<option value="' + MK.esc(t[0]) + '"></option>'; }).join('');
    }
  });
})();
