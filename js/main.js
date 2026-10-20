/* Builds one shadow root per view (isolated CSS and ids), then loads page scripts and the router.
   Every asset URL carries ?v=<version> so browsers can cache it for a year and still get updates. */
(async function () {
  var V = document.documentElement.dataset.v;
  var q = V && V.indexOf("{{") < 0 ? "?v=" + V : "";
  var views = ["home", "map", "ai", "auth", "dashboard", "seller-form", "transporter-form"];
  window.__r = {};
  await Promise.all(views.map(async function (k) {
    var cssFile = k === 'seller-form' || k === 'transporter-form' ? 'forms.css' : k + '.css';
    var res = await fetch("/partials/" + k + ".html" + q);
    var host = document.getElementById("v-" + k);
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = '<link rel="stylesheet" href="/css/' + cssFile + q + '">' + (await res.text());
    window.__r[k] = root;
  }));
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src + q; s.onload = ok; s.onerror = no; document.body.appendChild(s); }); }
  for (var s of ["/js/pages/home.js", "/js/pages/map.js", "/js/pages/ai.js", "/js/pages/auth.js", "/js/pages/dashboard.js", "/js/pages/forms.js", "/js/shell.js"]) await load(s);
})();

/* Progressive Web App: offline cache + "Install app" button */
(function () {
  var toast = document.getElementById("toast");
  function show(msg, actionLabel, action) {
    if (!toast) return;
    toast.textContent = msg;
    if (actionLabel) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = actionLabel;
      b.onclick = function () { toast.hidden = true; action(); };
      toast.appendChild(b);
    }
    toast.hidden = false;
    if (!actionLabel) setTimeout(function () { toast.hidden = true; }, 5000);
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").then(function (reg) {
        // A new version was downloaded in the background: offer a reload.
        reg.addEventListener("updatefound", function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", function () {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              show("A new version of Mkulima Market is ready.", "Reload", function () { location.reload(); });
            }
          });
        });
      }).catch(function (e) { console.warn("Service worker not registered", e); });
    });
  }

  var deferred = null;
  var btn = document.getElementById("inst");
  var standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (btn && !standalone) btn.hidden = false;
  });
  // iOS Safari has no install prompt: show the button and explain the Share menu instead.
  if (btn && isIos && !standalone) btn.hidden = false;

  if (btn) btn.addEventListener("click", function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; btn.hidden = true; });
    } else if (isIos) {
      show(document.documentElement.lang === "sw"
        ? "Gusa kitufe cha Share, kisha \"Add to Home Screen\"."
        : "Tap the Share button, then \"Add to Home Screen\".");
    }
  });
  window.addEventListener("appinstalled", function () {
    if (btn) btn.hidden = true;
    show(document.documentElement.lang === "sw" ? "Mkulima Market imesakinishwa." : "Mkulima Market is installed.");
  });
  window.addEventListener("offline", function () {
    show(document.documentElement.lang === "sw" ? "Uko nje ya mtandao. Kurasa ulizotembelea bado zinapatikana." : "You are offline. Pages you have visited still work.");
  });
})();
