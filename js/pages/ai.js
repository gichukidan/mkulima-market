/* Ask Mkulima AI. Runs inside a shadow root passed in as `root`.
   Chat: the server streams progress steps (Server-Sent Events) and then the answer.
   Attachments: up to 3 photos and 1 voice message / audio file (converted in the browser to 16 kHz mono WAV).
   Market insights: live asking-price statistics from GET /api/market/insights. */
(function (root) {
var MKDATA = window.MKDATA, TOWNS = MKDATA.towns, PR = MKDATA.priceReports || [], LI = [];
var L = {
en: {
  h1: "Ask Mkulima AI", lead: "Answers from live listings, in English or Kiswahili.", newc: "New chat",
  gps: "Use my location", loc0: "Set your location to get distances.", loc1: "Location: ", gpsErr: "Location unavailable or declined. Choose a town instead.", town0: "Choose town",
  hello: "Habari! What do you need today?", helloP: "Ask about produce, prices, nearby sellers, transport or how to sell your harvest. You can also attach a photo or a voice message.",
  ph: "Ask about produce, prices or transport", hint: "Enter to send, Shift + Enter for a new line. Check details with the seller before you pay.",
  sug: [["search", "Find potatoes near me"], ["chart", "How are tomato prices trending?"], ["truck", "I have a lorry from Nakuru to Nairobi. Who needs transport?"], ["sprout", "How can I find buyers for my tomatoes?"]],
  steps: { thinking: "Reading your question", search_listings: "Searching listings", search_knowledge: "Checking farming guides", nearby_sellers: "Finding nearby sellers", get_user_location: "Checking your location" },
  sources: "Sources", copy: "Copy", copied: "Copied", retry: "Try again", stopped: "Stopped. Ask again when you are ready.",
  liH: "Listings found", liP: "Listings the assistant mentions appear here.", noli: "Ask a question and matching listings will show here.",
  askp: "asking price", straight: "straight-line", qty: " kg available",
  offline: "You are offline. Connect to the internet to ask Mkulima AI.", fail: "The assistant could not answer. ", limit: "Too many questions in a short time. Wait a moment and try again.",
  attImg: "Attach image", attAud: "Audio: record or upload", audRec: "Record voice", audUp: "Upload audio file",
  recNow: "Recording", recStop: "Stop", recCancel: "Cancel", remove: "Remove", imgAlt: "Attached image", voiceMsg: "Voice message", processing: "Preparing audio...",
  eMaxImg: "You can attach up to 3 images.", eOneAud: "Only one audio clip can be attached. Remove the current one first.",
  eImgType: "That file is not an image. Choose a JPEG, PNG or WebP photo.", eImgRead: "That image could not be read. Try a JPEG, PNG or WebP photo.", eImgBig: "That image is too large even after shrinking. Try another photo.",
  eNoRec: "Recording is not supported in this browser. Use Upload audio file instead.", eMicDeny: "Microphone access was blocked. Allow the microphone in your browser settings, or upload an audio file.",
  eNoMic: "No microphone was found on this device. You can upload an audio file instead.", eMicFail: "The microphone could not be started. Try again or upload an audio file.",
  eAudRead: "That audio could not be read. Try a WAV, MP3, OGG or AAC file.", eAudLong: "Audio is limited to 60 seconds. Record or choose a shorter clip.", eAudBig: "That audio file is too large. Choose a clip of 60 seconds or less.", eAudEmpty: "No sound was recorded. Try again.",
  wrapImg: "[image attached]", wrapAud: "[voice message]",
  miH: "Market insights", miP: "What sellers on Mkulima Market are asking for their produce right now.",
  basis1: "Based on 1 live listing", basisN: "Based on {n} live listings", upd: "updated", loadingI: "Loading market insights",
  kL: "Active listings", kC: "Commodities", kS: "Sellers", kK: "Total quantity (kg)",
  chH: "Average asking price by commodity (KSh per kg)", chSub: "Bar = average. Line = lowest to highest asking price.", chAria: "Bar chart of average asking price per kg by commodity",
  tH: "Commodity breakdown", tCom: "Commodity", tLis: "Listings", tSel: "Sellers", tAvg: "Avg (KSh/kg)", tMed: "Median", tRange: "Min - Max", tKg: "Total kg", sortHint: "Click a heading to sort.",
  arH: "Supply by area", arSub: "Number of live listings by seller area.", arN1: "listing", arN: "listings",
  note: "Asking prices set by sellers on Mkulima Market. They are not official market prices.",
  errH: "Market insights could not load", errP: "Check your connection and try again.", errB: "Retry",
  emH: "No live listings yet", emP: "Insights appear as soon as sellers post listings. Nothing is estimated or made up. Be the first to add one.", emB: "Post a listing",
  rep: "Reported market price", ask2: "Asking price", conf: "Confirmed transaction", trend: "Change over the period", dt: "Date", ty: "Type", pc: "Price (KSh)", src: "Source",
  few: "Not enough reliable data for a trend. At least 5 reported prices are needed; this series has ", chg: "Reported price moved from KSh ", to: " to KSh ", over: " over ", wk: " weeks. This describes past reports only and is not a forecast.",
  foot: "Ask Mkulima AI is powered by Google Gemini through our server. It only uses Mkulima Market data and says when information is missing. Limit: 20 questions per hour."
},
sw: {
  h1: "Uliza Mkulima AI", lead: "Majibu kutoka kwa matangazo halisi, kwa Kiingereza au Kiswahili.", newc: "Mazungumzo mapya",
  gps: "Tumia eneo langu", loc0: "Weka eneo lako kupata umbali.", loc1: "Eneo: ", gpsErr: "Eneo halipatikani au umekataa. Chagua mji.", town0: "Chagua mji",
  hello: "Habari! Unahitaji nini leo?", helloP: "Uliza kuhusu mazao, bei, wauzaji walio karibu, usafiri au jinsi ya kuuza mavuno yako. Unaweza pia kuambatisha picha au ujumbe wa sauti.",
  ph: "Uliza kuhusu mazao, bei au usafiri", hint: "Enter kutuma, Shift + Enter kwa mstari mpya. Thibitisha na muuzaji kabla ya kulipa.",
  sug: [["search", "Tafuta viazi karibu nami"], ["chart", "Bei za nyanya zinaendeleaje?"], ["truck", "Nina lori kutoka Nakuru hadi Nairobi. Nani anahitaji usafiri?"], ["sprout", "Ninawezaje kupata wanunuzi wa nyanya zangu?"]],
  steps: { thinking: "Nasoma swali lako", search_listings: "Natafuta matangazo", search_knowledge: "Naangalia miongozo ya kilimo", nearby_sellers: "Natafuta wauzaji wa karibu", get_user_location: "Naangalia eneo lako" },
  sources: "Vyanzo", copy: "Nakili", copied: "Imenakiliwa", retry: "Jaribu tena", stopped: "Imesimamishwa. Uliza tena ukiwa tayari.",
  liH: "Matangazo yaliyopatikana", liP: "Matangazo anayotaja msaidizi yanaonekana hapa.", noli: "Uliza swali na matangazo yanayolingana yataonekana hapa.",
  askp: "bei ya kuuliza", straight: "mstari ulionyooka", qty: " kg zinapatikana",
  offline: "Uko nje ya mtandao. Unganisha intaneti ili kuuliza Mkulima AI.", fail: "Msaidizi hakuweza kujibu. ", limit: "Maswali mengi mno kwa muda mfupi. Subiri kidogo kisha ujaribu tena.",
  attImg: "Ambatisha picha", attAud: "Sauti: rekodi au pakia", audRec: "Rekodi sauti", audUp: "Pakia faili ya sauti",
  recNow: "Inarekodi", recStop: "Simamisha", recCancel: "Ghairi", remove: "Ondoa", imgAlt: "Picha iliyoambatishwa", voiceMsg: "Ujumbe wa sauti", processing: "Naandaa sauti...",
  eMaxImg: "Unaweza kuambatisha hadi picha 3.", eOneAud: "Sauti moja tu inaweza kuambatishwa. Ondoa ya sasa kwanza.",
  eImgType: "Faili hiyo si picha. Chagua picha ya JPEG, PNG au WebP.", eImgRead: "Picha hiyo haikusomeka. Jaribu picha ya JPEG, PNG au WebP.", eImgBig: "Picha hiyo ni kubwa mno hata baada ya kupunguzwa. Jaribu nyingine.",
  eNoRec: "Kivinjari hiki hakiwezi kurekodi. Tumia Pakia faili ya sauti.", eMicDeny: "Ufikiaji wa maikrofoni umezuiwa. Ruhusu maikrofoni kwenye mipangilio ya kivinjari, au pakia faili ya sauti.",
  eNoMic: "Hakuna maikrofoni kwenye kifaa hiki. Unaweza kupakia faili ya sauti.", eMicFail: "Maikrofoni haikuweza kuwashwa. Jaribu tena au pakia faili ya sauti.",
  eAudRead: "Sauti hiyo haikusomeka. Jaribu faili ya WAV, MP3, OGG au AAC.", eAudLong: "Sauti ni sekunde 60 tu. Rekodi au chagua klipu fupi zaidi.", eAudBig: "Faili hiyo ya sauti ni kubwa mno. Chagua klipu ya sekunde 60 au chini.", eAudEmpty: "Hakuna sauti iliyorekodiwa. Jaribu tena.",
  wrapImg: "[image attached]", wrapAud: "[voice message]",
  miH: "Taarifa za soko", miP: "Bei ambazo wauzaji wa Mkulima Market wanauliza kwa mazao yao sasa hivi.",
  basis1: "Kulingana na tangazo 1 hai", basisN: "Kulingana na matangazo {n} hai", upd: "imesasishwa", loadingI: "Inapakia taarifa za soko",
  kL: "Matangazo hai", kC: "Aina za mazao", kS: "Wauzaji", kK: "Jumla ya kiasi (kg)",
  chH: "Wastani wa bei ya kuuliza kwa zao (KSh kwa kg)", chSub: "Kipau = wastani. Mstari = bei ya chini hadi ya juu.", chAria: "Chati ya wastani wa bei ya kuuliza kwa kg kwa kila zao",
  tH: "Mchanganuo wa mazao", tCom: "Zao", tLis: "Matangazo", tSel: "Wauzaji", tAvg: "Wastani (KSh/kg)", tMed: "Kati", tRange: "Chini - Juu", tKg: "Jumla kg", sortHint: "Bofya kichwa cha safu kupanga.",
  arH: "Ugavi kwa eneo", arSub: "Idadi ya matangazo hai kwa eneo la muuzaji.", arN1: "tangazo", arN: "matangazo",
  note: "Bei za kuuliza zilizowekwa na wauzaji kwenye Mkulima Market. Si bei rasmi za soko.",
  errH: "Taarifa za soko hazikupakia", errP: "Angalia muunganisho wako kisha ujaribu tena.", errB: "Jaribu tena",
  emH: "Hakuna matangazo hai bado", emP: "Taarifa zitaonekana wauzaji wakichapisha matangazo. Hakuna kinachokadiriwa wala kubuniwa. Kuwa wa kwanza kuongeza.", emB: "Chapisha tangazo",
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
  box: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5-6 3-.6 5-2 7-5"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4.5-6.5"/></svg>',
  scale: '<svg viewBox="0 0 24 24"><path d="m16 16 3-8 3 8a5 5 0 0 1-6 0ZM2 16l3-8 3 8a5 5 0 0 1-6 0ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3ZM12 9v4M12 17h.01"/></svg>'
};
var lang = "en", loc = null, hist = [], busy = false, ctl = null;
var $ = function (i) { return root.getElementById(i); }, T = function (k) { return L[lang][k]; };
var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function NL() { return lang === "sw" ? "sw-KE" : "en-KE"; }
function fmt(n, d) { return Number(n || 0).toLocaleString(NL(), { maximumFractionDigits: d == null ? 1 : d }); }
function md(s) {
  s = esc(s).replace(/^#{1,4}\s+(.+)$/gm, "**$1**").replace(/^\s*-{3,}\s*$/gm, "").replace(/^(\s*)[*-]\s+/gm, "$1• ").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n{3,}/g, "\n\n");
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
function userMsg(text, atts) {
  var r = document.createElement("div"); r.className = "row-u fade";
  var h = '<div class="ub">';
  var imgs = atts.filter(function (a) { return a.kind === "image"; });
  if (imgs.length) h += '<div class="ua-imgs">' + imgs.map(function (a) { return '<img src="data:' + esc(a.mime) + ";base64," + esc(a.data) + '" alt="' + esc(T("imgAlt")) + '">'; }).join("") + "</div>";
  atts.filter(function (a) { return a.kind === "audio"; }).forEach(function (a) { h += '<audio class="ua-aud" controls preload="metadata" src="' + esc(a.url) + '" aria-label="' + esc(T("voiceMsg")) + '"></audio>'; });
  if (text) h += '<div class="b u">' + esc(text) + "</div>";
  r.innerHTML = h + "</div>"; hideBroken(r);
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
function actions(m, text, retry) {
  var a = document.createElement("div"); a.className = "acts";
  if (text) a.innerHTML += '<button type="button" data-a="copy">' + ICON.copy + "<span>" + esc(T("copy")) + "</span></button>";
  if (retry) a.innerHTML += '<button type="button" data-a="retry">' + ICON.retry + "<span>" + esc(T("retry")) + "</span></button>";
  a.onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.a === "copy" && navigator.clipboard) navigator.clipboard.writeText(text).then(function () { b.querySelector("span").textContent = T("copied"); setTimeout(function () { b.querySelector("span").textContent = T("copy"); }, 1600); });
    if (b.dataset.a === "retry") { m.row.remove(); var u = $("msgs").lastElementChild; if (u && u.classList.contains("row-u")) u.remove(); ask(retry.t, retry.a); }
  };
  m.body.appendChild(a);
}

/* ---------- attachments: images and audio ---------- */
var pend = [], rec = null, working = 0, MAXREC = 60;
function showErr(k) { var e = $("aerr"); e.textContent = k ? T(k) : ""; e.hidden = !k; e.dataset.k = k || ""; }
function countKind(k) { return pend.filter(function (a) { return a.kind === k; }).length; }
function fmtDur(s) { s = Math.round(s); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
function blobB64(blob) {
  return new Promise(function (ok, no) {
    var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); }; fr.onerror = no; fr.readAsDataURL(blob);
  });
}
// If the page policy blocks blob: media, hide the preview player (the chip and duration stay).
function hideBroken(el) { el.querySelectorAll("audio").forEach(function (a) { a.addEventListener("error", function () { a.hidden = true; }, { once: true }); }); }
function renderAtts() {
  var el = $("atts");
  el.hidden = !pend.length && !working;
  el.innerHTML = pend.map(function (a, i) {
    if (a.kind === "image") return '<div class="at im"><img src="data:' + esc(a.mime) + ";base64," + esc(a.data) + '" alt="' + esc(T("imgAlt")) + '"><button type="button" class="rm" data-i="' + i + '" aria-label="' + esc(T("remove") + ": " + T("imgAlt")) + '">' + ICON.x + "</button></div>";
    return '<div class="at au">' + ICON.mic + '<span class="ad">' + esc(fmtDur(a.dur)) + '</span><audio controls preload="metadata" src="' + esc(a.url) + '" aria-label="' + esc(T("voiceMsg")) + '"></audio><button type="button" class="rm" data-i="' + i + '" aria-label="' + esc(T("remove") + ": " + T("voiceMsg")) + '">' + ICON.x + "</button></div>";
  }).join("") + (working ? '<div class="at work" role="status"><i></i><span>' + esc(T("processing")) + "</span></div>" : "");
  hideBroken(el); sendState();
}
$("atts").onclick = function (e) {
  var b = e.target.closest(".rm"); if (!b) return;
  var a = pend.splice(Number(b.dataset.i), 1)[0];
  if (a && a.url) URL.revokeObjectURL(a.url);
  showErr(""); renderAtts();
};

async function prepImage(f) {
  if (!/^image\//.test(f.type)) throw new Error("eImgType");
  var url;
  try { url = await MK.compressImage(f, 1280, 0.8); } catch (e) { throw new Error("eImgRead"); }
  if (url.length * 0.75 > 1.4 * 1048576) { try { url = await MK.compressImage(f, 1024, 0.6); } catch (e) { throw new Error("eImgRead"); } }
  if (url.length * 0.75 > 1.45 * 1048576) throw new Error("eImgBig");
  var m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(url);
  if (!m) throw new Error("eImgRead");
  return { kind: "image", mime: m[1], data: m[2] };
}
async function addImages(files) {
  files = Array.prototype.slice.call(files || []);
  if (!files.length) return;
  showErr("");
  var free = 3 - countKind("image") - working;
  if (free <= 0) { showErr("eMaxImg"); return; }
  if (files.length > free) { showErr("eMaxImg"); files = files.slice(0, free); }
  working += files.length; renderAtts();
  for (var i = 0; i < files.length; i++) {
    try { pend.push(await prepImage(files[i])); } catch (e) { showErr(L.en[e.message] ? e.message : "eImgRead"); }
    working--; renderAtts();
  }
}

// Decode any browser-playable audio, resample to 16 kHz mono and write a 16-bit PCM WAV.
async function toWav(blob) {
  var AC = window.AudioContext || window.webkitAudioContext, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC || !OAC) throw new Error("eNoRec");
  var ab, ctx = new AC();
  try { ab = await ctx.decodeAudioData(await blob.arrayBuffer()); } catch (e) { throw new Error("eAudRead"); } finally { if (ctx.close) ctx.close(); }
  if (ab.duration > MAXREC + 1) throw new Error("eAudLong");
  if (ab.duration < 0.2) throw new Error("eAudEmpty");
  var n = Math.max(1, Math.ceil(ab.duration * 16000)), off = new OAC(1, n, 16000), src = off.createBufferSource();
  src.buffer = ab; src.connect(off.destination); src.start(0);
  var pcm = (await off.startRendering()).getChannelData(0), out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  function s(o, t) { for (var i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); }
  s(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); s(8, "WAVE"); s(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, 16000, true); out.setUint32(28, 32000, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); s(36, "data"); out.setUint32(40, pcm.length * 2, true);
  for (var i = 0; i < pcm.length; i++) { var v = Math.max(-1, Math.min(1, pcm[i])); out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
  return { blob: new Blob([out], { type: "audio/wav" }), dur: pcm.length / 16000 };
}
async function addAudio(blob) {
  showErr("");
  if (countKind("audio")) { showErr("eOneAud"); return; }
  working++; renderAtts();
  try {
    var w = await toWav(blob);
    pend.push({ kind: "audio", mime: "audio/wav", data: await blobB64(w.blob), url: URL.createObjectURL(w.blob), dur: w.dur });
  } catch (e) { showErr(L.en[e.message] ? e.message : "eAudRead"); }
  working--; renderAtts();
}

function closeMenu() { $("audMenu").hidden = true; $("attAud").setAttribute("aria-expanded", "false"); }
$("attImg").onclick = function () { closeMenu(); $("fImg").click(); };
$("fImg").onchange = function () { addImages(this.files); this.value = ""; };
$("attAud").onclick = function (e) {
  e.stopPropagation();
  var open = $("audMenu").hidden; $("audMenu").hidden = !open; this.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) $("audRec").focus();
};
root.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".menu-w")) closeMenu(); });
$("audMenu").addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); $("attAud").focus(); } });
$("audUp").onclick = function () { closeMenu(); if (countKind("audio")) { showErr("eOneAud"); return; } $("fAud").click(); };
$("fAud").onchange = function () {
  var f = this.files && this.files[0]; this.value = "";
  if (!f) return;
  if (f.size > 25 * 1048576) { showErr("eAudBig"); return; }
  addAudio(f);
};
$("audRec").onclick = function () { closeMenu(); startRec(); };

