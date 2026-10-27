/* Ask Mkulima AI. Runs inside a shadow root passed in as `root`.
   Chat: the server streams progress steps (Server-Sent Events) and then the answer. */
(function (root) {
var MKDATA = window.MKDATA, TOWNS = MKDATA.towns, PR = MKDATA.priceReports, LI = [];
var L = {
en: {
  h1: "Ask Mkulima AI", lead: "Answers from live listings, in English or Kiswahili.", newc: "New chat",
  gps: "Use my location", loc0: "Set your location to get distances.", loc1: "Location: ", gpsErr: "Location unavailable or declined. Choose a town instead.", town0: "Choose town",
  hello: "Habari! What do you need today?", helloP: "Ask about produce, prices, nearby sellers, transport or how to sell your harvest.",
  ph: "Ask about produce, prices or transport", hint: "Enter to send, Shift + Enter for a new line. Check details with the seller before you pay.",
  sug: [["search", "Find potatoes near me"], ["chart", "How are tomato prices trending?"], ["truck", "I have a lorry from Nakuru to Nairobi. Who needs transport?"], ["sprout", "How can I find buyers for my tomatoes?"]],
  steps: { thinking: "Reading your question", search_listings: "Searching listings", search_knowledge: "Checking farming guides", nearby_sellers: "Finding nearby sellers", get_user_location: "Checking your location" },
  sources: "Sources", copy: "Copy", copied: "Copied", retry: "Try again", stopped: "Stopped. Ask again when you are ready.",
  liH: "Listings found", liP: "Listings the assistant mentions appear here.", noli: "Ask a question and matching listings will show here.",
  askp: "asking price", straight: "straight-line", qty: " kg available",
  offline: "You are offline. Connect to the internet to ask Mkulima AI.", fail: "The assistant could not answer. ", limit: "Too many questions in a short time. Wait a moment and try again.",
  miH: "Market insights", miP: "A trend line appears only with at least 5 reported prices for one commodity at one market. Asking, reported and confirmed prices are kept apart.",
  rep: "Reported market price", ask2: "Asking price", conf: "Confirmed transaction", trend: "Change over the period", dt: "Date", ty: "Type", pc: "Price (KSh)", src: "Source",
  few: "Not enough reliable data for a trend. At least 5 reported prices are needed; this series has ", chg: "Reported price moved from KSh ", to: " to KSh ", over: " over ", wk: " weeks. This describes past reports only and is not a forecast.",
  foot: "Ask Mkulima AI is powered by Google Gemini through our server. It only uses Mkulima Market data and says when information is missing. Limit: 20 questions per hour."
},
sw: {
  h1: "Uliza Mkulima AI", lead: "Majibu kutoka kwa matangazo halisi, kwa Kiingereza au Kiswahili.", newc: "Mazungumzo mapya",
  gps: "Tumia eneo langu", loc0: "Weka eneo lako kupata umbali.", loc1: "Eneo: ", gpsErr: "Eneo halipatikani au umekataa. Chagua mji.", town0: "Chagua mji",
  hello: "Habari! Unahitaji nini leo?", helloP: "Uliza kuhusu mazao, bei, wauzaji walio karibu, usafiri au jinsi ya kuuza mavuno yako.",
  ph: "Uliza kuhusu mazao, bei au usafiri", hint: "Enter kutuma, Shift + Enter kwa mstari mpya. Thibitisha na muuzaji kabla ya kulipa.",
  sug: [["search", "Tafuta viazi karibu nami"], ["chart", "Bei za nyanya zinaendeleaje?"], ["truck", "Nina lori kutoka Nakuru hadi Nairobi. Nani anahitaji usafiri?"], ["sprout", "Ninawezaje kupata wanunuzi wa nyanya zangu?"]],
  steps: { thinking: "Nasoma swali lako", search_listings: "Natafuta matangazo", search_knowledge: "Naangalia miongozo ya kilimo", nearby_sellers: "Natafuta wauzaji wa karibu", get_user_location: "Naangalia eneo lako" },
  sources: "Vyanzo", copy: "Nakili", copied: "Imenakiliwa", retry: "Jaribu tena", stopped: "Imesimamishwa. Uliza tena ukiwa tayari.",
  liH: "Matangazo yaliyopatikana", liP: "Matangazo anayotaja msaidizi yanaonekana hapa.", noli: "Uliza swali na matangazo yanayolingana yataonekana hapa.",
  askp: "bei ya kuuliza", straight: "mstari ulionyooka", qty: " kg zinapatikana",
  offline: "Uko nje ya mtandao. Unganisha intaneti ili kuuliza Mkulima AI.", fail: "Msaidizi hakuweza kujibu. ", limit: "Maswali mengi mno kwa muda mfupi. Subiri kidogo kisha ujaribu tena.",
  miH: "Taarifa za soko", miP: "Mstari wa mwelekeo huonekana tu kukiwa na ripoti angalau 5 za bei za zao moja sokoni mmoja. Bei za kuuliza, zilizoripotiwa na zilizothibitishwa zimetenganishwa.",
  rep: "Bei ya soko iliyoripotiwa", ask2: "Bei ya kuuliza", conf: "Muamala uliothibitishwa", trend: "Mabadiliko katika kipindi", dt: "Tarehe", ty: "Aina", pc: "Bei (KSh)", src: "Chanzo",
  few: "Data ya kuaminika haitoshi kwa mwelekeo. Ripoti angalau 5 za bei zinahitajika; mfululizo huu una ", chg: "Bei iliyoripotiwa ilihama kutoka KSh ", to: " hadi KSh ", over: " katika wiki ", wk: ". Hii inaelezea ripoti zilizopita pekee, si utabiri.",
  foot: "Uliza Mkulima AI inaendeshwa na Google Gemini kupitia seva yetu. Inatumia data ya Mkulima Market pekee na husema taarifa ikikosekana. Kikomo: maswali 20 kwa saa."
}};
var ICON = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.3-4.1a1 1 0 0 0-.8-.4H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  sprout: '<svg viewBox="0 0 24 24"><path d="M12 22V12M12 12C12 7 15 4 21 4c0 5-3 8-9 8ZM12 15c0-4-2.5-6.5-8-6.5 0 4.5 2.5 6.5 8 6.5Z"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>'
};
var lang = "en", loc = null, hist = [], busy = false, ctl = null;
var $ = function (i) { return root.getElementById(i); }, T = function (k) { return L[lang][k]; };
var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function md(s) {
  s = esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  s = s.replace(/\[([^\]]+)\]\(#l-(\d+)\)/g, '<a href="#l-$2" data-l="$2">$1</a>');
  return s.replace(/\[([^\]]+)\]\((https:\/\/www\.openstreetmap\.org\/directions[^)\s]+)\)/g, '<a target="_blank" rel="noopener" href="$2">$1</a>');
}

