/* map view. Runs inside a shadow root passed in as `root`. */
(function(root){
var MKDATA=window.MKDATA,TOWNS=MKDATA.towns,MK=MKDATA.markets,SL=MKDATA.sellers,TR=MKDATA.transporters;
// If you want the page to use the server-side APIs set window.USE_SERVER_API = true in the console.
var USE_SERVER = !!window.USE_SERVER_API;
// Leaflet integration: dynamically load CSS into the shadow root and script globally,
// then initialize an interactive OpenStreetMap tile map inside #leafletMap.
var _leafletReady = false;
var _leafletMap = null;
var _leafletLayerGroup = null;
var _leafletMarkers = {};
async function loadLeafletAssets() {
    if (typeof fetch !== 'function') return false;
    try {
        // load CSS text and inject into the shadow root so styles apply to the map container inside the view
        if (!root._leafletStyleInserted) {
            const cssRes = await fetch('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
            const cssText = await cssRes.text();
            const styleEl = document.createElement('style');
            styleEl.textContent = cssText;
            // insert into the shadow root so Leaflet controls are styled
            root.appendChild(styleEl);
            root._leafletStyleInserted = true;
        }

        // load script globally if not present
        if (!window.L) {
            await new Promise(function(resolve, reject){
                var s = document.createElement('script');
                s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
            });
        }
        _leafletReady = !!window.L;
        // Leaflet guesses its marker image folder from the page URL, which is wrong here: point it at the CDN.
        if (window.L && window.L.Icon && window.L.Icon.Default) window.L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
        return _leafletReady;
    } catch (e) {
        console.warn('Leaflet load failed', e);
        return false;
    }
}

function ensureLeafletMap() {
    if (!_leafletReady || _leafletMap) return;
    try {
        var mapEl = root.getElementById('leafletMap');
        if (!mapEl) return;
        mapEl.style.display = 'block';
        var svg = root.getElementById('map'); if (svg) svg.style.display = 'none';
        _leafletMap = window.L.map(mapEl, { attributionControl: false, zoomControl: true }).setView([loc.a, loc.o], 9);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(_leafletMap);
        _leafletLayerGroup = window.L.layerGroup().addTo(_leafletMap);
        _leafletMap.on('click', function(e){ setLoc(lang=='sw'?'Eneo ulilochagua':'Chosen point', e.latlng.lat, e.latlng.lng); });
    } catch (e) {
        console.warn('Leaflet init error', e);
    }
}

function updateLeafletView() {
    if (!_leafletMap) return;
    try {
        _leafletMap.setView([loc.a, loc.o], Math.max(8, Math.round(10 - Math.log(rad || 10))));
        _leafletLayerGroup.clearLayers();
        _leafletMarkers = {};
        // draw radius circle
        var circle = window.L.circle([loc.a, loc.o], { radius: (rad || 50) * 1000, color: '#4A9FE8', weight: 1, fillOpacity: 0.08 });
        circle.addTo(_leafletLayerGroup);
        // user marker
        var userMark = window.L.marker([loc.a, loc.o], { title: loc.n }).bindPopup('<strong>' + (loc.n||'You') + '</strong>');
        userMark.addTo(_leafletLayerGroup);

        // add sellers/markets/transporters
        var items = all();
        items.forEach(function(it){
            if (!it.a || !it.o) return;
            // always include nearby items; distance already computed
            var color = it.k=='m'? '#38A765' : it.k=='s'? '#F47721' : '#4A9FE8';
            var marker = window.L.circleMarker([it.a, it.o], { radius: 8, color: '#fff', weight:1.2, fillColor: color, fillOpacity: 1 });
            var popup = '<strong>' + esc(it.n) + '</strong><div class="m">' + (it.k=='m'? T('unk') : (it.x && it.x[4]? (T('rating')+it.x[4]) : '')) + '</div><div class="small">' + (it.d?it.d.toFixed(1):'-') + ' km</div>';
            marker.bindPopup(popup);
            marker.addTo(_leafletLayerGroup);
            _leafletMarkers[it.id] = marker;
            marker.on('click', function(){
                // highlight corresponding list item
                var el = root.getElementById('i-'+it.id);
                if (el) el.scrollIntoView({ block: 'nearest' });
            });
        });
    } catch (e) {
        console.warn('Leaflet update error', e);
    }
}

var L={en:{h1:"Find produce, markets and transport near you",lead:"Phase 2 prototype: location search, nearby markets and sellers, and a transport quotation workflow.",warn:"Prototype notice. All sellers and transporters here are sample data and the coordinates are approximate. Distances are straight-line only. Road distance and travel time need a routing service such as OSRM, which this page cannot call.",mapH:"Discover what is near you",gps:"Use my location",mk:"Markets",sl:"Sellers",tr:"Transporters",mapNote:"Schematic plot on a latitude and longitude grid, not a street map. Tap the map to set your location by hand.",dark:"Dark mode",
qH:"Request transport",qP:"Pick the pickup and drop-off towns and your load. We list transporters whose service area covers the pickup and whose vehicle can carry the load.",pu:"Pickup",de:"Destination",ld:"Load (kg)",find:"Find transporters",mine:"Your quotation requests",foot:"Requests below stay on this page only. Nothing is sent or saved until the Phase 1 backend is connected.",
perm:"Location unavailable or declined. Choose a town or tap the map instead.",set:"Your location: ",radius:"Search radius",none:"Nothing within this radius. Try a larger radius or another town.",found:" places within ",line:"km straight line",dir:"Open road directions on OpenStreetMap",unk:"Commodities traded: not yet recorded",rating:"Rating: ",cap:"Capacity ",svc:"Serves ",area:"Approximate area",req:"Request quotation",sent:"Request created (demo, not sent)",noreq:"No requests yet. Find a transporter above and request a quotation.",bad:"Enter a load greater than 0 kg.",same:"Pickup and destination are the same town.",nomatch:"No sample transporter covers this pickup with enough capacity.",dist:"Straight-line distance: ",at:"Load ",to:" to "},
sw:{h1:"Pata mazao, masoko na usafiri karibu nawe",lead:"Mfano wa Awamu ya 2: utafutaji wa eneo, masoko na wauzaji wa karibu, na mfumo wa kuomba bei ya usafiri.",warn:"Tahadhari ya mfano. Wauzaji na wasafirishaji wote hapa ni data ya mfano na viwianishi ni vya makadirio. Umbali ni wa mstari ulionyooka pekee. Umbali wa barabara na muda wa safari huhitaji huduma ya njia kama OSRM, ambayo ukurasa huu hauwezi kuitumia.",mapH:"Gundua kilicho karibu nawe",gps:"Tumia eneo langu",mk:"Masoko",sl:"Wauzaji",tr:"Wasafirishaji",mapNote:"Mchoro kwenye gridi ya latitudo na longitudo, si ramani ya barabara. Gusa ramani kuweka eneo lako mwenyewe.",dark:"Hali ya giza",
qH:"Omba usafiri",qP:"Chagua miji ya kuchukulia na kupeleka pamoja na mzigo wako. Tunaorodhesha wasafirishaji wanaohudumia eneo la kuchukulia na wenye gari linaloweza kubeba mzigo.",pu:"Kuchukulia",de:"Unakoenda",ld:"Mzigo (kg)",find:"Tafuta wasafirishaji",mine:"Maombi yako ya bei",foot:"Maombi yaliyo hapa chini yanabaki kwenye ukurasa huu pekee. Hakuna kinachotumwa au kuhifadhiwa hadi seva ya Awamu ya 1 iunganishwe.",
perm:"Eneo halipatikani au umekataa. Chagua mji au gusa ramani.",set:"Eneo lako: ",radius:"Eneo la utafutaji",none:"Hakuna kitu ndani ya eneo hili. Jaribu eneo kubwa zaidi au mji mwingine.",found:" maeneo ndani ya ",line:"km mstari ulionyooka",dir:"Fungua maelekezo ya barabara kwenye OpenStreetMap",unk:"Mazao yanayouzwa: bado hayajarekodiwa",rating:"Ukadiriaji: ",cap:"Uwezo ",svc:"Inahudumia ",area:"Eneo la makadirio",req:"Omba bei",sent:"Ombi limeundwa (mfano, halijatumwa)",noreq:"Hakuna maombi bado. Tafuta msafirishaji hapo juu kisha omba bei.",bad:"Weka mzigo zaidi ya kilo 0.",same:"Mji wa kuchukulia na unakoenda ni mmoja.",nomatch:"Hakuna msafirishaji wa mfano anayehudumia eneo hili na mwenye uwezo wa kutosha.",dist:"Umbali wa mstari ulionyooka: ",at:"Mzigo ",to:" hadi "}};
var lang="en",loc={n:"Nairobi",a:-1.2864,o:36.8172},rad=50,ly={m:1,s:1,t:1},sel=null,reqs=[],R=[5,10,25,50,100,250];
var $=function(i){return root.getElementById(i)},T=function(k){return L[lang][k]};
function hv(a,b,c,d){var r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2),h=x*x+Math.cos(a*r)*Math.cos(c*r)*y*y;return 12742*Math.asin(Math.sqrt(h))}
function px(a,o){return[(o-33.9)*72,(5-a)*72]}
function dirUrl(a,o,c,d){return "https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route="+a+"%2C"+o+"%3B"+c+"%2C"+d}
function all(){var o=[];if(ly.m)MK.forEach(function(x,i){o.push({id:"m"+i,k:"m",n:x[0],w:x[1],a:x[2],o:x[3],x:x})});if(ly.s)SL.forEach(function(x,i){o.push({id:"s"+i,k:"s",n:x[0],w:x[1],a:x[2],o:x[3],x:x})});if(ly.t)TR.forEach(function(x,i){o.push({id:"t"+i,k:"t",n:x[0],w:x[1],a:x[2],o:x[3],x:x})});
 o.forEach(function(p){p.d=hv(loc.a,loc.o,p.a,p.o)});return o.sort(function(a,b){return a.d-b.d})}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function draw(items){var s="",i,p;
 for(i=34;i<=42;i+=2){p=px(0,i)[0];s+='<line x1="'+p+'" y1="0" x2="'+p+'" y2="700" stroke="currentColor" opacity=".12"/><text x="'+(p+3)+'" y="694" font-size="11" fill="currentColor" opacity=".5">'+i+'°E</text>'}
 for(i=-4;i<=4;i+=2){p=px(i,0)[1];s+='<line x1="0" y1="'+p+'" x2="576" y2="'+p+'" stroke="currentColor" opacity="'+(i==0?.3:.12)+'"/><text x="4" y="'+(p-4)+'" font-size="11" fill="currentColor" opacity=".5">'+(i>0?i+"°N":i<0?-i+"°S":"0°")+'</text>'}
 var c=px(loc.a,loc.o),r=rad/111.32*72;
 s+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+r+'" fill="#4A9FE8" fill-opacity=".12" stroke="#4A9FE8" stroke-width="2" stroke-dasharray="6 4"/>';
 items.forEach(function(it){var q=px(it.a,it.o),on=it.d<=rad,g='opacity="'+(on?1:.35)+'"',h=it.id===sel?8:6,f=it.k=="m"?"#38A765":it.k=="s"?"#F47721":"#4A9FE8";
  var sh=it.k=="m"?'<rect x="'+(q[0]-h)+'" y="'+(q[1]-h)+'" width="'+2*h+'" height="'+2*h+'" rx="2"/>':it.k=="s"?'<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+h+'"/>':'<path d="M'+q[0]+' '+(q[1]-h-1)+'L'+(q[0]+h+1)+' '+(q[1]+h)+'L'+(q[0]-h-1)+' '+(q[1]+h)+'Z"/>';
  s+='<g fill="'+f+'" stroke="#fff" stroke-width="1.5" '+g+' data-id="'+it.id+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+esc(it.n)+'">'+sh+'<title>'+esc(it.n)+'</title></g>'});
 s+='<circle class="pulse" cx="'+c[0]+'" cy="'+c[1]+'" r="14" fill="#164B35"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="6" fill="#164B35" stroke="#fff" stroke-width="2.5"/>';
 $("map").innerHTML=s}
function card(it){var x=it.x,lab={m:T("mk"),s:T("sl"),t:T("tr")}[it.k],body;
 body=it.k=="m"?T("unk"):it.k=="s"?T("rating")+x[4]+" · "+T("area"):x[4]+" · "+T("cap")+x[5].toLocaleString()+" kg · "+T("svc")+x[6]+" km · "+x[7];
 return '<div class="it'+(it.id===sel?' sel':'')+'" id="i-'+it.id+'"><div class="t"><h3>'+esc(it.n)+'</h3><span class="km">'+it.d.toFixed(it.d<10?1:0)+' '+T("line")+'</span></div><div class="m"><i class="k '+it.k+'1">'+lab+'</i>'+esc(it.w)+'</div><div class="m">'+body+'</div><a class="dir" target="_blank" rel="noopener" href="'+dirUrl(loc.a,loc.o,it.a,it.o)+'">'+T("dir")+'</a></div>'}
function render(){
    var items = all(), near = items.filter(function(i){ return i.d <= rad; });
    var emptyState = !items.length ? buildEmptyState('No nearby listings yet', 'Your geographic search is ready.') : '';
    $("cur").textContent = T("set") + loc.n + " (" + loc.a.toFixed(3) + ", " + loc.o.toFixed(3) + ")";
    $("cnt").textContent = near.length + T("found") + rad + " km";
    $("list").innerHTML = near.length ? near.map(card).join("") : (emptyState || '<p class="m">' + T("none") + '</p>');
    draw(items);
}
function buildEmptyState(title, detail){
    return '<div class="it"><div class="t"><h3>' + esc(title) + '</h3></div><div class="m">' + esc(detail) + '</div><div class="m">Choose a town, use your location, or tap the map to start the search.</div></div>';
}

function renderTransporters(){
    var searchInput = $("transporterSearch");
    var vehicleFilter = $("vehicleFilter");
    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var vehicle = vehicleFilter ? vehicleFilter.value : "";
    var results = TR.filter(function(item){
        if (!item || !item[2] || !item[3]) return false;
        var name = String(item[0] || "");
        var town = String(item[1] || "");
        var vehicleName = String(item[4] || "");
        var distance = hv(loc.a, loc.o, item[2], item[3]);
        var matchesText = !query || [name, town, vehicleName].join(" ").toLowerCase().indexOf(query) > -1;
        var matchesVehicle = !vehicle || vehicleName.toLowerCase() === vehicle.toLowerCase();
        var withinService = !item[6] || distance <= Number(item[6]) || Number(item[6]) === 0;
        return matchesText && matchesVehicle && withinService;
    }).map(function(item){
        return { item: item, d: hv(loc.a, loc.o, item[2], item[3]) };
    }).sort(function(a, b){ return a.d - b.d; });

    var list = $("transporterList");
    if (!list) return;
    if (!results.length) {
        list.innerHTML = '<div class="it"><div class="m">No transporters match your current search.</div></div>';
        return;
    }
    list.innerHTML = results.map(function(entry){
        var x = entry.item;
        var distanceText = entry.d < 10 ? entry.d.toFixed(1) : entry.d.toFixed(0);
        return '<div class="transport-card"><div class="meta-row"><h3>'+esc(x[0])+'</h3><span class="tag">'+esc(x[4])+'</span></div><div class="m">'+esc(x[1])+' · '+esc(x[4])+'</div><div class="rate">'+distanceText+' <small>km away</small></div><div class="m">Capacity: '+Number(x[5] || 0).toLocaleString()+' kg · Service: '+Number(x[6] || 0).toLocaleString()+' km</div><div class="m">Pricing: '+esc(x[7] || 'Flexible')+'</div><div class="pill">Verified route</div><a class="dir" target="_blank" rel="noopener" href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route='+loc.a+'%2C'+loc.o+'%3B'+x[2]+'%2C'+x[3]+'">Open directions</a></div>';
    }).join("");
}
async function setLoc(n,a,o){loc={n:n,a:a,o:o};$("gerr").textContent="";try{await refreshFromServer()}catch(e){};render(); try{ updateLeafletView(); }catch(e){} }
async function refreshFromServer() {
    if (!USE_SERVER) return;
    try {
        const resS = await fetch(`/api/nearby/sellers?lat=${encodeURIComponent(loc.a)}&lng=${encodeURIComponent(loc.o)}&radiusKm=${encodeURIComponent(rad)}`);
        if (resS.ok) {
            const data = await resS.json();
            // replace SL (sellers list) with server results for this view
            SL = (data.sellers || []).map(function(s){ return [s.full_name, s.location || '', s.lat || 0, s.lng || 0, s.rating || 0, s.capacity_kg || 0, s.service_km || 0, s.pricing_method || ''] });
        }
        // optionally fetch transporters via admin/list routes -> here use /api/admin/listings? not required; leave TR unchanged unless server API for transporters added
    } catch (e) {
        console.error('Failed to fetch nearby sellers', e);
    }
}
$("gps").onclick=function(){
    if(!navigator.geolocation){$("gerr").textContent=T("perm");return}
    // better permission handling
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({name:'geolocation'}).then(function(res){
            if (res.state === 'denied') { $("gerr").textContent = T('perm'); return; }
            // prompt or granted
            navigator.geolocation.getCurrentPosition(function(p){
                setLoc(lang=="sw"?"Eneo langu":"My location",p.coords.latitude,p.coords.longitude);
                fetch('/api/users/location', {
                    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude, name: lang=='sw'? 'Eneo langu':'My location' })
                }).catch(function(){ });
            }, function(err){
                if (err && err.code === 1) { $("gerr").textContent = T('perm'); }
                else { $("gerr").textContent = T('perm'); }
            }, { timeout: 12000 });
        }).catch(function(){
            // fallback to direct call
            navigator.geolocation.getCurrentPosition(function(p){ setLoc(lang=="sw"?"Eneo langu":"My location",p.coords.latitude,p.coords.longitude); }, function(){ $("gerr").textContent=T('perm'); }, { timeout: 12000 });
        });
    } else {
        navigator.geolocation.getCurrentPosition(function(p){ setLoc(lang=="sw"?"Eneo langu":"My location",p.coords.latitude,p.coords.longitude); }, function(){ $("gerr").textContent=T('perm'); }, { timeout: 12000 });
    }
};
$("town").onchange=function(){var t=TOWNS[this.value];setLoc(t[0],t[1],t[2])};
$("map").onclick=function(e){var g=e.target.closest("[data-id]");if(g){sel=g.dataset.id;render();var el=$("i-"+sel);if(el)el.scrollIntoView({block:"nearest"});return}
 var b=this.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*576,y=(e.clientY-b.top)/b.height*700;setLoc(lang=="sw"?"Eneo ulilochagua":"Chosen point",5-y/72,x/72+33.9)};