function recUi(on) {
  $("rec").hidden = !on; $("recTime").textContent = "0:00";
  if (on) $("recStop").focus();
}
async function startRec() {
  showErr("");
  if (rec) return;
  if (countKind("audio")) { showErr("eOneAud"); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { showErr("eNoRec"); return; }
  var stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { showErr(e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "eMicDeny" : e && (e.name === "NotFoundError" || e.name === "OverconstrainedError") ? "eNoMic" : "eMicFail"); return; }
  var mr, chunks = [];
  try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); showErr("eNoRec"); return; }
  rec = { mr: mr, stream: stream, cancel: false, t0: Date.now() };
  mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = function () {
    clearInterval(rec.tick); rec.stream.getTracks().forEach(function (t) { t.stop(); });
    var cancelled = rec.cancel, type = mr.mimeType || "audio/webm"; rec = null; recUi(false);
    $("attAud").focus();
    if (!cancelled) { if (!chunks.length) showErr("eAudEmpty"); else addAudio(new Blob(chunks, { type: type })); }
  };
  mr.start();
  recUi(true);
  rec.tick = setInterval(function () {
    var s = (Date.now() - rec.t0) / 1000;
    $("recTime").textContent = fmtDur(Math.min(s, MAXREC));
    if (s >= MAXREC && rec.mr.state === "recording") rec.mr.stop();
  }, 250);
}
$("recStop").onclick = function () { if (rec && rec.mr.state === "recording") rec.mr.stop(); };
$("recCancel").onclick = function () { if (rec) { rec.cancel = true; if (rec.mr.state === "recording") rec.mr.stop(); } };