/* ---------- scrolling: follow new messages unless the reader scrolled up ---------- */
var sc = $("scroll");
function nearBottom() { return sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80; }
function toBottom(force) { if (force || nearBottom()) sc.scrollTop = sc.scrollHeight; }
sc.addEventListener("scroll", function () { $("down").hidden = nearBottom(); });
$("down").onclick = function () { sc.scrollTo({ top: sc.scrollHeight, behavior: reduced ? "auto" : "smooth" }); };

/* ---------- messages ---------- */
function userMsg(text) {
  var r = document.createElement("div"); r.className = "row-u fade";
  r.innerHTML = '<div class="b u">' + esc(text) + "</div>";
  $("msgs").appendChild(r);
}
function aiMsg() {
  var r = document.createElement("div"); r.className = "row-a fade";
  r.innerHTML = '<span class="avatar">' + ICON.spark + '</span><div class="body"><ul class="steps"></ul><div class="b a"><span class="typing"><span></span><span></span><span></span></span></div></div>';
  $("msgs").appendChild(r);
  return { row: r, steps: r.querySelector(".steps"), b: r.querySelector(".b.a"), body: r.querySelector(".body") };
}
function step(m, name) {
  var last = m.steps.lastElementChild;
  if (last && last.dataset.n === name) return;
  if (last) last.classList.add("ok");
  var li = document.createElement("li"); li.dataset.n = name;
  li.innerHTML = "<i></i>" + esc(T("steps")[name] || name.replace(/_/g, " "));
  m.steps.appendChild(li); toBottom();
}
function finishSteps(m) { m.steps.querySelectorAll("li").forEach(function (li) { li.classList.add("ok"); }); }
function actions(m, text, retryText) {
  var a = document.createElement("div"); a.className = "acts";
  if (text) a.innerHTML += '<button type="button" data-a="copy">' + ICON.copy + "<span>" + esc(T("copy")) + "</span></button>";
  if (retryText) a.innerHTML += '<button type="button" data-a="retry">' + ICON.retry + "<span>" + esc(T("retry")) + "</span></button>";
  a.onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.a === "copy" && navigator.clipboard) navigator.clipboard.writeText(text).then(function () { b.querySelector("span").textContent = T("copied"); setTimeout(function () { b.querySelector("span").textContent = T("copy"); }, 1600); });
    if (b.dataset.a === "retry") { m.row.remove(); var u = $("msgs").lastElementChild; if (u && u.classList.contains("row-u")) u.remove(); ask(retryText); }
  };
  m.body.appendChild(a);
}