// clicking on list items should open corresponding leaflet marker popup (if available)
root.addEventListener('click', function(ev){
    var b = ev.target.closest && ev.target.closest('[id^="i-"]');
    if (!b) return;
    var id = b.id.replace(/^i-/, '');
    // if leaflet marker exists, open popup and fly to it
    if (_leafletMarkers && _leafletMarkers[id]) {
        try { _leafletMap.flyTo(_leafletMarkers[id].getLatLng(), Math.max(10, _leafletMap.getZoom())); _leafletMarkers[id].openPopup(); } catch(e) {}
    }
});
root.querySelectorAll("[data-ly]").forEach(function(c){c.onchange=function(){ly[c.dataset.ly]=c.checked?1:0;render()}});
function chips(){$("rad").innerHTML=R.map(function(r){return '<button aria-pressed="'+(r===rad)+'" data-r="'+r+'">'+r+' km</button>'}).join("");$("rad").setAttribute("aria-label",T("radius"))}
$("rad").onclick=function(e){var b=e.target.closest("button");if(b){rad=+b.dataset.r;chips();render()}};
function opts(){var o=TOWNS.map(function(t,i){return '<option value="'+i+'">'+t[0]+'</option>'}).join("");[["town",0],["from",0],["to",5]].forEach(function(p){var e=$(p[0]);if(!e)return;var v=e.value||p[1];e.innerHTML=o;e.value=v})}
function updateLanguageButton(){
    var btn = root.getElementById('lg');
    if (btn) btn.textContent = lang == 'en' ? 'Kiswahili' : 'English';
}

