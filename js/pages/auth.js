/* Log in and sign up. #/login and #/auth show the log-in screen; #/signup shows sign-up.
   Runs inside a shadow root passed in as `root`. */
(function (root) {
  var $ = function (i) { return root.getElementById(i); };
  var userKey = "mkulima_user";
  var roleKey = "mkulima_selected_role";
  var ROLES = ["seller", "transporter"];
  var lang = "en";
  var SW = {
    artQ: "Uza mavuno yako, jaza lori lako, na ulipwe kwa haki.", artS: "Wakulima, wavuvi, wafugaji na wasafirishaji kote Kenya.",
    liH: "Karibu tena", liP: "Ingia kusimamia matangazo na njia zako.", email: "Barua pepe", pw: "Nenosiri", pwPh: "Weka nenosiri lako", liB: "Ingia",
    noAcc: "Huna akaunti?", toSign: "Jisajili",
    suH: "Fungua akaunti yako", suP: "Ni bure. Chagua jinsi utakavyotumia Mkulima Market.", rS: "Muuzaji", rSp: "Mkulima, mvuvi, mfugaji au mfanyabiashara", rT: "Msafirishaji", rTp: "Mwenye lori, pickup au pikipiki",
    name: "Jina kamili", phone: "Simu", pwNew: "Angalau herufi 8", suB: "Fungua akaunti", haveAcc: "Una akaunti tayari?", toLog: "Ingia"
  };
  var MSG = {
    en: { req: "Fill in every field.", email: "Enter a valid email address.", pw: "Use at least 8 characters for your password.", reg: "Could not create your account. Try again.", log: "Email or password is wrong.", show: "Show password", hide: "Hide password" },
    sw: { req: "Jaza kila sehemu.", email: "Weka barua pepe sahihi.", pw: "Nenosiri liwe na angalau herufi 8.", reg: "Hatukuweza kufungua akaunti. Jaribu tena.", log: "Barua pepe au nenosiri si sahihi.", show: "Onyesha nenosiri", hide: "Ficha nenosiri" }
  };
  var EN = {};
  root.querySelectorAll("[data-t]").forEach(function (e) { EN[e.dataset.t] = e.textContent; });
  root.querySelectorAll("[data-p]").forEach(function (e) { EN[e.dataset.p] = e.placeholder; });
  function T(k) { return lang === "sw" && SW[k] ? SW[k] : EN[k]; }

  // Which screen: follow the route.
  function mode() {
    var signup = /^#\/signup/.test(location.hash);
    $("signupPanel").hidden = !signup;
    $("loginPanel").hidden = signup;
  }
  addEventListener("hashchange", mode);

  // Role choice (seller or transporter only)
  var cards = root.querySelectorAll(".role-card");
  function setRole(role) {
    if (ROLES.indexOf(role) < 0) role = "seller";
    try { sessionStorage.setItem(roleKey, role); } catch (e) {}
    cards.forEach(function (c) { c.setAttribute("aria-checked", c.dataset.role === role ? "true" : "false"); c.tabIndex = c.dataset.role === role ? 0 : -1; });
  }
  function getRole() { try { return sessionStorage.getItem(roleKey); } catch (e) { return null; } }
  cards.forEach(function (c, i) {
    c.addEventListener("click", function () { setRole(c.dataset.role); });
    c.addEventListener("keydown", function (e) { // arrow keys move within the radio group
      if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].indexOf(e.key) < 0) return;
      e.preventDefault();
      var n = cards[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : cards.length - 1)) % cards.length];
      setRole(n.dataset.role); n.focus();
    });
  });
  setRole(getRole() || "seller");

  // Show / hide password
  root.querySelectorAll(".eye").forEach(function (b) {
    b.addEventListener("click", function () {
      var input = b.parentNode.querySelector("input"), on = input.type === "password";
      input.type = on ? "text" : "password";
      b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", on ? MSG[lang].hide : MSG[lang].show);
    });
  });

  function fail(form, msg, field) {
    var p = form.querySelector(".err");
    p.textContent = msg; p.hidden = false;
    form.querySelectorAll("input").forEach(function (i) { i.removeAttribute("aria-invalid"); });
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }
  function busy(form, on) { var b = form.querySelector("[type=submit]"); b.disabled = on; b.setAttribute("aria-busy", on); }
  function saveLocalUser(profile) { try { localStorage.setItem(userKey, JSON.stringify(profile)); } catch (e) {} }
  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { if (!res.ok) throw new Error(d.error || ""); return d; }); });
  }
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var form = $("signupForm");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, m = MSG[lang];
    var empty = [f.fullName, f.email, f.phone, f.password].filter(function (i) { return !i.value.trim(); })[0];
    if (empty) return fail(form, m.req, empty);
    if (!emailRe.test(f.email.value.trim())) return fail(form, m.email, f.email);
    if (f.password.value.length < 8) return fail(form, m.pw, f.password);
    var role = getRole() || "seller";
    busy(form, true);
    post("/api/register", { fullName: f.fullName.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), password: f.password.value, role: role })
      .then(function () {
        saveLocalUser({ fullName: f.fullName.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), role: role });
        location.hash = "#/dashboard";
      })
      .catch(function (err) { fail(form, err.message || m.reg); })
      .then(function () { busy(form, false); });
  });

  var loginForm = $("loginForm");
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = loginForm.elements, m = MSG[lang];
    if (!f.email.value.trim()) return fail(loginForm, m.req, f.email);
    if (!f.password.value) return fail(loginForm, m.req, f.password);
    busy(loginForm, true);
    post("/api/login", { email: f.email.value.trim(), password: f.password.value })
      .then(function (d) { saveLocalUser(d.user || { email: f.email.value.trim() }); location.hash = "#/dashboard"; })
      .catch(function (err) { fail(loginForm, err.message || m.log, f.password); })
      .then(function () { busy(loginForm, false); });
  });

  // The navbar's language button clicks this hidden button (see js/shell.js).
  $("lg").onclick = function () {
    lang = lang === "en" ? "sw" : "en";
    root.querySelectorAll("[data-t]").forEach(function (e) { e.textContent = T(e.dataset.t); });
    root.querySelectorAll("[data-p]").forEach(function (e) { e.placeholder = T(e.dataset.p); });
  };

  mode();
})(window.__r.auth);
