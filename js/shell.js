/* Navbar, router, language and theme. Views live in shadow roots (window.__r, built by main.js). */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var SW = { produce: "Sokoni", map: "Usafiri", pricing: "Bei", faq: "Maswali", ai: "Uliza Mkulima", login: "Ingia" };
  var EN = {};
  var lang = "en";
  // route key -> [view, element id to scroll to ("top" = page top)]
  var R = {
    home: ["home", "top"], project: ["home", "top"], produce: ["home", "produce"], pricing: ["home", "pricing"], faq: ["home", "faq"],
    map: ["map", "top"], ai: ["ai", "top"], market: ["ai", "intel"],
    auth: ["auth", "top"], login: ["auth", "top"], signup: ["auth", "top"],
    dashboard: ["dashboard", "top"], "seller-form": ["seller-form", "top"], "transporter-form": ["transporter-form", "top"]
  };
  // which nav item to highlight for each route
  var NAV = { produce: "produce", pricing: "pricing", faq: "faq", map: "map", ai: "ai", market: "ai", auth: "login", login: "login", signup: "login" };

  function label(a) { return a.querySelector("[data-lbl]") || a; }
  document.querySelectorAll("#sn a[data-k]").forEach(function (a) { EN[a.dataset.k] = label(a).textContent; });

  function setActive(k) {
    document.querySelectorAll("#sn a[data-k]").forEach(function (a) {
      if (a.dataset.k === k) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  var view = "home";
  function route() {
    var p = (location.hash || "#/home").replace(/^#\/?/, "").split("/"), k = p[0] || "home";
    if (k == "home" && p[1]) k = p[1];
    if (!R[k]) k = "home";
    view = R[k][0];
    var s = R[k][1];
    document.querySelectorAll(".view").forEach(function (e) { e.classList.toggle("on", e.id == "v-" + view); });
    setActive(NAV[k] || "");
    $("sn").classList.remove("open");
    $("hb").setAttribute("aria-expanded", "false");
    scrollTo(0, 0);
    var el = s != "top" && window.__r[view] && window.__r[view].getElementById(s);
    if (el) setTimeout(function () { el.scrollIntoView(); }, 30);
    document.dispatchEvent(new CustomEvent("mk:route", { detail: { key: k, view: view } }));
  }
  addEventListener("hashchange", route);

  // Scroll spy: on the landing page, highlight the section currently in the middle of the screen.
  (function spy() {
    var home = window.__r.home;
    if (!home || !("IntersectionObserver" in window)) return;
    var ids = { top: "", produce: "produce", how: "", pricing: "pricing", faq: "faq" };
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

  // Language: each view has a hidden toggle button the navbar clicks.
  $("sl2").onclick = function () {
    lang = lang == "en" ? "sw" : "en";
    [["home", "lang"], ["map", "lg"], ["ai", "lg"], ["auth", "lg"]].forEach(function (p) {
      var r = window.__r[p[0]], b = r && r.getElementById(p[1]);
      if (b) b.click();
    });
    this.querySelector("b").textContent = lang == "en" ? "SW" : "EN";
    document.querySelectorAll("#sn a[data-k]").forEach(function (a) { label(a).textContent = lang == "sw" ? (SW[a.dataset.k] || EN[a.dataset.k]) : EN[a.dataset.k]; });
    document.documentElement.lang = lang;
  };

  // Theme: saved choice, else the system setting. Every shadow host gets the same data-theme.
  function theme(t, save) {
    document.documentElement.dataset.theme = t;
    Object.keys(window.__r).forEach(function (k) { window.__r[k].host.dataset.theme = t; });
    $("sth").setAttribute("aria-label", t == "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (save) try { localStorage.setItem("mk-theme", t); } catch (e) {}
  }
  $("sth").onclick = function () { theme(document.documentElement.dataset.theme == "dark" ? "light" : "dark", true); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    var saved = null; try { saved = localStorage.getItem("mk-theme"); } catch (x) {}
    if (!saved) theme(e.matches ? "dark" : "light");
  });

  $("hb").onclick = function () { var o = $("sn").classList.toggle("open"); this.setAttribute("aria-expanded", o); };
  addEventListener("keydown", function (e) { if (e.key === "Escape" && $("sn").classList.contains("open")) { $("sn").classList.remove("open"); $("hb").setAttribute("aria-expanded", "false"); $("hb").focus(); } });

  theme(document.documentElement.dataset.theme || "light");
  route();
})();