function updateThemeButton(){
    var btn = root.getElementById('th');
    if (btn) btn.textContent = document.documentElement.dataset.theme == 'dark' ? 'Light' : 'Dark';
}

 $("lg") && $("lg").onclick && ($("lg").onclick=function(){lang=lang=="en"?"sw":"en";text();});
 $("th") && $("th").onclick && ($("th").onclick=function(){var d=document.documentElement;d.dataset.theme=d.dataset.theme=="dark"?"light":"dark";updateThemeButton();});

function text(){
document.documentElement.lang=lang;
root.querySelectorAll("[data-t]").forEach(function(e){e.textContent=T(e.dataset.t)});
updateLanguageButton();
updateThemeButton();
chips();renderTransporters();render();
}
 opts();$("town").value=0;text();
 if ($("transporterSearch")) { $("transporterSearch").addEventListener('input', renderTransporters); }
 if ($("vehicleFilter")) { $("vehicleFilter").addEventListener('change', renderTransporters); }
 // attempt to enable Leaflet/OpenStreetMap for an interactive map
 (async function(){
     const ok = await loadLeafletAssets();
     if (ok) {
         ensureLeafletMap();
         // update view after initial render
         setTimeout(function(){ updateLeafletView(); }, 250);
         // update whenever user changes filters (simple hook)
         root.querySelectorAll('[data-ly], #rad, #town').forEach(function(el){ el.addEventListener('change', function(){ updateLeafletView(); }); });
         root.querySelectorAll('#town, #rad, #gps').forEach(function(el){
            el.addEventListener('click', renderTransporters);
            el.addEventListener('change', renderTransporters);
         });
     }
 })();
 })(window.__r.map);
