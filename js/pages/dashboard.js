/* Dashboard: the signed-in user's profile, listings and routes, with full CRUD.
   Reloads every time the user opens #/dashboard so it always shows fresh data. */
(function (root) {
  var STATUS = { available: 'Available', almost_out: 'Almost out', paused: 'Paused', sold: 'Sold' };
  function $(id) { return root.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return 'KSh ' + Number(n || 0).toLocaleString('en-KE'); }
  function say(text, isError) { var s = $('dashStatus'); s.textContent = text || ''; s.className = 'dash-status' + (text ? (isError ? ' err' : ' ok') : ''); }

  function api(method, url, body) {
    return fetch(url, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(async function (res) {
        var data = await res.json().catch(function () { return {}; });
        if (res.status === 401) { location.hash = '#/auth'; throw new Error('Please log in.'); }
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
  }

  function renderProfile(u) {
    var name = u.fullName || 'Mkulima member';
    $('profileAvatar').textContent = name.split(' ').map(function (p) { return p[0] || ''; }).slice(0, 2).join('').toUpperCase() || 'M';
    $('profileName').textContent = name;
    $('profileRole').textContent = (u.role || '').charAt(0).toUpperCase() + (u.role || '').slice(1);
    $('profileLocation').textContent = u.location || 'Location not set';
    $('profileEmail').textContent = u.email || '—';
    $('profilePhone').textContent = u.phone || 'Not added';
    $('statRating').textContent = u.rating == null ? '—' : u.rating;
    var f = $('profileForm');
    f.fullName.value = u.fullName || ''; f.phone.value = u.phone || ''; f.location.value = u.location || '';
    f.businessType.value = u.businessType || ''; f.speciality.value = u.speciality || '';
  }

  function renderListings(rows) {
    $('statAll').textContent = rows.length;
    $('statListings').textContent = rows.filter(function (r) { return r.status === 'available' || r.status === 'almost_out'; }).length;
    $('listingGrid').innerHTML = rows.length ? rows.map(function (l) {
      return '<article class="listing-card" data-id="' + Number(l.id) + '">' +
        '<div class="card-top"><h3>' + esc(l.title) + '</h3>' + (l.is_demo ? '<span class="demo">Demo</span>' : '') + '</div>' +
        '<div class="item-meta"><span>' + esc(l.commodity) + (l.grade ? ' · ' + esc(l.grade) : '') + '</span><span>' + Number(l.quantity_kg).toLocaleString('en-KE') + ' kg</span></div>' +
        '<div class="price">' + money(l.price_per_kg) + ' <small>/ kg</small></div>' +
        '<label class="status-select">Status <select data-act="status">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === l.status ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select></label>' +
        '<div class="card-actions"><a class="btn small outline" href="#/seller-form/' + Number(l.id) + '">Edit</a><button class="btn small danger" type="button" data-act="del-listing">Delete</button></div>' +
        '</article>';
    }).join('') : '<article class="listing-card empty"><h3>No listings yet</h3><p class="muted">Post your first produce listing so buyers can find you.</p><a class="btn small primary" href="#/seller-form">Add listing</a></article>';
  }

  function renderRoutes(rows) {
    $('statRoutes').textContent = rows.length;
    $('routeGrid').innerHTML = rows.length ? rows.map(function (r) {
      return '<article class="listing-card" data-id="' + Number(r.id) + '">' +
        '<div class="card-top"><h3>' + esc(r.route_name) + '</h3>' + (r.is_demo ? '<span class="demo">Demo</span>' : '') + '</div>' +
        '<div class="item-meta"><span>' + esc(r.origin) + ' → ' + esc(r.destination) + '</span><span>' + esc(r.vehicle || '') + '</span></div>' +
        '<div class="price">' + money(r.rate) + ' <small>/ km</small></div>' +
        '<div class="item-meta"><span>Capacity ' + Number(r.capacity_kg || 0).toLocaleString('en-KE') + ' kg</span><span>' + esc(r.service_days || '') + '</span></div>' +
        '<div class="card-actions"><a class="btn small outline" href="#/transporter-form/' + Number(r.id) + '">Edit</a><button class="btn small danger" type="button" data-act="del-route">Delete</button></div>' +
        '</article>';
    }).join('') : '<article class="listing-card empty"><h3>No routes yet</h3><p class="muted">Transporters: add the routes you drive so sellers can request quotes.</p><a class="btn small primary" href="#/transporter-form">Add route</a></article>';
  }

  function load() {
    return api('GET', '/api/users/me').then(function (u) {
      renderProfile(u);
      return Promise.all([api('GET', '/api/listings'), api('GET', '/api/routes')]);
    }).then(function (r) { renderListings(r[0]); renderRoutes(r[1]); })
      .catch(function (e) { if (location.hash.indexOf('#/dashboard') === 0) say(e.message, true); });
  }

  function onRoute() { if ((location.hash || '').indexOf('#/dashboard') === 0) { say(''); load(); } }
  window.addEventListener('hashchange', onRoute);
  onRoute();

  // Listing / route actions (event delegation)
  root.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-act="status"]');
    if (!sel) return;
    var id = sel.closest('[data-id]').dataset.id;
    api('PATCH', '/api/listings/' + id + '/status', { status: sel.value }).then(function () { say('Status updated.'); load(); }).catch(function (err) { say(err.message, true); });
  });
  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="del-listing"], [data-act="del-route"]');
    if (!btn) return;
    if (btn.dataset.confirm !== '1') { btn.dataset.confirm = '1'; btn.textContent = 'Tap again'; setTimeout(function () { btn.dataset.confirm = ''; btn.textContent = 'Delete'; }, 4000); return; }
    var id = btn.closest('[data-id]').dataset.id;
    var url = btn.dataset.act === 'del-listing' ? '/api/listings/' : '/api/routes/';
    api('DELETE', url + id).then(function () { say('Deleted.'); load(); }).catch(function (err) { say(err.message, true); });
  });

  // Profile panel
  $('editProfileBtn').addEventListener('click', function () {
    var p = $('profilePanel'); p.hidden = !p.hidden; this.setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('profileForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    api('PUT', '/api/users/me', { fullName: f.fullName.value, phone: f.phone.value, location: f.location.value, businessType: f.businessType.value, speciality: f.speciality.value })
      .then(function () { say('Profile saved.'); load(); }).catch(function (err) { say(err.message, true); });
  });
  $('passwordForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    api('PUT', '/api/users/me/password', { currentPassword: f.currentPassword.value, newPassword: f.newPassword.value })
      .then(function () { f.reset(); say('Password changed.'); }).catch(function (err) { say(err.message, true); });
  });
  $('deleteForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, b = f.querySelector('button');
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again to delete forever'; setTimeout(function () { b.dataset.confirm = ''; b.textContent = 'Delete my account'; }, 5000); return; }
    api('DELETE', '/api/users/me', { password: f.password.value })
      .then(function () { try { localStorage.removeItem('mkulima_user'); } catch (x) {} location.hash = '#/home'; })
      .catch(function (err) { say(err.message, true); });
  });

  $('logoutBtn').addEventListener('click', function () {
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).finally(function () {
      try { localStorage.removeItem('mkulima_user'); } catch (x) {}
      location.hash = '#/auth';
    });
  });
})(window.__r.dashboard);
