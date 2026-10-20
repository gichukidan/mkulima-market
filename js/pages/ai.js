/* ai view. Runs inside a shadow root passed in as `root`. */
(function(root){
var MKDATA=window.MKDATA,TOWNS=MKDATA.towns,MK=MKDATA.markets,LI=MKDATA.listings,PR=MKDATA.priceReports;
var L={en:{h1:"Ask Mkulima AI and read the market",lead:"Ask in English or Kiswahili. Answers come only from live listings on Mkulima Market.",note:"Prices shown are asking prices set by sellers. Distances are straight-line, not road distance. Market price reports are coming soon.",dark:"Dark mode",
aiH:"Ask Mkulima AI",aiP:"Ask in English or Kiswahili. The assistant searches live listings and nearby sellers. Set your location to get distances.",gps:"Use my location",ph:"Ask about produce, markets or prices",ask:"Ask",loc0:"Location not set",loc1:"Location: ",
miH:"Market intelligence",demo:"Sample data",miP:"A trend line appears only with at least 5 reported prices for one commodity at one market. Asking, reported and confirmed prices are kept apart.",rep:"Reported market price",ask2:"Asking price",conf:"Confirmed transaction",trend:"Change over the period",dt:"Date",ty:"Type",pc:"Price (KSh)",src:"Source",
liH:"Listings found",foot:"Ask Mkulima AI is powered by Google Gemini through our server. It only uses Mkulima Market data and says when information is missing. Limit: 20 questions per hour.",
few:"Not enough reliable data for a trend. At least 5 reported prices are needed; this series has ",none:"No data",chg:"Reported price moved from KSh ",to:" to KSh ",over:" over ",wk:" weeks. This describes past reports only and is not a forecast.",
thinking:"Thinking…",offline:"You are offline. Connect to the internet to ask Mkulima AI.",askp:"asking price",straight:"straight-line",noli:"Listings the assistant finds will appear here.",lookup:"Looking up: ",fail:"The assistant could not answer. ",consent:"The AI assistant is not available right now.",limit:"Too many requests. Wait a moment and try again.",gpsErr:"Location unavailable or declined. Choose a town instead.",
qty:" kg available",rating:"Rating ",norate:"No reviews yet",sug:["Find potatoes near me","Compare sellers with at least 50 bags of potatoes","Which markets are closest to me?","How are tomato prices trending?","How can I find buyers for my tomatoes?"],hello:"Hello. Ask me about produce, sellers near you, or how to sell your harvest."},
sw:{h1:"Uliza Mkulima AI na usome soko",lead:"Uliza kwa Kiingereza au Kiswahili. Majibu yanatoka kwenye matangazo halisi ya Mkulima Market pekee.",note:"Bei zinazoonyeshwa ni bei za kuuliza zilizowekwa na wauzaji. Umbali ni wa mstari ulionyooka, si wa barabara. Ripoti za bei za soko zinakuja hivi karibuni.",dark:"Hali ya giza",
aiH:"Uliza Mkulima AI",aiP:"Uliza kwa Kiingereza au Kiswahili. Msaidizi hutafuta matangazo halisi na wauzaji wa karibu. Weka eneo lako kupata umbali.",gps:"Tumia eneo langu",ph:"Uliza kuhusu mazao, masoko au bei",ask:"Uliza",loc0:"Eneo halijawekwa",loc1:"Eneo: ",
miH:"Taarifa za soko",demo:"Data ya mfano",miP:"Mstari wa mwelekeo huonekana tu kukiwa na ripoti angalau 5 za bei za zao moja sokoni mmoja. Bei za kuuliza, zilizoripotiwa na zilizothibitishwa zimetenganishwa.",rep:"Bei ya soko iliyoripotiwa",ask2:"Bei ya kuuliza",conf:"Muamala uliothibitishwa",trend:"Mabadiliko katika kipindi",dt:"Tarehe",ty:"Aina",pc:"Bei (KSh)",src:"Chanzo",
liH:"Matangazo yaliyopatikana",foot:"Uliza Mkulima AI inaendeshwa na Google Gemini kupitia seva yetu. Inatumia data ya Mkulima Market pekee na husema taarifa ikikosekana. Kikomo: maswali 20 kwa saa.",
few:"Data ya kuaminika haitoshi kwa mwelekeo. Ripoti angalau 5 za bei zinahitajika; mfululizo huu una ",none:"Hakuna data",chg:"Bei iliyoripotiwa ilihama kutoka KSh ",to:" hadi KSh ",over:" katika wiki ",wk:". Hii inaelezea ripoti zilizopita pekee, si utabiri.",
thinking:"Napanga jibu…",offline:"Uko nje ya mtandao. Unganisha intaneti ili kuuliza Mkulima AI.",askp:"bei ya kuuliza",straight:"mstari ulionyooka",noli:"Matangazo atakayopata msaidizi yataonekana hapa.",lookup:"Natafuta: ",fail:"Msaidizi hakuweza kujibu. ",consent:"Msaidizi wa AI hapatikani kwa sasa.",limit:"Maombi mengi mno. Subiri kidogo kisha ujaribu tena.",gpsErr:"Eneo halipatikani au umekataa. Chagua mji.",
qty:" kg zinapatikana",rating:"Ukadiriaji ",norate:"Bado hakuna maoni",sug:["Tafuta viazi karibu nami","Linganisha wauzaji wenye angalau magunia 50 ya viazi","Masoko gani ni ya karibu nami?","Bei za nyanya zinaendeleaje?","Ninawezaje kupata wanunuzi wa nyanya zangu?"],hello:"Karibu. Niulize kuhusu mazao, wauzaji walio karibu nawe, au jinsi ya kuuza mavuno yako."}};
var lang="en",loc=null,hist=[],busy=false,ctl=null,$=function(i){return root.getElementById(i)},T=function(k){return L[lang][k]};
function hv(a,b,c,d){var r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2);return 12742*Math.asin(Math.sqrt(x*x+Math.cos(a*r)*Math.cos(c*r)*y*y))}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function md(s){s=esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
 s=s.replace(/\[([^\]]+)\]\(#l-(\d+)\)/g,'<a href="#l-$2" data-l="$2">$1</a>');
 return s.replace(/\[([^\]]+)\]\((https:\/\/www\.openstreetmap\.org\/directions[^)\s]+)\)/g,'<a target="_blank" rel="noopener" href="$2">$1</a>')}
