/* Builds one shadow root per view (isolated CSS and ids), then loads page scripts and the router. */
(async function () {
  var views = ["home", "map", "ai", "auth", "dashboard", "seller-form", "transporter-form"];
  window.__r = {};
  await Promise.all(views.map(async function (k) {
    var cssFile = k === 'seller-form' || k === 'transporter-form' ? 'forms.css' : k + '.css';
    var res = await fetch("partials/" + k + ".html");
    var host = document.getElementById("v-" + k);
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = '<link rel="stylesheet" href="css/' + cssFile + '">' + (await res.text());
    window.__r[k] = root;
  }));
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.body.appendChild(s); }); }
  for (var s of ["js/pages/home.js", "js/pages/map.js", "js/pages/ai.js", "js/pages/auth.js", "js/pages/dashboard.js", "js/pages/forms.js", "js/shell.js"]) await load(s);
})();
