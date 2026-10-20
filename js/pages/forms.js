/* Seller (listing) and transporter (route) forms: create, edit and delete.
   The forms live inside shadow roots, so they are found through window.__r, not document.
   Edit mode:  #/seller-form/<listingId>   and   #/transporter-form/<routeId>
   Drafts of new entries are auto-saved on this device while typing. */
(function () {
  function api(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined
    }).then(async function (res) {
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 401) { location.hash = '#/auth'; throw new Error('Please log in first.'); }
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  }

  // Only store drafts when storage works (private windows may block it).
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  function setup(cfg) {
    var root = window.__r[cfg.view];
    if (!root) return;
    var form = root.getElementById(cfg.formId);
    var status = root.getElementById('formStatus');
    var del = root.getElementById(cfg.deleteId);
    var submit = root.getElementById(cfg.submitId);
    var editId = null;

    function say(text, isError) {
      status.textContent = text || '';
      status.className = text ? (isError ? 'err' : 'ok') : '';
      if (text) status.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function fill(values) {
      Object.keys(values || {}).forEach(function (k) {
        var el = form.elements[k];
        if (el && values[k] != null) el.value = values[k];
      });
    }
    function readForm() {
      var fd = new FormData(form), out = {};
      fd.forEach(function (v, k) { out[k] = v; });
      cfg.numeric.forEach(function (k) { if (out[k] !== undefined && out[k] !== '') out[k] = Number(out[k]); });
      return out;
    }
    function setMode(id) {
      editId = id;
      root.getElementById(cfg.eyebrowId).textContent = id ? cfg.text.editEyebrow : cfg.text.newEyebrow;
      root.getElementById(cfg.titleId).textContent = id ? cfg.text.editTitle : cfg.text.newTitle;
      submit.textContent = id ? cfg.text.update : cfg.text.save;
      del.hidden = !id;
    }

    // Load the right record whenever this view opens.
    function onRoute() {
      var parts = (location.hash || '').replace(/^#\/?/, '').split('/');
      if (parts[0] !== cfg.view) return;
      say('');
      form.reset();
      var id = Number(parts[1]) || null;
      setMode(id);
      if (id) {
        api('GET', cfg.url + '/' + id).then(function (row) { fill(cfg.fromApi(row)); })
          .catch(function (e) { say(e.message, true); setMode(null); });
      } else {
        fill(store.get(cfg.draftKey)); // restore an unsent draft
      }
    }
    window.addEventListener('hashchange', onRoute);
    onRoute();

    form.addEventListener('input', function () { if (!editId) store.set(cfg.draftKey, readForm()); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit.disabled = true;
      var body = cfg.toApi(readForm());
      var req = editId ? api('PUT', cfg.url + '/' + editId, body) : api('POST', cfg.url, body);
      req.then(function () {
        store.del(cfg.draftKey);
        say(editId ? cfg.text.updated : cfg.text.created, false);
        if (!editId) form.reset();
        setTimeout(function () { location.hash = '#/dashboard'; }, 900);
      }).catch(function (err) { say(err.message, true); })
        .finally(function () { submit.disabled = false; });
    });

    del.addEventListener('click', function () {
      if (!editId) return;
      // Two-step confirm without a browser dialog.
      if (del.dataset.confirm !== '1') { del.dataset.confirm = '1'; del.textContent = cfg.text.confirmDelete; setTimeout(function () { del.dataset.confirm = ''; del.textContent = cfg.text.del; }, 4000); return; }
      api('DELETE', cfg.url + '/' + editId).then(function () {
        say(cfg.text.deleted, false);
        setTimeout(function () { location.hash = '#/dashboard'; }, 700);
      }).catch(function (err) { say(err.message, true); });
    });

    if (cfg.afterSetup) cfg.afterSetup({ root: root, form: form, say: say, readForm: readForm, fill: fill, api: api });
  }

  setup({
    view: 'seller-form', formId: 'sellerForm', deleteId: 'sfDelete', submitId: 'sfSubmit', eyebrowId: 'sfEyebrow', titleId: 'sfTitle',
    url: '/api/listings', draftKey: 'mkulima_draft_listing', numeric: ['quantityKg', 'pricePerKg'],
    text: { newEyebrow: 'Create listing', newTitle: 'Post a fresh produce listing', editEyebrow: 'Edit listing', editTitle: 'Update your listing',
      save: 'Save listing', update: 'Update listing', del: 'Delete listing', confirmDelete: 'Tap again to delete',
      created: 'Listing created. Taking you to your dashboard…', updated: 'Listing updated.', deleted: 'Listing deleted.' },
    fromApi: function (r) { return { title: r.title, commodity: r.commodity, grade: r.grade, unit: r.unit, quantityKg: r.quantity_kg, pricePerKg: r.price_per_kg, location: r.location, status: r.status, description: r.description }; },
    toApi: function (v) { return v; },
    afterSetup: function (ctx) {
      var btn = ctx.root.getElementById('autowriteBtn');
      btn.addEventListener('click', function () {
        var v = ctx.readForm();
        if (!v.commodity && !v.title) { ctx.say('Enter at least the commodity, then press Auto-write.', true); return; }
        btn.disabled = true;
        var old = btn.textContent;
        btn.textContent = 'Writing…';
        ctx.api('POST', '/api/ai/autowrite', Object.assign({ lang: document.documentElement.lang === 'sw' ? 'sw' : 'en' }, v))
          .then(function (r) {
            ctx.fill({ title: r.title, description: r.description });
            ctx.form.dispatchEvent(new Event('input'));
            ctx.say('Draft written from your details. Check it, edit if needed, then save.', false);
          })
          .catch(function (e) { ctx.say(e.message, true); })
          .finally(function () { btn.disabled = false; btn.textContent = old; });
      });
    }
  });

  setup({
    view: 'transporter-form', formId: 'transporterForm', deleteId: 'tfDelete', submitId: 'tfSubmit', eyebrowId: 'tfEyebrow', titleId: 'tfTitle',
    url: '/api/routes', draftKey: 'mkulima_draft_route', numeric: ['capacityKg', 'rate'],
    text: { newEyebrow: 'Create route', newTitle: 'Offer a transport route', editEyebrow: 'Edit route', editTitle: 'Update your route',
      save: 'Save route', update: 'Update route', del: 'Delete route', confirmDelete: 'Tap again to delete',
      created: 'Route created. Taking you to your dashboard…', updated: 'Route updated.', deleted: 'Route deleted.' },
    fromApi: function (r) { return { routeName: r.route_name, vehicle: r.vehicle, origin: r.origin, destination: r.destination, capacityKg: r.capacity_kg, rate: r.rate, serviceDays: r.service_days, description: r.description }; },
    toApi: function (v) { return v; }
  });
})();
