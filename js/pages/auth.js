(function(root){
  var userKey = "mkulima_user";
  var roleKey = "mkulima_selected_role";
  var form = root.getElementById("signupForm");
  var loginForm = root.getElementById("loginForm");
  var roleButtons = root.querySelectorAll(".role-card");

  function setRole(role){
    sessionStorage.setItem(roleKey, role);
    roleButtons.forEach(function(btn){
      var active = btn.dataset.role === role;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function saveLocalUser(profile){
    try {
      localStorage.setItem(userKey, JSON.stringify(profile));
    } catch (error) {}
  }

  function clearLocalUser(){
    try { localStorage.removeItem(userKey); } catch (error) {}
  }

  roleButtons.forEach(function(btn){
    btn.addEventListener("click", function(){ setRole(btn.dataset.role); });
  });

  var savedRole = sessionStorage.getItem(roleKey) || "seller";
  setRole(savedRole);

  form.addEventListener("submit", function(event){
    event.preventDefault();
    var data = Object.fromEntries(new FormData(form).entries());
    var role = sessionStorage.getItem(roleKey) || "seller";

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: role
      })
    }).then(async function(res){
      const result = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(result.error || 'Registration failed');
      saveLocalUser({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: role
      });
      location.hash = "#/dashboard";
    }).catch(function(error){
      alert(error.message || 'Unable to create account');
    });
  });

  loginForm.addEventListener("submit", function(event){
    event.preventDefault();
    var data = Object.fromEntries(new FormData(loginForm).entries());

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: data.email, password: data.password })
    }).then(async function(res){
      const result = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(result.error || 'Login failed');
      saveLocalUser(result.user || { email: data.email });
      location.hash = "#/dashboard";
    }).catch(function(error){
      alert(error.message || 'Unable to log in');
    });
  });
})(window.__r.auth);
