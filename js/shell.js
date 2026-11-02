/* Navbar, router, language, theme, sign-in state and notifications. Views live in shadow roots (window.__r, built by main.js). */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var SW = { home: "Mwanzo", produce: "Sokoni", map: "Ramani", pricing: "Bei", faq: "Maswali", ai: "Uliza Mkulima", login: "Ingia", dashboard: "Dashibodi" };
  var EN = {};
  var lang = "en";
  // route key -> [view, element id to scroll to ("top" = page top)]
  var R = {
    home: ["home", "top"], project: ["home", "top"], produce: ["home", "produce"], pricing: ["home", "pricing"], faq: ["home", "faq"],
    map: ["map", "top"], ai: ["ai", "top"], market: ["ai", "intel"],
    auth: ["auth", "top"], login: ["auth", "top"], signup: ["auth", "top"],
    dashboard: ["dashboard", "top"], "seller-form": ["seller-form", "top"], "transporter-form": ["transporter-form", "top"],
    profile: ["profile", "top"], listing: ["listing", "top"]
  };
  // which nav item to highlight for each route
  var NAV = { home: "home", project: "home", produce: "produce", listing: "produce", pricing: "pricing", faq: "faq", map: "map", ai: "ai", market: "ai", auth: "login", login: "login", signup: "login", dashboard: "dashboard", "seller-form": "dashboard", "transporter-form": "dashboard", profile: "profile" };
  // Pages that need a signed-in user. #/profile/<id> (someone else's profile) is public.
  function needsLogin(k, parts) { return k === "dashboard" || k === "seller-form" || k === "transporter-form" || (k === "profile" && !parts[1]); }

  function label(a) { return a.querySelector("[data-lbl]") || a; }
  document.querySelectorAll("#sn a[data-k]:not(.me)").forEach(function (a) { EN[a.dataset.k] = label(a).textContent; });

  function setActive(k) {
    document.querySelectorAll("#sn a[data-k]").forEach(function (a) {
      if (a.dataset.k === k) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- signed-in state ---------- */
  function paintAuth() {
    var u = window.MK.me;
    $("loginL").hidden = !!u;
    $("dashl").hidden = !u;
    $("meL").hidden = !u;
    $("bellw").hidden = !u;
    if (u) $("meAv").textContent = window.MK.initials(u.fullName);
    var n = window.MK.unread || 0;
    $("bn").hidden = !n; $("bn").textContent = n > 99 ? "99+" : n;
    $("bell").setAttribute("aria-label", (lang == "sw" ? "Arifa" : "Notifications") + (n ? " (" + n + ")" : ""));
  }
  var lastId;
  function refreshSession() {
    return fetch("/api/session", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (d) {
      var prev = lastId;
      window.MK.me = d.user || null; window.MK.unread = d.unread || 0;
      lastId = window.MK.me ? window.MK.me.id : null;
      paintAuth();
      if (prev !== undefined && prev !== lastId) document.dispatchEvent(new CustomEvent("mk:auth", { detail: { user: window.MK.me } }));
      return window.MK.me;
    }).catch(function () { return window.MK.me || null; });
  }
  document.addEventListener("mk:session-refresh", function () { refreshSession(); });

  var view = "home";
  function show(k) {
    view = R[k][0];
    var s = R[k][1];
    document.querySelectorAll(".view").forEach(function (e) { e.classList.toggle("on", e.id == "v-" + view); });
    setActive(NAV[k] || "");
    $("sn").classList.remove("open");
    $("hb").setAttribute("aria-expanded", "false");
    closeBell();
    scrollTo(0, 0);
    var el = s != "top" && window.__r[view] && window.__r[view].getElementById(s);
    if (el) setTimeout(function () { el.scrollIntoView(); }, 30);
    document.dispatchEvent(new CustomEvent("mk:route", { detail: { key: k, view: view } }));
  }
  var token = 0;
  function route() {
    var parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/"), k = parts[0] || "home";
    if (k == "home" && parts[1]) k = parts[1];
    if (!R[k]) k = "home";
    var mine = ++token;
    if (needsLogin(k, parts)) {
      // Signed-in pages stay hidden until we know who is asking.
      document.querySelectorAll(".view").forEach(function (e) { e.classList.remove("on"); });
      refreshSession().then(function (u) {
        if (mine !== token) return;
        if (!u) { location.replace("#/login"); return; }
        show(k);
      });
      return;
    }
    show(k);
    refreshSession().then(function (u) {
      if (mine !== token) return;
      // Already signed in? The log-in and sign-up screens send you to your dashboard.
      if (u && (k == "login" || k == "signup" || k == "auth")) location.replace("#/dashboard");
    });
  }
  addEventListener("hashchange", route);

  // Scroll spy: on the landing page, highlight the section currently in the middle of the screen.
  (function spy() {
    var home = window.__r.home;
    if (!home || !("IntersectionObserver" in window)) return;
    var ids = { top: "home", produce: "produce", how: "", pricing: "pricing", faq: "faq" };
    var io = new IntersectionObserver(function (es) {
      if (view !== "home") return;
      es.forEach(function (e) { if (e.isIntersecting) setActive(ids[e.target.id]); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(ids).forEach(function (id) { var el = home.getElementById(id); if (el) io.observe(el); });
  })();

  // In-view links: "#/x" routes, "#id" scrolls within the view.
  Object.keys(window.__r).forEach(function (k) {
    var r = window.__r[k];
    r.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      var a = e.composedPath().filter(function (n) { return n.tagName == "A"; })[0];
      if (!a) return;
      var h = a.getAttribute("href") || "";
      if (a.dataset.go) { e.preventDefault(); location.hash = a.dataset.go; return; }
      if (h.length > 1 && h.charAt(1) != "/" && h.charAt(0) == "#") {
        var t = r.getElementById(h.slice(1));
        if (t) { e.preventDefault(); t.scrollIntoView(); }
      } else if (h == "#") e.preventDefault();
    });
  });

  /* ---------- language ---------- */
  // Older views (home, map, ai, auth) toggle through a hidden button; newer views listen for "mk:lang".
  var LEGACY = [["home", "lang"], ["map", "lg"], ["ai", "lg"], ["auth", "lg"]];
  function setLang(next, save) {
    if (next === lang) return;
    lang = next;
    document.documentElement.lang = lang;
    LEGACY.forEach(function (p) { var r = window.__r[p[0]], b = r && r.getElementById(p[1]); if (b) b.click(); });
    document.documentElement.lang = lang; // legacy views also set it; keep it in step
    $("sl2").querySelector("b").textContent = lang == "en" ? "SW" : "EN";
    document.querySelectorAll("#sn a[data-k]:not(.me)").forEach(function (a) { label(a).textContent = lang == "sw" ? (SW[a.dataset.k] || EN[a.dataset.k]) : EN[a.dataset.k]; });
    $("sth").setAttribute("aria-label", themeLabel());
    $("bell").setAttribute("aria-label", lang == "sw" ? "Arifa" : "Notifications");
    paintAuth();
    if (!$("bellPop").hidden) renderBell();
    if (save) try { localStorage.setItem("mk-lang", lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent("mk:lang", { detail: { lang: lang } }));
  }
  $("sl2").onclick = function () { setLang(lang == "en" ? "sw" : "en", true); };

  /* ---------- theme: saved choice, else the system setting. Every shadow host gets the same data-theme. ---------- */
  function themeLabel() {
    var dark = document.documentElement.dataset.theme == "dark";
    return lang == "sw" ? (dark ? "Badilisha kuwa hali ya mwanga" : "Badilisha kuwa hali ya giza") : (dark ? "Switch to light mode" : "Switch to dark mode");
  }
  function theme(t, save) {
    document.documentElement.dataset.theme = t;
    Object.keys(window.__r).forEach(function (k) { window.__r[k].host.dataset.theme = t; });
    $("sth").setAttribute("aria-label", themeLabel());
    if (save) try { localStorage.setItem("mk-theme", t); } catch (e) {}
  }
  $("sth").onclick = function () { theme(document.documentElement.dataset.theme == "dark" ? "light" : "dark", true); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    var saved = null; try { saved = localStorage.getItem("mk-theme"); } catch (x) {}
    if (!saved) theme(e.matches ? "dark" : "light");
  });

  $("hb").onclick = function () { var o = $("sn").classList.toggle("open"); this.setAttribute("aria-expanded", o); };
  addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("bellPop").hidden) { closeBell(); $("bell").focus(); return; }
    if ($("sn").classList.contains("open")) { $("sn").classList.remove("open"); $("hb").setAttribute("aria-expanded", "false"); $("hb").focus(); }
  });

  /* ---------- notification bell ---------- */
  function closeBell() { $("bellPop").hidden = true; $("bell").setAttribute("aria-expanded", "false"); }
  function renderBell(items) {
    var MK = window.MK, pop = $("bellPop");
    if (items) pop._items = items; else items = pop._items || [];
    var h = '<div class="bp-h"><b>' + (lang == "sw" ? "Arifa" : "Notifications") + '</b><button type="button" id="bpAll">' + (lang == "sw" ? "Weka zote zimesomwa" : "Mark all read") + '</button></div>';
    if (!items.length) h += '<div class="bp-e">' + (lang == "sw" ? "Hakuna arifa bado. Shughuli kwenye matangazo na wasifu wako zitaonekana hapa." : "No notifications yet. Activity on your listings and profile shows up here.") + '</div>';
    else h += items.slice(0, 8).map(function (n) {
      return '<a class="bp-i' + (n.read ? "" : " un") + '" href="' + MK.esc(n.link || "#/dashboard") + '" data-id="' + n.id + '"><span class="bp-ic">' + MK.notifIcon(n.type) + '</span><span>' + MK.esc(MK.notifText(n)) + '<small>' + MK.esc(MK.ago(n.createdAt)) + '</small></span></a>';
    }).join("");
    h += '<a class="bp-f" href="#/dashboard">' + (lang == "sw" ? "Fungua dashibodi" : "Open dashboard") + '</a>';
    pop.innerHTML = h;
  }
  $("bell").onclick = function (e) {
    e.stopPropagation();
    var pop = $("bellPop");
    if (!pop.hidden) { closeBell(); return; }
    pop.hidden = false; this.setAttribute("aria-expanded", "true");
    renderBell([]);
    window.MK.api("GET", "/api/notifications?limit=20", null, { quiet: true }).then(function (d) { window.MK.unread = d.unread; paintAuth(); renderBell(d.items); }).catch(function () {});
  };
  $("bellPop").addEventListener("click", function (e) {
    e.stopPropagation();
    if (e.target.id === "bpAll") {
      window.MK.api("POST", "/api/notifications/read", {}, { quiet: true }).then(function (d) {
        window.MK.unread = d.unread; paintAuth();
        $("bellPop")._items.forEach(function (n) { n.read = true; }); renderBell();
        document.dispatchEvent(new CustomEvent("mk:notifications-read"));
      });
      return;
    }
    var a = e.target.closest("a.bp-i");
    if (a) { window.MK.api("POST", "/api/notifications/read", { ids: [Number(a.dataset.id)] }, { quiet: true }).then(function (d) { window.MK.unread = d.unread; paintAuth(); }); closeBell(); }
  });
  document.addEventListener("click", function (e) { if (!$("bellw").contains(e.target)) closeBell(); });
  // Keep the unread count fresh while the tab is open and someone is signed in.
  setInterval(function () { if (!document.hidden && window.MK.me) refreshSession(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && window.MK.me) refreshSession(); });

  theme(document.documentElement.dataset.theme || "light");
  var saved = null; try { saved = localStorage.getItem("mk-lang"); } catch (e) {}
  if (saved === "sw") setLang("sw");
  route();
})();