/* ---------- send / stop ---------- */
function setBusy(on) {
  busy = on;
  $("send").classList.toggle("stop", on);
  $("send").setAttribute("aria-label", on ? "Stop" : "Send");
  $("newChat").disabled = on || !hist.length;
  sendState();
}
function sendState() { $("send").disabled = !busy && !$("q").value.trim(); }

// Reads a text/event-stream body and calls onEvent(name, data) for each event.
async function readSSE(res, onEvent) {
  var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
  for (;;) {
    var r = await reader.read(); if (r.done) break;
    buf += dec.decode(r.value, { stream: true });
    var parts = buf.split("\n\n"); buf = parts.pop();
    parts.forEach(function (p) {
      var ev = "message", data = "";
      p.split("\n").forEach(function (line) { if (line.indexOf("event:") === 0) ev = line.slice(6).trim(); else if (line.indexOf("data:") === 0) data += line.slice(5).trim(); });
      try { onEvent(ev, JSON.parse(data || "{}")); } catch (e) {}
    });
  }
}

async function ask(text) {
  text = text.trim(); if (!text || busy) return;
  $("empty").hidden = true;
  userMsg(text); hist.push({ role: "user", content: text });
  var m = aiMsg(); toBottom(true);
  setBusy(true);
  ctl = new AbortController();
  var data = null, errMsg = null;
  try {
    var res = await fetch("/api/ai", {
      method: "POST", signal: ctl.signal, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "text/event-stream, application/json" },
      body: JSON.stringify({ messages: hist.slice(-12), lang: lang, location: loc ? { name: loc.name, lat: loc.lat, lng: loc.lon } : null })
    });
    if (/event-stream/.test(res.headers.get("content-type") || "")) {
      await readSSE(res, function (ev, d) {
        if (ev === "step") step(m, d.name);
        else if (ev === "done") data = d;
        else if (ev === "error") errMsg = d.status === 429 ? T("limit") : (d.error || T("fail"));
      });
      if (!data && !errMsg) errMsg = T("fail");
    } else {
      var d = await res.json().catch(function () { return {}; });
      if (!res.ok) errMsg = res.status === 429 ? T("limit") : (d.error || T("fail"));
      else { data = d; (d.tools || []).forEach(function (t) { step(m, t); }); }
    }
  } catch (e) {
    errMsg = e.name === "AbortError" ? T("stopped") : (navigator.onLine ? T("fail") : T("offline"));
  }
  finishSteps(m);
  if (errMsg) {
    hist.pop();
    m.b.className = "b a err"; m.b.textContent = errMsg;
    actions(m, null, text);
  } else {
    var answer = data.text || "";
    m.b.innerHTML = md(answer); m.b.classList.add("fade");
    hist.push({ role: "assistant", content: answer });
    if (data.sources && data.sources.length) {
      var sv = document.createElement("div"); sv.className = "src"; sv.setAttribute("aria-label", T("sources"));
      sv.innerHTML = data.sources.map(function (x, i) { return '<span data-n="' + (i + 1) + '">' + esc(x.title) + "</span>"; }).join("");
      m.body.appendChild(sv);
    }
    if (data.listings && data.listings.length) { LI = data.listings; listings(); }
    actions(m, answer, null);
  }
  ctl = null; setBusy(false); toBottom();
  if (!matchMedia("(pointer: coarse)").matches) $("q").focus();
}