/* ---------- send / stop ---------- */
function setBusy(on) {
  busy = on;
  $("send").classList.toggle("stop", on);
  $("send").setAttribute("aria-label", on ? "Stop" : "Send");
  $("newChat").disabled = on || !hist.length;
  $("attImg").disabled = on; $("attAud").disabled = on;
  sendState();
}
function sendState() { $("send").disabled = !busy && !$("q").value.trim() && !pend.length; }

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

// Older turns are text only: attachments become a short marker so the model keeps the context.
function payload(atts) {
  var h = hist.slice(-12);
  return h.map(function (m, i) {
    var last = i === h.length - 1, c = m.content;
    if (!last && m.k && m.k.length) c = (c + " " + m.k.map(function (k) { return k === "image" ? L.en.wrapImg : L.en.wrapAud; }).join(" ")).trim();
    var o = { role: m.role, content: c };
    if (last && atts.length) o.attachments = atts.map(function (a) { return { kind: a.kind, mime: a.mime, data: a.data }; });
    return o;
  });
}

async function ask(text, atts) {
  text = (text || "").trim(); atts = atts || [];
  if ((!text && !atts.length) || busy) return;
  $("empty").hidden = true; showErr("");
  userMsg(text, atts); hist.push({ role: "user", content: text, k: atts.map(function (a) { return a.kind; }) });
  var m = aiMsg(); toBottom(true);
  setBusy(true);
  ctl = new AbortController();
  var data = null, errMsg = null;
  try {
    var res = await fetch("/api/ai", {
      method: "POST", signal: ctl.signal, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "text/event-stream, application/json" },
      body: JSON.stringify({ messages: payload(atts), lang: lang, location: loc ? { name: loc.name, lat: loc.lat, lng: loc.lon } : null })
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
      if (!res.ok) errMsg = res.status === 429 ? T("limit") : res.status === 413 ? T("eAudBig") : (d.error || T("fail"));
      else { data = d; (d.tools || []).forEach(function (t) { step(m, t); }); }
    }
  } catch (e) {
    errMsg = e.name === "AbortError" ? T("stopped") : (navigator.onLine ? T("fail") : T("offline"));
  }
  finishSteps(m);
  if (errMsg) {
    hist.pop();
    m.b.className = "b a err"; m.b.textContent = errMsg;
    actions(m, null, { t: text, a: atts });
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
  if (rec || working) return;
  var v = $("q").value; if (!v.trim() && !pend.length) return;
  var a = pend; pend = []; renderAtts();
  $("q").value = ""; grow(); ask(v, a);
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
      (l.distance_km != null ? '<p class="m">' + Number(l.distance_km) + " km " + T("straight") + "</p>" : "") + (l.is_demo ? '<p class="m"><b>Demo</b></p>' : "") + "</div>";
  }).join("") : '<div class="none">' + ICON.box + '<p class="m">' + esc(T("noli")) + "</p></div>";
}