function bub(cls,html){var d=document.createElement("div");d.className=cls;d.innerHTML=html;$("msgs").appendChild(d);$("msgs").scrollTop=1e9;return d}
/* Sends the conversation to our server (POST /api/ai). The server calls Gemini with tools
   that read the real database, so the API key never reaches the browser. */
async function ask(text){text=text.trim();if(!text||busy)return;
 bub("b u",esc(text));busy=true;$("send").disabled=true;hist.push({role:"user",content:text});
 var a=bub("b a",esc(T("thinking")));
 try{
  var res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",
   body:JSON.stringify({messages:hist.slice(-12),lang:lang,location:loc?{name:loc.name,lat:loc.lat,lng:loc.lon}:null})});
  var data=await res.json().catch(function(){return{}});
  if(!res.ok){hist.pop();a.className="b a err";a.textContent=res.status==429?T("limit"):(data.error||T("fail"));}
  else{
   (data.tools||[]).filter(function(t,i,arr){return arr.indexOf(t)==i}).forEach(function(t){var tl=document.createElement("div");tl.className="tool";tl.textContent=T("lookup")+t.replace(/_/g," ");$("msgs").insertBefore(tl,a)});
   a.innerHTML=md(data.text||"");hist.push({role:"assistant",content:data.text||""});
   if(data.sources&&data.sources.length){var sv=document.createElement("small");sv.className="src";sv.textContent=(lang=="sw"?"Vyanzo: ":"Sources: ")+data.sources.map(function(x){return x.title}).join(" · ");a.appendChild(sv)}
   if(data.listings&&data.listings.length){LI=data.listings;listings()}
  }
 }catch(e){hist.pop();a.className="b a err";a.textContent=navigator.onLine?T("fail"):T("offline")}
 busy=false;$("send").disabled=false;$("msgs").scrollTop=1e9}
