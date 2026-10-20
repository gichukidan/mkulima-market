(function(root){
  const userKey = 'mkulima_user';
  var user = null;

  function safeGetUser(){
    try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch (error) { return null; }
  }

  function titleCase(value){
    var v = value || 'Seller';
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  function setText(id, value){
    var el = root.getElementById(id);
    if (el) el.textContent = value || '';
  }

  function renderProfile(profile){
    var role = profile.role || 'seller';
    var name = profile.fullName || 'Mkulima Member';
    var avatarText = name.split(' ').map(function(part){ return part[0] || ''; }).slice(0,2).join('').toUpperCase() || 'M';

    root.getElementById('profileAvatar').textContent = avatarText;
    setText('profileName', name);
    setText('profileRole', titleCase(role));
    setText('profileLocation', profile.location || 'Location not set');
    setText('profileEmail', profile.email || 'No email added');
    setText('profilePhone', profile.phone || 'No phone number');
    setText('statListings', profile.activeListings || 0);
    setText('statOrders', profile.orders || 0);
    setText('statResponse', (profile.responseRate || 0) + '%');
    setText('statRating', profile.rating || '0.0');
    setText('businessType', profile.businessType || (role === 'transporter' ? 'Transport services' : role === 'buyer' ? 'Buyer profile' : 'Fresh produce seller'));
    setText('speciality', profile.speciality || (role === 'transporter' ? 'Regional logistics' : role === 'buyer' ? 'Produce buying' : 'No speciality added yet'));
    setText('delivery', profile.delivery || (role === 'transporter' ? 'Flexible delivery' : 'Not set yet'));
    root.getElementById('listHeading').textContent = role === 'transporter' ? 'Recent routes' : 'Recent listings';

    var listingGrid = root.getElementById('listingGrid');
    if (!listingGrid) return;

    var list = role === 'transporter' ? [] : [];
    if (!list.length) {
      listingGrid.innerHTML = '<article class="listing-card"><h3>No entries yet</h3><div class="item-meta"><span>Start by creating your first listing or route.</span></div><div class="price">—</div></article>';
      return;
    }

    listingGrid.innerHTML = list.map(function(item){
      return '<article class="listing-card"><h3>' + item.name + '</h3><div class="item-meta"><span>' + item.detail + '</span></div><div class="price">' + item.price + '</div></article>';
    }).join('');
  }

  fetch('/api/session', { credentials: 'same-origin' })
    .then(function(res){ return res.json(); })
    .then(function(data){
      if (!data.user) {
        location.hash = '#/auth';
        return;
      }

      user = data.user;
      localStorage.setItem(userKey, JSON.stringify(user));
      renderProfile({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location || 'Location not set',
        businessType: user.businessType || '',
        speciality: user.speciality || '',
        delivery: user.delivery || '',
        activeListings: 0,
        orders: 0,
        responseRate: 0,
        rating: '0.0'
      });
    })
    .catch(function(){
      var cached = safeGetUser();
      if (cached) {
        renderProfile({
          fullName: cached.fullName,
          email: cached.email,
          phone: cached.phone,
          role: cached.role,
          location: cached.location || 'Location not set',
          businessType: cached.businessType || '',
          speciality: cached.speciality || '',
          delivery: cached.delivery || '',
          activeListings: 0,
          orders: 0,
          responseRate: 0,
          rating: '0.0'
        });
      } else {
        location.hash = '#/auth';
      }
    });

  var logoutBtn = root.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
        .then(function(){
          try { localStorage.removeItem(userKey); } catch (error) {}
          location.hash = '#/auth';
        })
        .catch(function(){
          try { localStorage.removeItem(userKey); } catch (error) {}
          location.hash = '#/auth';
        });
    });
  }
})(window.__r.dashboard);