/* ---------- market insights (live asking prices only) ---------- */
var MI = { state: "load", data: null, at: 0, sort: { k: "listings", d: -1 } };
var COLS = [["commodity", "tCom", 0], ["listings", "tLis", 1], ["sellers", "tSel", 1], ["avgPrice", "tAvg", 1], ["medianPrice", "tMed", 1], ["minPrice", "tRange", 1], ["totalKg", "tKg", 1]];
function loadMI() {
  MI.state = MI.data ? "ok" : "load"; if (!MI.data) renderMI();
  MK.api("GET", "/api/market/insights", null, { quiet: true }).then(function (d) {
    MI.data = d; MI.at = Date.now(); MI.state = "ok"; renderMI();
  }).catch(function () { if (!MI.data) { MI.state = "err"; renderMI(); } });
}
function skeleton() {
  return '<div class="sk-wrap" role="status" aria-label="' + esc(T("loadingI")) + '"><div class="kpis">' + [1, 2, 3, 4].map(function () { return '<div class="kpi sk"><i></i><i></i></div>'; }).join("") + '</div><div class="mi-grid"><div class="card sk-card"><i></i><i></i><i></i><i></i><i></i></div><div class="card sk-card"><i></i><i></i><i></i></div></div></div>';
}
function kpi(icon, label, val) { return '<div class="kpi"><span class="ki">' + ICON[icon] + '</span><div><div class="kv">' + esc(val) + '</div><div class="kl">' + esc(label) + "</div></div></div>"; }
function renderMI() {
  var body = $("miBody"), basis = $("miBasis"), d = MI.data;
  body.setAttribute("aria-busy", MI.state === "load" ? "true" : "false");
  if (MI.state === "load") { basis.textContent = ""; body.innerHTML = skeleton(); return; }
  if (MI.state === "err") {
    basis.textContent = "";
    body.innerHTML = '<div class="state err" role="alert">' + ICON.warn + "<h3>" + esc(T("errH")) + "</h3><p class=\"m\">" + esc(T("errP")) + '</p><button type="button" class="btn-p" id="miRetry">' + esc(T("errB")) + "</button></div>";
    $("miRetry").onclick = function () { MI.state = "load"; loadMI(); };
    return;
  }
  var t = d.totals || {}, cs = d.commodities || [];
  if (!Number(t.listings) || !cs.length) {
    basis.textContent = "";
    body.innerHTML = '<div class="state">' + ICON.leaf + "<h3>" + esc(T("emH")) + '</h3><p class="m">' + esc(T("emP")) + '</p><a class="btn-p" href="#/seller-form" data-go="#/seller-form">' + esc(T("emB")) + "</a></div>" + noteHtml();
    return;
  }
  var when = new Date(d.generatedAt), n = Number(t.listings);
  basis.textContent = (n === 1 ? T("basis1") : T("basisN").replace("{n}", fmt(n, 0))) + ", " + T("upd") + " " + (isNaN(when) ? "" : when.toLocaleTimeString(NL(), { hour: "2-digit", minute: "2-digit" }));
  var h = '<div class="kpis">' + kpi("list", T("kL"), fmt(t.listings, 0)) + kpi("leaf", T("kC"), fmt(t.commodities, 0)) + kpi("users", T("kS"), fmt(t.sellers, 0)) + kpi("scale", T("kK"), fmt(t.totalKg, 0)) + "</div>";
  h += '<div class="mi-grid"><section class="card" aria-labelledby="chH"><h3 id="chH">' + esc(T("chH")) + '</h3><p class="m sm">' + esc(T("chSub")) + "</p>" + barChart(cs) + "</section>";
  h += '<section class="card" aria-labelledby="arH"><h3 id="arH">' + esc(T("arH")) + '</h3><p class="m sm">' + esc(T("arSub")) + "</p>" + areaList(d.areas || []) + "</section></div>";
  h += '<section class="card tcard" aria-labelledby="tH"><div class="thead"><h3 id="tH">' + esc(T("tH")) + '</h3><span class="m sm">' + esc(T("sortHint")) + '</span></div><div class="wrap" tabindex="0" role="region" aria-labelledby="tH">' + tableHtml(cs) + "</div></section>";
  body.innerHTML = h + noteHtml();
}
function noteHtml() { return '<p class="note">' + ICON.info + "<span>" + esc(T("note")) + "</span></p>"; }
function barChart(cs) {
  var top = cs.slice().sort(function (a, b) { return b.avgPrice - a.avgPrice; }), max = Math.max.apply(null, top.map(function (c) { return c.maxPrice; })) || 1;
  var step = max <= 60 ? 10 : max <= 150 ? 25 : max <= 400 ? 50 : 100, scale = Math.ceil(max / step) * step;
  var aria = T("chAria") + ": " + top.map(function (c) { return c.commodity + " KSh " + fmt(c.avgPrice) + " (" + fmt(c.minPrice) + " - " + fmt(c.maxPrice) + ")"; }).join("; ");
  var h = '<div class="chart" role="img" aria-label="' + esc(aria) + '"><ul>';
  top.forEach(function (c, i) {
    var w = c.avgPrice / scale * 100, a = c.minPrice / scale * 100, b = c.maxPrice / scale * 100, tip = c.commodity + ": " + fmt(c.avgPrice) + " (" + fmt(c.minPrice) + " - " + fmt(c.maxPrice) + ") KSh/kg, " + c.listings;
    h += '<li title="' + esc(tip) + '"><span class="bl">' + esc(c.commodity) + '</span><span class="bt"><i class="bar c' + (i % 5) + '" style="width:' + w.toFixed(2) + '%"></i>' +
      (c.maxPrice > c.minPrice ? '<i class="wh" style="left:' + a.toFixed(2) + "%;width:" + (b - a).toFixed(2) + '%"></i>' : '<i class="wd" style="left:' + a.toFixed(2) + '%"></i>') +
      '</span><span class="bv"><b>' + esc(fmt(c.avgPrice)) + "</b>" + (c.maxPrice > c.minPrice ? "<small>" + esc(fmt(c.minPrice)) + " - " + esc(fmt(c.maxPrice)) + "</small>" : "") + "</span></li>";
  });
  h += '<li class="axis" aria-hidden="true"><span></span><span class="ax"><em>0</em><em>' + fmt(scale / 2, 0) + "</em><em>" + fmt(scale, 0) + "</em></span><span></span></li></ul></div>";
  return h;
}
function areaList(areas) {
  if (!areas.length) return '<p class="m">-</p>';
  var max = Math.max.apply(null, areas.map(function (a) { return a.listings; })) || 1;
  return '<ul class="areas">' + areas.map(function (a) {
    return '<li><span class="an">' + esc(a.area) + '</span><span class="at2"><i style="width:' + (a.listings / max * 100).toFixed(1) + '%"></i></span><span class="ac">' + fmt(a.listings, 0) + " <small>" + esc(a.listings === 1 ? T("arN1") : T("arN")) + "</small></span></li>";
  }).join("") + "</ul>";
}
function tableHtml(cs) {
  var k = MI.sort.k, dir = MI.sort.d;
  var rows = cs.slice().sort(function (a, b) {
    var x = a[k], y = b[k]; if (typeof x === "string") return x.localeCompare(y) * dir;
    return ((x - y) || (a.commodity.localeCompare(b.commodity))) * dir;
  });
  var h = "<table><thead><tr>" + COLS.map(function (c) {
    var on = c[0] === k;
    return '<th scope="col"' + (c[2] ? ' class="num"' : "") + ' aria-sort="' + (on ? (dir > 0 ? "ascending" : "descending") : "none") + '"><button type="button" class="sb' + (on ? " on" : "") + '" data-k="' + c[0] + '">' + esc(T(c[1])) + '<span class="ar" aria-hidden="true">' + (on ? (dir > 0 ? "&#9650;" : "&#9660;") : "&#8645;") + "</span></button></th>";
  }).join("") + "</tr></thead><tbody>";
  rows.forEach(function (c) {
    h += "<tr><th scope=\"row\">" + esc(c.commodity) + '</th><td class="num">' + fmt(c.listings, 0) + '</td><td class="num">' + fmt(c.sellers, 0) + '</td><td class="num"><b>' + fmt(c.avgPrice) + '</b></td><td class="num">' + fmt(c.medianPrice) + '</td><td class="num">' + fmt(c.minPrice) + " - " + fmt(c.maxPrice) + '</td><td class="num">' + fmt(c.totalKg, 0) + "</td></tr>";
  });
  return h + "</tbody></table>";
}
$("miBody").addEventListener("click", function (e) {
  var b = e.target.closest(".sb"); if (!b || !MI.data) return;
  var k = b.dataset.k; MI.sort = { k: k, d: MI.sort.k === k ? -MI.sort.d : (k === "commodity" ? 1 : -1) };
  renderMI();
  var nb = root.querySelector('.sb[data-k="' + k + '"]'); if (nb) nb.focus();
});
document.addEventListener("mk:route", function (e) {
  var k = e.detail && e.detail.key;
  if ((k === "ai" || k === "market") && (!MI.data || Date.now() - MI.at > 60000)) loadMI();
});