$("f").onsubmit = function (e) {
  e.preventDefault();
  if (busy) { if (ctl) ctl.abort(); return; }
  var v = $("q").value; $("q").value = ""; grow(); ask(v);
};
$("q").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("f").requestSubmit(); }
});
// Auto-grow for browsers without CSS field-sizing.
var hasFS = CSS.supports && CSS.supports("field-sizing", "content");
function grow() { var q = $("q"); if (!hasFS) { q.style.height = "auto"; q.style.height = Math.min(q.scrollHeight, 180) + "px"; } $("count").textContent = q.value.length > 300 ? q.value.length + " / 400" : ""; sendState(); }
$("q").addEventListener("input", grow);
$("sug").onclick = function (e) { var b = e.target.closest("button"); if (b) ask(b.dataset.q); };
$("newChat").onclick = function () {
  hist = []; LI = []; $("msgs").innerHTML = ""; $("empty").hidden = false; listings(); setBusy(false); $("q").focus();
};
$("msgs").onclick = function (e) {
  var a = e.target.closest("[data-l]"); if (!a) return;
  e.preventDefault();
  var el = $("l-" + a.dataset.l);
  if (el) { root.querySelectorAll(".li.hl").forEach(function (x) { x.classList.remove("hl"); }); el.classList.add("hl"); el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); }
};

/* ---------- location ---------- */
function setLoc(n, a, o) { loc = { name: n, lat: a, lon: o }; $("locs").textContent = T("loc1") + n; }
$("town").onchange = function () { var t = TOWNS[this.value]; if (t) setLoc(t[0], t[1], t[2]); };
$("gps").onclick = function () {
  if (!navigator.geolocation) { $("locs").textContent = T("gpsErr"); return; }
  navigator.geolocation.getCurrentPosition(function (p) { setLoc(lang == "sw" ? "Eneo langu" : "My location", +p.coords.latitude.toFixed(3), +p.coords.longitude.toFixed(3)); }, function () { $("locs").textContent = T("gpsErr"); }, { timeout: 10000 });
};

/* ---------- listings panel ---------- */
function listings() {
  $("ls").innerHTML = LI.length ? LI.map(function (l) {
    return '<div class="li" id="l-' + Number(l.id) + '"><h3>' + esc(l.title || l.commodity) + '</h3><div class="pr">KSh ' + Number(l.price_per_kg).toLocaleString() + ' <span class="m">/ kg, ' + T("askp") + '</span></div>' +
      '<p class="m">' + esc(l.seller_name || "") + (l.area ? ", " + esc(l.area) : "") + '</p><p class="m">' + Number(l.quantity_kg).toLocaleString() + T("qty") + "</p>" +
      (l.distance_km != null ? '<p class="m">' + l.distance_km + " km " + T("straight") + "</p>" : "") + (l.is_demo ? '<p class="m"><b>Demo</b></p>' : "") + "</div>";
  }).join("") : '<div class="none">' + ICON.box + '<p class="m">' + esc(T("noli")) + "</p></div>";
}