$("f").onsubmit=function(e){e.preventDefault();var v=$("q").value;$("q").value="";ask(v)};
$("sug").onclick=function(e){var b=e.target.closest("button");if(b)ask(b.textContent)};
$("msgs").onclick=function(e){var a=e.target.closest("[data-l]");if(!a)return;e.preventDefault();var el=$("l-"+a.dataset.l);if(el){root.querySelectorAll(".li.hl").forEach(function(x){x.classList.remove("hl")});el.classList.add("hl");el.scrollIntoView({behavior:"smooth",block:"center"})}};
function setLoc(n,a,o){loc={name:n,lat:a,lon:o};$("locs").textContent=T("loc1")+n}
$("town").onchange=function(){var t=TOWNS[this.value];if(t)setLoc(t[0],t[1],t[2])};
$("gps").onclick=function(){if(!navigator.geolocation){$("locs").textContent=T("gpsErr");return}navigator.geolocation.getCurrentPosition(function(p){setLoc(lang=="sw"?"Eneo langu":"My location",+p.coords.latitude.toFixed(3),+p.coords.longitude.toFixed(3))},function(){$("locs").textContent=T("gpsErr")},{timeout:10000})};
/* market intelligence */
function series(){var k={};PR.forEach(function(p){k[p.c+"|"+p.m]=1});return Object.keys(k)}
function chart(){var k=$("series").value.split("|"),d=PR.filter(function(p){return p.c==k[0]&&p.m==k[1]}).sort(function(a,b){return a.d<b.d?-1:1}),rp=d.filter(function(p){return p.t=="reported"});
 $("tb").innerHTML=d.map(function(p){return"<tr><td>"+p.d+"</td><td>"+T(p.t=="reported"?"rep":p.t=="asking"?"ask2":"conf")+"</td><td>"+p.p+" / "+p.u+"</td><td>"+p.s+"</td></tr>"}).join("");
 if(rp.length<5){$("chart").innerHTML='<p class="m" style="padding:30px 10px">'+T("few")+rp.length+".</p>";$("tv").textContent="—";$("tn").textContent="";return}
 var W=640,H=280,P=44,ps=d.map(function(p){return p.p}),mn=Math.min.apply(0,ps)-5,mx=Math.max.apply(0,ps)+5,t0=new Date(d[0].d),t1=new Date(d[d.length-1].d),sp=(t1-t0)||1;
 function X(s){return P+(new Date(s)-t0)/sp*(W-P-14)}function Y(v){return H-26-(v-mn)/(mx-mn)*(H-46)}
 var s='<svg class="ch" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Price chart">';
 for(var g=0;g<=3;g++){var v=mn+(mx-mn)*g/3;s+='<line x1="'+P+'" x2="'+W+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="currentColor" opacity=".12"/><text x="4" y="'+(Y(v)+4)+'" font-size="12" fill="currentColor" opacity=".6">'+Math.round(v)+'</text>'}
 s+='<polyline fill="none" stroke="#38A765" stroke-width="3" points="'+rp.map(function(p){return X(p.d)+","+Y(p.p)}).join(" ")+'"/>';
 d.forEach(function(p){var x=X(p.d),y=Y(p.p);s+=p.t=="reported"?'<circle cx="'+x+'" cy="'+y+'" r="5" fill="#38A765"/>':p.t=="asking"?'<rect x="'+(x-5)+'" y="'+(y-5)+'" width="10" height="10" fill="#F47721" transform="rotate(45 '+x+' '+y+')"/>':'<rect x="'+(x-5)+'" y="'+(y-5)+'" width="10" height="10" fill="#4A9FE8"/>'});
 s+='<text x="'+P+'" y="'+(H-4)+'" font-size="12" fill="currentColor" opacity=".6">'+d[0].d+'</text><text x="'+(W-14)+'" y="'+(H-4)+'" text-anchor="end" font-size="12" fill="currentColor" opacity=".6">'+d[d.length-1].d+'</text></svg>';
 $("chart").innerHTML=s;var a=rp[0],b=rp[rp.length-1],c=(b.p-a.p)/a.p*100,wk=Math.round((new Date(b.d)-new Date(a.d))/6048e5);
 $("tv").textContent=(c>0?"+":"")+c.toFixed(1)+"%";$("tn").textContent=T("chg")+a.p+T("to")+b.p+T("over")+wk+T("wk")}
function listings(){$("ls").innerHTML=LI.length?LI.map(function(l){return'<div class="li" id="l-'+Number(l.id)+'"><h3>'+esc(l.title||l.commodity)+'</h3><div class="pr">KSh '+Number(l.price_per_kg).toLocaleString()+' <span class="m">/ kg · '+T("askp")+'</span></div><div class="m">'+esc(l.seller_name||"")+(l.area?', '+esc(l.area):'')+'</div><div class="m">'+Number(l.quantity_kg).toLocaleString()+T("qty")+(l.is_demo?'<div class="m"><b>Demo</b></div>':'')+'</div>'+(l.distance_km!=null?'<div class="m">'+l.distance_km+' km '+T("straight")+'</div>':'')+'</div>'}).join(""):'<p class="m">'+esc(T("noli"))+'</p>'}
function text(){document.documentElement.lang=lang;root.querySelectorAll("[data-t]").forEach(function(e){e.textContent=T(e.dataset.t)});$("q").placeholder=T("ph");$("lg").textContent=lang=="en"?"Kiswahili":"English";
 $("locs").textContent=loc?T("loc1")+loc.name:T("loc0");$("sug").innerHTML=T("sug").map(function(s){return"<button type=button>"+esc(s)+"</button>"}).join("");
 var v=$("series").value;$("series").innerHTML=series().map(function(k){var p=k.split("|");return'<option value="'+k+'">'+p[0]+" – "+p[1]+"</option>"}).join("");if(v)$("series").value=v;chart();listings()}
$("series").onchange=chart;
$("lg").onclick=function(){lang=lang=="en"?"sw":"en";text()};
$("th").onclick=function(){var d=document.documentElement;d.dataset.theme=d.dataset.theme=="dark"?"light":"dark"};
$("town").innerHTML='<option value="">—</option>'+TOWNS.map(function(t,i){return'<option value="'+i+'">'+t[0]+"</option>"}).join("");
text();bub("b a",esc(T("hello")));
})(window.__r.ai);