/* ---------- reported-price trend: only drawn when reported prices exist (none yet) ---------- */
function series() { var k = {}; PR.forEach(function (p) { k[p.c + "|" + p.m] = 1; }); return Object.keys(k); }
function chart() {
  if (!PR.length) return;
  var k = $("series").value.split("|"), d = PR.filter(function (p) { return p.c == k[0] && p.m == k[1]; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }), rp = d.filter(function (p) { return p.t == "reported"; });
  $("tb").innerHTML = d.map(function (p) { return "<tr><td>" + esc(p.d) + "</td><td>" + T(p.t == "reported" ? "rep" : p.t == "asking" ? "ask2" : "conf") + "</td><td>" + esc(p.p) + " / " + esc(p.u) + "</td><td>" + esc(p.s) + "</td></tr>"; }).join("");
  if (rp.length < 5) { $("chart").innerHTML = '<p class="m" style="padding:30px 10px">' + T("few") + rp.length + ".</p>"; $("tv").textContent = "-"; $("tn").textContent = ""; return; }
  var W = 640, H = 280, P = 44, ps = d.map(function (p) { return p.p; }), mn = Math.min.apply(0, ps) - 5, mx = Math.max.apply(0, ps) + 5, t0 = new Date(d[0].d), t1 = new Date(d[d.length - 1].d), sp = (t1 - t0) || 1;
  function X(s) { return P + (new Date(s) - t0) / sp * (W - P - 14); } function Y(v) { return H - 26 - (v - mn) / (mx - mn) * (H - 46); }
  var G = "#3e8b61", A = "#b07514", B = "#1d6fe0";
  var s = '<svg class="ch" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Price chart">';
  for (var g = 0; g <= 3; g++) { var v = mn + (mx - mn) * g / 3; s += '<line x1="' + P + '" x2="' + W + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="currentColor" opacity=".12"/><text x="4" y="' + (Y(v) + 4) + '" font-size="12" fill="currentColor" opacity=".6">' + Math.round(v) + "</text>"; }
  s += '<polyline fill="none" stroke="' + G + '" stroke-width="3" stroke-linejoin="round" points="' + rp.map(function (p) { return X(p.d) + "," + Y(p.p); }).join(" ") + '"/>';
  d.forEach(function (p) { var x = X(p.d), y = Y(p.p); s += p.t == "reported" ? '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + G + '"/>' : p.t == "asking" ? '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" fill="' + A + '" transform="rotate(45 ' + x + " " + y + ')"/>' : '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" fill="' + B + '"/>'; });
  s += '<text x="' + P + '" y="' + (H - 4) + '" font-size="12" fill="currentColor" opacity=".6">' + esc(d[0].d) + '</text><text x="' + (W - 14) + '" y="' + (H - 4) + '" text-anchor="end" font-size="12" fill="currentColor" opacity=".6">' + esc(d[d.length - 1].d) + "</text></svg>";
  $("chart").innerHTML = s;
  var a = rp[0], b = rp[rp.length - 1], c = (b.p - a.p) / a.p * 100, wk = Math.round((new Date(b.d) - new Date(a.d)) / 6048e5);
  $("tv").textContent = (c > 0 ? "+" : "") + c.toFixed(1) + "%"; $("tn").textContent = T("chg") + a.p + T("to") + b.p + T("over") + wk + T("wk");
}

function text() {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-t]").forEach(function (e) { e.textContent = T(e.dataset.t); });
  root.querySelectorAll("[data-al]").forEach(function (e) { e.setAttribute("aria-label", T(e.dataset.al)); e.title = T(e.dataset.al); });
  $("q").placeholder = T("ph");
  $("locs").textContent = loc ? T("loc1") + loc.name : T("loc0");
  $("sug").innerHTML = T("sug").map(function (s) { return '<button type="button" data-q="' + esc(s[1]) + '">' + ICON[s[0]] + "<span>" + esc(s[1]) + "</span></button>"; }).join("");
  var tv = $("town").value;
  $("town").innerHTML = '<option value="">' + esc(T("town0")) + "</option>" + TOWNS.map(function (t, i) { return '<option value="' + i + '">' + esc(t[0]) + "</option>"; }).join("");
  $("town").value = tv;
  $("trendBox").hidden = !PR.length;
  if (PR.length) {
    var v = $("series").value;
    $("series").innerHTML = series().map(function (k) { var p = k.split("|"); return '<option value="' + esc(k) + '">' + esc(p[0]) + " – " + esc(p[1]) + "</option>"; }).join("");
    if (v) $("series").value = v;
    chart();
  }
  if ($("aerr").dataset.k) showErr($("aerr").dataset.k);
  renderAtts(); renderMI(); listings();
}
$("series").onchange = chart;
$("lg").onclick = function () { lang = lang == "en" ? "sw" : "en"; text(); };
text(); grow(); loadMI();
})(window.__r.ai);