/* ---------- market insights chart ---------- */
function series() { var k = {}; PR.forEach(function (p) { k[p.c + "|" + p.m] = 1; }); return Object.keys(k); }
function chart() {
  var k = $("series").value.split("|"), d = PR.filter(function (p) { return p.c == k[0] && p.m == k[1]; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }), rp = d.filter(function (p) { return p.t == "reported"; });
  $("tb").innerHTML = d.map(function (p) { return "<tr><td>" + p.d + "</td><td>" + T(p.t == "reported" ? "rep" : p.t == "asking" ? "ask2" : "conf") + "</td><td>" + p.p + " / " + p.u + "</td><td>" + p.s + "</td></tr>"; }).join("");
  if (rp.length < 5) { $("chart").innerHTML = '<p class="m" style="padding:30px 10px">' + T("few") + rp.length + ".</p>"; $("tv").textContent = "-"; $("tn").textContent = ""; return; }
  var W = 640, H = 280, P = 44, ps = d.map(function (p) { return p.p; }), mn = Math.min.apply(0, ps) - 5, mx = Math.max.apply(0, ps) + 5, t0 = new Date(d[0].d), t1 = new Date(d[d.length - 1].d), sp = (t1 - t0) || 1;
  function X(s) { return P + (new Date(s) - t0) / sp * (W - P - 14); } function Y(v) { return H - 26 - (v - mn) / (mx - mn) * (H - 46); }
  var G = "#3e8b61", A = "#b07514", B = "#1d6fe0";
  var s = '<svg class="ch" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Price chart">';
  for (var g = 0; g <= 3; g++) { var v = mn + (mx - mn) * g / 3; s += '<line x1="' + P + '" x2="' + W + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="currentColor" opacity=".12"/><text x="4" y="' + (Y(v) + 4) + '" font-size="12" fill="currentColor" opacity=".6">' + Math.round(v) + "</text>"; }
  s += '<polyline fill="none" stroke="' + G + '" stroke-width="3" stroke-linejoin="round" points="' + rp.map(function (p) { return X(p.d) + "," + Y(p.p); }).join(" ") + '"/>';
  d.forEach(function (p) { var x = X(p.d), y = Y(p.p); s += p.t == "reported" ? '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + G + '"/>' : p.t == "asking" ? '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" fill="' + A + '" transform="rotate(45 ' + x + " " + y + ')"/>' : '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" fill="' + B + '"/>'; });
  s += '<text x="' + P + '" y="' + (H - 4) + '" font-size="12" fill="currentColor" opacity=".6">' + d[0].d + '</text><text x="' + (W - 14) + '" y="' + (H - 4) + '" text-anchor="end" font-size="12" fill="currentColor" opacity=".6">' + d[d.length - 1].d + "</text></svg>";
  $("chart").innerHTML = s;
  var a = rp[0], b = rp[rp.length - 1], c = (b.p - a.p) / a.p * 100, wk = Math.round((new Date(b.d) - new Date(a.d)) / 6048e5);
  $("tv").textContent = (c > 0 ? "+" : "") + c.toFixed(1) + "%"; $("tn").textContent = T("chg") + a.p + T("to") + b.p + T("over") + wk + T("wk");
}

function text() {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-t]").forEach(function (e) { e.textContent = T(e.dataset.t); });
  $("q").placeholder = T("ph");
  $("locs").textContent = loc ? T("loc1") + loc.name : T("loc0");
  $("sug").innerHTML = T("sug").map(function (s) { return '<button type="button" data-q="' + esc(s[1]) + '">' + ICON[s[0]] + "<span>" + esc(s[1]) + "</span></button>"; }).join("");
  var tv = $("town").value;
  $("town").innerHTML = '<option value="">' + esc(T("town0")) + "</option>" + TOWNS.map(function (t, i) { return '<option value="' + i + '">' + t[0] + "</option>"; }).join("");
  $("town").value = tv;
  var v = $("series").value;
  $("series").innerHTML = series().map(function (k) { var p = k.split("|"); return '<option value="' + k + '">' + p[0] + " – " + p[1] + "</option>"; }).join("");
  if (v) $("series").value = v;
  chart(); listings();
}
$("series").onchange = chart;
$("lg").onclick = function () { lang = lang == "en" ? "sw" : "en"; text(); };
text(); grow();
})(window.__r.ai);
