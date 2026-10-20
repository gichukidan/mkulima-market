var SW={home:"Nyumbani",project:"Mradi",produce:"Mazao",map:"Ramani na usafiri",ai:"Uliza Mkulima AI",market:"Taarifa za soko",pricing:"Bei",auth:"Ingia / Jiunge",dashboard:"Dashboard","seller-form":"Formu ya muuzaji","transporter-form":"Formu ya msafirishaji"},EN={},$=function(i){return document.getElementById(i)},lang="en",R={home:["home","top"],project:["home","top"],produce:["home","produce"],pricing:["home","pricing"],map:["map","top"],ai:["ai","ai"],market:["ai","intel"],auth:["auth","top"],dashboard:["dashboard","top"],"seller-form":["seller-form","top"],"transporter-form":["transporter-form","top"]};
document.querySelectorAll("#sl a").forEach(function(a){EN[a.dataset.k]=a.textContent});
function route(){var p=(location.hash||"#/home").replace(/^#\/?/,"").split("/"),k=p[0]||"home";if(k=="home"&&p[1])k=p[1];if(!R[k])k="home";var v=R[k][0],s=R[k][1];
 document.querySelectorAll(".view").forEach(function(e){e.classList.toggle("on",e.id=="v-"+v)});
 document.querySelectorAll("#sl a").forEach(function(a){if(a.dataset.k==k)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
 $("sn").classList.remove("open");
 $("hb") && $("hb").setAttribute("aria-expanded","false");
 scrollTo(0,0);
 var el=s!="top"&&window.__r[v]&&window.__r[v].getElementById(s);if(el)setTimeout(function(){el.scrollIntoView()},30)}
addEventListener("hashchange",route);
Object.keys(window.__r).forEach(function(k){var r=window.__r[k];r.addEventListener("click",function(e){if(e.defaultPrevented)return;var a=e.composedPath().filter(function(n){return n.tagName=="A"})[0];if(!a)return;var h=a.getAttribute("href")||"";
 if(a.dataset.go){e.preventDefault();location.hash=a.dataset.go;return}
 if(h.length>1&&h.charAt(1)!="/"&&h.charAt(0)=="#"){var t=r.getElementById(h.slice(1));if(t){e.preventDefault();t.scrollIntoView()}}else if(h=="#"){e.preventDefault()}})});
$("sl2") && ($("sl2").onclick=function(){lang=lang=="en"?"sw":"en";[["home","lang"],["map","lg"],["ai","lg"]].forEach(function(p){window.__r[p[0]]&&window.__r[p[0]].getElementById(p[1])&&window.__r[p[0]].getElementById(p[1]).click()});
 this.textContent=lang=="en"?"SW":"EN";document.querySelectorAll("#sl a").forEach(function(a){a.textContent=lang=="sw"?SW[a.dataset.k]:EN[a.dataset.k]});document.documentElement.lang=lang});
function theme(t){document.documentElement.dataset.theme=t;Object.keys(window.__r).forEach(function(k){window.__r[k].host.dataset.theme=t});$("sth") && ($("sth").textContent=t=="dark"?"Light":"Dark")}
$("sth") && ($("sth").onclick=function(){theme(document.documentElement.dataset.theme=="dark"?"light":"dark")});
$("hb") && ($("hb").onclick=function(){var o=$("sn").classList.toggle("open");this.setAttribute("aria-expanded",o)});
theme(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");route();
