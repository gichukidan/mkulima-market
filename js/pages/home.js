/* home view. Runs inside a shadow root passed in as `root`. */
(function(root){
var D={en:{},sw:{
nBuy:"Tafuta Wanunuzi",nProd:"Mazao",nSell:"Wauzaji",nPrice:"Bei",nAi:"Uliza Mkulima AI",start:"Anza Sasa",login:"Ingia",
h1:"Kutoka Shambani hadi Sokoni. Miunganisho Bora. Biashara Bora.",lead:"Pata mazao mapya, unganika na wanunuzi na wauzaji wanaoaminika, tafuta usafiri na ufanye maamuzi bora ya biashara—yote mahali pamoja.",
explore:"Chunguza Soko",sell:"Anza Kuuza",search:"Tafuta",phProd:"Tafuta nyanya, vitunguu, karoti",phLoc:"Mji au soko",sampleP:"Mfano wa tangazo",pTom:"Nyanya, kreti ya kilo 50",
f1h:"Mazao Yako Yanastahili Soko.",f1p:"Angalia maombi ya wauzaji wa rejareja, wafanyabiashara na kampuni, tuma ofa yako na ulinganishe majibu mahali pamoja. Tumia muda mchache kutafuta na zaidi kuuza.",f1b:"Tafuta Wanunuzi",
f2h:"Pata Mazao Mapya. Linganisha. Unganika.",f2p:"Tafuta kwa aina ya zao, bei, kiasi, ubora na eneo, kisha angalia sifa ya muuzaji kabla ya kupiga simu.",f2b:"Chunguza Mazao",
f3h:"Kutoka Shambani hadi kwa Mnunuzi.",f3p:"Tafuta wasafirishaji, omba bei na ulinganishe chaguo za usafirishaji. Usafiri utaanza Awamu ya 2, pamoja na ramani na makadirio ya umbali.",f3b:"Tafuta Usafiri",
q1:"Tafuta viazi karibu nami",a1:"Hivi ndivyo nitakavyojibu nikiunganishwa na matangazo halisi: natafuta matangazo ya kweli, nayapanga kwa bei na ukadiriaji wa muuzaji, na nakuambia data ikikosekana.",a2:"Muhtasari wa Awamu ya 3. Bado haifanyi kazi.",q2:"Nionyeshe masoko ya karibu",
f4h:"Maamuzi Bora Huanzia Hapa.",f4p:"Uliza kwa Kiingereza au Kiswahili kutafuta mazao, kulinganisha ofa na kugundua masoko ya karibu. Majibu yatatoka kwenye data halisi ya jukwaa pekee, na msaidizi atakwambia kitu kikikosekana.",f4b:"Uliza Mkulima AI",
prH:"Mazao Mapya Kutoka Sokoni",demo:"Data ya mfano",viewAll:"Tazama Mazao Yote",empty:"Hakuna mazao yanayolingana na utafutaji wako. Jaribu jina lingine au futa vichujio.",
seH:"Wauzaji Wanaoaminika",seP:"Ukadiriaji unatoka kwa wanunuzi waliokamilisha muamala. Wauzaji wenye maoni mazuri zaidi hupanda juu kwenye utafutaji.",
vbH:"Beji ya buluu ni tofauti na ukadiriaji.",vbP:"Ni huduma ya uthibitisho inayolipiwa, inayojumuisha ziara shambani au kwenye biashara. Kulipa hakuhakikishi beji, na ukadiriaji mzuri haimaanishi muuzaji amethibitishwa.",
prcH:"Bei rahisi zinazokua na biashara yako",prcP:"Bei zilizopendekezwa za kuzindua, zitajaribiwa na watumiaji halisi na zinaweza kubadilishwa baadaye.",
l5:"Hadi matangazo 5 yanayoendelea",p3:"Picha 3 kwa tangazo",bp:"Wasifu wa msingi",aiAcc:"Ufikiaji wa Mkulima AI",mo:" / mwezi",ev1:"Kila kitu kwenye Free",l25:"Hadi matangazo 25 yanayoendelea",p5:"Picha 5 kwa tangazo",stats:"Takwimu za mitazamo na maswali",sms:"Tahadhari za bei kwa SMS",planned:"Imepangwa",ev2:"Kila kitu kwenye Biashara",unl:"Matangazo yasiyo na kikomo",team:"Akaunti za timu na zabuni kubwa",prio:"Usaidizi wa kipaumbele na ripoti za soko",
bbH:"Uthibitisho wa Beji ya Buluu",bbP:"Tunatembelea shamba au biashara yako na kufanya ukaguzi wa uthibitisho ili wanunuzi wakuamini. Kulingana na ratiba, eneo na ziara iliyofanikiwa. Beji haitolewi kwa sababu tu mtu amelipa. Hali ya uthibitisho na usasishaji huonekana kwenye wasifu wako.",
hwH:"Jinsi inavyofanya kazi",s1h:"Gundua au weka ombi",s1p:"Tafuta mazao karibu nawe, au waambie wauzaji unachohitaji.",s2h:"Linganisha ofa na unganika",s2p:"Kagua bei, ukadiriaji na kiasi, kisha wasiliana na mshirika wako.",s3h:"Panga ukusanyaji au usafiri",s3p:"Kubaliana kuhusu makabidhiano, kamilisha muamala kisha acha maoni.",
clH:"Tujenge Masoko Bora ya Kilimo Pamoja.",jb:"Jiunge kama mnunuzi",js:"Jiunge kama muuzaji",jt:"Jiunge kama msafirishaji",reg:"Usajili utafunguliwa soko litakapozinduliwa. Vitufe hivi bado havifanyi kazi.",
fAbout:"Soko la kilimo la Kenya kwa wakulima, wanunuzi, masoko na wasafirishaji.",fE:"Gundua",fC:"Mawasiliano",fL:"Lugha",terms:"Masharti",priv:"Faragha"}};
var P=window.MKDATA.produce,S=window.MKDATA.sellers;
var Ic={star:'<svg class="ic" viewBox="0 0 24 24" style="fill:currentColor"><path d="m12 2 3.100 6.300 6.900 1-5 4.900 1.200 6.900L12 17.800 5.800 21l1.200-6.900-5-4.900 6.900-1Z"/></svg>',pin:'<svg class="ic" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',sh:'<svg class="ic vb" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'};
var lang="en",cat="all",$=function(i){return root.getElementById(i)};
var EN={};root.querySelectorAll("[data-t]").forEach(function(e){EN[e.dataset.t]=e.textContent});
root.querySelectorAll("[data-p]").forEach(function(e){EN["p_"+e.dataset.p]=e.placeholder});
function t(k){return lang==="sw"&&D.sw[k]!=null?D.sw[k]:EN[k]}
function fmt(n){return "KSh "+n.toLocaleString("en-KE")}
function render(){
 var q=$("q").value.trim().toLowerCase(),lo=$("loc").value.trim().toLowerCase(),n=0;
 $("rail").innerHTML=P.filter(function(p){return(cat==="all"||p.c===cat)&&(!q||(p.n.en+p.n.sw).toLowerCase().indexOf(q)>-1)&&(!lo||p.l.toLowerCase().indexOf(lo)>-1)}).map(function(p){n++;
 return '<article class="card"><div class="im" style="--pos:'+p.pos+';--sz:'+p.sz+'"><i></i></div><div class="b"><h3>'+p.n[lang]+'</h3><div class="price">'+fmt(p.pr)+' <small>/ '+p.u[lang]+'</small></div><div class="meta"><span>'+p.s+'</span><span class="stars">'+Ic.star+'&nbsp;'+p.r+'</span></div><div class="meta"><span>'+Ic.pin+' '+p.l+'</span><span class="stock'+(p.low?' low':'')+'">'+(p.low?(lang==="sw"?"Inaisha":"Almost out"):(lang==="sw"?"Ipo":"Available"))+' · '+p.q+'</span></div></div></article>'}).join("");
 $("empty").style.display=n?"none":"block"}
function cats(){var L={all:["All","Yote"],veg:["Vegetables","Mboga"],fruit:["Fruit","Matunda"]};
 $("cats").innerHTML=Object.keys(L).map(function(k){return '<button data-c="'+k+'" aria-pressed="'+(cat===k)+'">'+L[k][lang==="sw"?1:0]+'</button>'}).join("")}
function sellers(){$("sg").innerHTML=S.map(function(s){return '<div class="sel"><div class="av" style="--pos:'+s.pos+';--sz:420%"></div><div><b>'+s.b+(s.v?Ic.sh:'')+'</b><small>'+s.l+' · '+s.c+'</small><small class="stars" style="display:flex;gap:4px;align-items:center">'+Ic.star+' '+s.r+' ('+s.n+' '+(lang==="sw"?"maoni":"reviews")+')'+'</small></div></div>'}).join("")}
function apply(){
 document.documentElement.lang=lang;
 root.querySelectorAll("[data-t]").forEach(function(e){e.textContent=t(e.dataset.t)});
 root.querySelectorAll("[data-p]").forEach(function(e){e.placeholder=lang==="sw"?D.sw[e.dataset.p]:EN["p_"+e.dataset.p]});
 $("lt").textContent=lang==="en"?"SW":"EN";cats();render();sellers()}
$("lang").onclick=function(){lang=lang==="en"?"sw":"en";apply()};
root.querySelectorAll("[data-l]").forEach(function(a){a.onclick=function(e){e.preventDefault();lang=a.dataset.l;apply()}});
$("cats").onclick=function(e){var b=e.target.closest("button");if(b){cat=b.dataset.c;cats();render()}};
$("sf").onsubmit=function(e){e.preventDefault();render();$("produce").scrollIntoView()};
$("q").oninput=$("loc").oninput=render;
$("th").onclick=function(){var d=document.documentElement,x=d.dataset.theme==="dark"?"light":"dark";d.dataset.theme=x};
$("mb").onclick=function(){var o=$("nav").classList.toggle("open");$("mb").setAttribute("aria-expanded",o)};
$("mm").onclick=function(){$("nav").classList.remove("open")};
function sc(){$("nav").classList.toggle("s",scrollY>40)}addEventListener("scroll",sc,{passive:true});sc();
if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("on");io.unobserve(e.target)}})},{threshold:.12});root.querySelectorAll(".rv").forEach(function(e){io.observe(e)})}else root.querySelectorAll(".rv").forEach(function(e){e.classList.add("on")});
apply();
})(window.__r.home);
