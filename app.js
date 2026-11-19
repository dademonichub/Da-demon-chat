import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as AppwriteClient, Storage as AppwriteStorage, ID as AppwriteID } from "https://esm.sh/appwrite@14";
import { CONFIG } from "./appwrite-config.js";
import { getMessagingInstance, VAPID_KEY } from "./firebase-config.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging.js";

// === SUPABASE BRAIN ===
const SUPABASE_URL = "https://amvmhvheyuflgwiidtfv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fDIFAd7u8gOB7VZYeJQajw_LD5JFzJT";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === APPWRITE STORE (FRA - FAST) ===
const awClient = new AppwriteClient().setEndpoint(CONFIG.ENDPOINT).setProject(CONFIG.PROJECT_ID);
const awStorage = new AppwriteStorage(awClient);

let currentUser = null; let currentChatId = null; let currentChatWith = null; let isSignup = true;
function detectPhoneLang(){let p=(navigator.language||"en").toLowerCase().split("-")[0];let m={tl:"fil",jw:"jv",iw:"he"};return m[p]||p;}
let selectedLang = localStorage.getItem("ddchat_lang") || detectPhoneLang() || "en";
const userCache = {};
let presenceChannel = null;
let heartbeatInterval = null;
let chatChannel = null;
let chatsChannel = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function showScreen(id){ $$(".screen").forEach(s => s.classList.remove("active")); $("#" + id).classList.add("active"); const l=localStorage.getItem("ddchat_lang"); if(l && l!=="en") setTimeout(()=>translateApp(l),150); }
function showModal(title, bodyHtml){ $("#modalTitle").textContent = title; $("#modalBody").innerHTML = bodyHtml; $("#modal").classList.remove("hidden"); const l=localStorage.getItem("ddchat_lang"); if(l && l!=="en") setTimeout(()=>translateApp(l),100); }
$("#modalClose").onclick = () => $("#modal").classList.add("hidden");
let authChecked = false;
setTimeout(() => { if(!authChecked){ if(!localStorage.getItem("ddchat_lang")) showScreen("language-screen"); } }, 1800);

const LANGUAGES = [{code:"en",name:"English"},{code:"af",name:"Afrikaans"},{code:"sq",name:"Albanian"},{code:"am",name:"Amharic"},{code:"ar",name:"Arabic"},{code:"hy",name:"Armenian"},{code:"as",name:"Assamese"},{code:"ay",name:"Aymara"},{code:"az",name:"Azerbaijani"},{code:"bm",name:"Bambara"},{code:"eu",name:"Basque"},{code:"be",name:"Belarusian"},{code:"bn",name:"Bengali"},{code:"bho",name:"Bhojpuri"},{code:"bs",name:"Bosnian"},{code:"bg",name:"Bulgarian"},{code:"ca",name:"Catalan"},{code:"ceb",name:"Cebuano"},{code:"ny",name:"Chichewa"},{code:"zh",name:"Chinese"},{code:"zh-TW",name:"Chinese Trad"},{code:"co",name:"Corsican"},{code:"hr",name:"Croatian"},{code:"cs",name:"Czech"},{code:"da",name:"Danish"},{code:"dv",name:"Dhivehi"},{code:"doi",name:"Dogri"},{code:"nl",name:"Dutch"},{code:"ee",name:"Ewe"},{code:"fil",name:"Filipino"},{code:"fi",name:"Finnish"},{code:"fr",name:"French"},{code:"fy",name:"Frisian"},{code:"gl",name:"Galician"},{code:"ka",name:"Georgian"},{code:"de",name:"German"},{code:"el",name:"Greek"},{code:"gn",name:"Guarani"},{code:"gu",name:"Gujarati"},{code:"ht",name:"Haitian Creole"},{code:"ha",name:"Hausa"},{code:"haw",name:"Hawaiian"},{code:"he",name:"Hebrew"},{code:"hi",name:"Hindi"},{code:"hmn",name:"Hmong"},{code:"hu",name:"Hungarian"},{code:"is",name:"Icelandic"},{code:"ig",name:"Igbo"},{code:"ilo",name:"Ilocano"},{code:"id",name:"Indonesian"},{code:"ga",name:"Irish"},{code:"it",name:"Italian"},{code:"ja",name:"Japanese"},{code:"jv",name:"Javanese"},{code:"kn",name:"Kannada"},{code:"kk",name:"Kazakh"},{code:"km",name:"Khmer"},{code:"rw",name:"Kinyarwanda"},{code:"gom",name:"Konkani"},{code:"ko",name:"Korean"},{code:"kri",name:"Krio"},{code:"ku",name:"Kurdish Kurmanji"},{code:"ckb",name:"Kurdish Sorani"},{code:"ky",name:"Kyrgyz"},{code:"lo",name:"Lao"},{code:"la",name:"Latin"},{code:"lv",name:"Latvian"},{code:"ln",name:"Lingala"},{code:"lt",name:"Lithuanian"},{code:"lg",name:"Luganda"},{code:"lb",name:"Luxembourgish"},{code:"mk",name:"Macedonian"},{code:"mai",name:"Maithili"},{code:"mg",name:"Malagasy"},{code:"ms",name:"Malay"},{code:"ml",name:"Malayalam"},{code:"mt",name:"Maltese"},{code:"mi",name:"Maori"},{code:"mr",name:"Marathi"},{code:"mni-Mtei",name:"Manipuri"},{code:"lus",name:"Mizo"},{code:"mn",name:"Mongolian"},{code:"my",name:"Burmese"},{code:"ne",name:"Nepali"},{code:"no",name:"Norwegian"},{code:"or",name:"Odia"},{code:"om",name:"Oromo"},{code:"ps",name:"Pashto"},{code:"fa",name:"Persian"},{code:"pl",name:"Polish"},{code:"pt",name:"Portuguese"},{code:"pa",name:"Punjabi"},{code:"qu",name:"Quechua"},{code:"ro",name:"Romanian"},{code:"ru",name:"Russian"},{code:"sm",name:"Samoan"},{code:"sa",name:"Sanskrit"},{code:"gd",name:"Scots Gaelic"},{code:"nso",name:"Sepedi"},{code:"sr",name:"Serbian"},{code:"st",name:"Sesotho"},{code:"sn",name:"Shona"},{code:"sd",name:"Sindhi"},{code:"si",name:"Sinhala"},{code:"sk",name:"Slovak"},{code:"sl",name:"Slovenian"},{code:"so",name:"Somali"},{code:"es",name:"Spanish"},{code:"su",name:"Sundanese"},{code:"sw",name:"Swahili"},{code:"sv",name:"Swedish"},{code:"tg",name:"Tajik"},{code:"ta",name:"Tamil"},{code:"te",name:"Telugu"},{code:"th",name:"Thai"},{code:"ti",name:"Tigrinya"},{code:"ts",name:"Tsonga"},{code:"tr",name:"Turkish"},{code:"tk",name:"Turkmen"},{code:"ak",name:"Twi"},{code:"uk",name:"Ukrainian"},{code:"ur",name:"Urdu"},{code:"ug",name:"Uyghur"},{code:"uz",name:"Uzbek"},{code:"vi",name:"Vietnamese"},{code:"cy",name:"Welsh"},{code:"xh",name:"Xhosa"},{code:"yi",name:"Yiddish"},{code:"yo",name:"Yoruba"},{code:"zu",name:"Zulu"},{code:"ab",name:"Abkhaz"},{code:"ace",name:"Acehnese"},{code:"ach",name:"Acholi"},{code:"alz",name:"Alur"},{code:"av",name:"Avar"},{code:"awa",name:"Awadhi"},{code:"ban",name:"Balinese"},{code:"bal",name:"Baluchi"},{code:"bci",name:"Baoule"},{code:"ba",name:"Bashkir"},{code:"btx",name:"Batak Karo"},{code:"bts",name:"Batak Simalungun"},{code:"bbc",name:"Batak Toba"},{code:"bem",name:"Bemba"},{code:"bew",name:"Betawi"},{code:"bik",name:"Bikol"},{code:"bua",name:"Buryat"},{code:"yue",name:"Cantonese"},{code:"ch",name:"Chamorro"},{code:"ce",name:"Chechen"},{code:"chk",name:"Chuukese"},{code:"cv",name:"Chuvash"},{code:"crh",name:"Crimean Tatar"},{code:"din",name:"Dinka"},{code:"dov",name:"Dombe"},{code:"dyu",name:"Dyula"},{code:"dz",name:"Dzongkha"},{code:"fj",name:"Fijian"},{code:"fon",name:"Fon"},{code:"fur",name:"Friulian"},{code:"gaa",name:"Ga"},{code:"hil",name:"Hiligaynon"},{code:"hrx",name:"Hunsrik"},{code:"iba",name:"Iban"},{code:"jam",name:"Jamaican Patois"},{code:"kac",name:"Jingpo"},{code:"kea",name:"Kabuverdianu"},{code:"kl",name:"Kalaallisut"},{code:"cgg",name:"Kiga"},{code:"ktu",name:"Kituba"},{code:"trp",name:"Kokborok"},{code:"kv",name:"Komi"},{code:"lij",name:"Ligurian"},{code:"li",name:"Limburgish"},{code:"lmo",name:"Lombard"},{code:"lua",name:"Tshiluba"},{code:"mak",name:"Makassar"},{code:"mad",name:"Madurese"},{code:"mhr",name:"Meadow Mari"},{code:"mh",name:"Marshallese"},{code:"mfe",name:"Mauritian Creole"},{code:"min",name:"Minang"},{code:"mos",name:"Mossi"},{code:"nr",name:"Ndebele South"},{code:"nd",name:"Ndebele North"},{code:"nqo",name:"NKo"},{code:"nus",name:"Nuer"},{code:"oc",name:"Occitan"},{code:"os",name:"Ossetian"},{code:"pag",name:"Pangasinan"},{code:"pap",name:"Papiamento"},{code:"prs",name:"Dari"},{code:"rn",name:"Rundi"},{code:"sg",name:"Sango"},{code:"sat",name:"Santali"},{code:"crs",name:"Seychellois Creole"},{code:"shn",name:"Shan"},{code:"scn",name:"Sicilian"},{code:"szl",name:"Silesian"},{code:"srn",name:"Sranan Tongo"},{code:"ss",name:"Swati"},{code:"ty",name:"Tahitian"},{code:"tmh",name:"Tamasheq"},{code:"tzm",name:"Tamazight"},{code:"tt",name:"Tatar"},{code:"tet",name:"Tetum"},{code:"tpi",name:"Tok Pisin"},{code:"tn",name:"Tswana"},{code:"tum",name:"Tumbuka"},{code:"tyv",name:"Tuvin"},{code:"udm",name:"Udmurt"},{code:"ve",name:"Venda"},{code:"vep",name:"Veps"},{code:"wo",name:"Wolof"},{code:"sah",name:"Yakut"},{code:"yua",name:"Yucatec Maya"},{code:"zap",name:"Zapotec"}];
const BAD_FIX = { "Client en Compte":"Compte", "Compte du client":"Compte" };
const FORCE_FIX = { "QR Code": { "th":"คิวอาร์โค้ด", "zh":"二维码", "fr":"Code QR", "es":"Código QR", "de":"QR-Code" } };
let transCache = {};
async function googleTranslate(text, from, to){ if(!text) return text; if(from===to && from!=="auto") return text; try{ const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`; const r=await fetch(url); const j=await r.json(); let out=""; j[0].forEach(x=>{ if(x[0]) out+=x[0]; }); return out||text; }catch{ return text; } }
function getNodes(root){ const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{ const p=n.parentElement; if(!p) return NodeFilter.FILTER_REJECT; if(["SCRIPT","STYLE"].includes(p.tagName)) return NodeFilter.FILTER_REJECT; if(p.closest("#langList")) return NodeFilter.FILTER_REJECT; return n.nodeValue.trim().length>1?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT; }}); const a=[];let x;while(x=w.nextNode())a.push(x);return a; }
async function translateApp(lang){ if(!lang||lang==="en")return; const nodes=getNodes(document.body); const need=new Map(); nodes.forEach(tn=>{ const p=tn.parentElement; if(!p.dataset.o) p.dataset.o=tn.nodeValue; const orig=p.dataset.o; const key=lang+"::"+orig.trim(); if(transCache[key]){ let t=transCache[key]; if(BAD_FIX[t])t=BAD_FIX[t]; tn.nodeValue=t; } else{ if(!need.has(orig))need.set(orig,[]); need.get(orig).push(tn); } }); $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.closest("#chatInputBar")) return; if(!el.dataset.oPh) el.dataset.oPh=el.placeholder; const orig=el.dataset.oPh; const key=lang+"::"+orig.trim(); if(transCache[key]) el.placeholder=transCache[key]; else if(orig.trim()){ if(!need.has(orig))need.set(orig,[]); } }); if(need.size){ for(const o of [...need.keys()]){ let q=o.trim(); if(q==="QR Code" && FORCE_FIX["QR Code"][lang]){ const t=FORCE_FIX["QR Code"][lang]; transCache[lang+"::"+o.trim()]=t; transCache[lang+"::"+o]=t; (need.get(o)||[]).forEach(n=>{ if(n.nodeType===3) n.nodeValue=t; }); $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.dataset.oPh===o) el.placeholder=t; }); continue; } let isAtUser=q.toLowerCase()==="@username"; if(isAtUser) q="username"; let t=await googleTranslate(q,"en",lang); if(isAtUser) t="@"+t; if(BAD_FIX[t])t=BAD_FIX[t]; transCache[lang+"::"+o.trim()]=t; transCache[lang+"::"+o]=t; (need.get(o)||[]).forEach(n=>{ if(n.nodeType===3) n.nodeValue=t; }); $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.dataset.oPh===o) el.placeholder=t; }); } localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache)); } }
async function setPresenceText(el, enText){
  if(!el) return;
  el.textContent = enText;
  const lang = localStorage.getItem("ddchat_lang") || "en";
  if(lang==="en") return;
  const key = lang+"::"+enText.trim();
  try{ 
  const t = await googleTranslate(enText,"en",lang); 
  el.textContent = t; 
}catch{}
const savedLang = localStorage.getItem("ddchat_lang"); if(savedLang && savedLang!=="en") setTimeout(()=>translateApp(savedLang), 600);
new MutationObserver(()=>{ const l=localStorage.getItem("ddchat_lang"); if(l&&l!=="en") translateApp(l); }).observe(document.body,{childList:true,subtree:true});
function renderLanguages(filter=""){ const ul = $("#langList"); ul.innerHTML = ""; LANGUAGES.filter(l => l.name.toLowerCase().includes(filter.toLowerCase())).forEach(l => { const li = document.createElement("li"); li.textContent = l.name; if (l.code === selectedLang) li.classList.add("selected"); li.onclick = () => { selectedLang = l.code; $$("#langList li").forEach(x=>x.classList.remove("selected")); li.classList.add("selected"); }; ul.appendChild(li); }); }
renderLanguages(); $("#langSearch").oninput = (e) => renderLanguages(e.target.value);
$("#langContinue").onclick = () => { localStorage.setItem("ddchat_lang", selectedLang); translateApp(selectedLang); showScreen("auth-screen"); };
$("#switchAuth").onclick = (e) => { e.preventDefault(); isSignup = !isSignup; $("#authTitle").textContent = isSignup ? "Sign Up" : "Log In"; $("#authBtn").textContent = isSignup ? "Create Account" : "Log In"; $("#switchText").textContent = isSignup ? "Already have an account?" : "New here?"; $("#switchAuth").textContent = isSignup ? "Log In" : "Sign Up"; $("#authName").style.display = isSignup ? "block" : "none"; $("#authUsername").style.display = isSignup ? "block" : "none"; $("#forgotLink").style.display = isSignup ? "none" : "block"; };

// === NEW AUTH - SUPABASE ===
$("#authBtn").onclick = async () => { 
  const email = $("#authEmail").value.trim(); const pass = $("#authPassword").value; 
  if (!email || !pass) return alert("Enter email and password"); 
  try { 
    if (isSignup) { 
      const name = $("#authName").value.trim(); const username = $("#authUsername").value.trim().toLowerCase(); 
      if (!name || !username) return alert("Name & username required"); 
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
      if(error) throw error;
      const uid = data.user.id;
      const ddId = Math.floor(10000000 + Math.random()*90000000).toString(); 
      await supabase.from("users").insert({ id: uid, uid: uid, name, username, email, lang: selectedLang, about: "Hey there! I'm using DDchat.", avatar: name[0].toUpperCase(), photo_url:"", dd_id: ddId, phone:"", is_online:false, last_seen: new Date().toISOString(), current_chat_with:null }); 
    } else { 
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if(error) throw error;
    } 
  } catch (err) { alert(err.message); } 
};
$("#forgotLink").onclick = (e)=>{ e.preventDefault(); showModal("Reset","Contact support: flatking43@gmail.com"); };

function startPresence(){
  if(!currentUser) return;
  const goOnline = ()=> supabase.from("users").update({ is_online:true, last_seen: new Date().toISOString(), current_chat_with: currentChatWith || null }).eq("id", currentUser.id).then(()=>{});
  const goOffline = ()=> supabase.from("users").update({ is_online:false, last_seen: new Date().toISOString(), current_chat_with:null }).eq("id", currentUser.id).then(()=>{});
  goOnline();
  if(heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(goOnline, 10000);
  window.addEventListener('beforeunload', goOffline);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) goOffline(); else goOnline(); });
  // === PUSH - ADDED (DOES NOT TOUCH YOUR CODE) ===
  setupPush();
}

// === PUSH - NEW FUNCTION (ADDED AT BOTTOM OF startPresence) ===
async function setupPush(){
  try{
    if(Notification.permission === "denied") return;
    if(Notification.permission !== "granted"){
      const perm = await Notification.requestPermission();
      if(perm !== "granted") return;
    }
    const messaging = await getMessagingInstance();
    if(!messaging) return;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if(token){
      console.log("Push token saved");
      await supabase.from("users").update({ fcm_token: token }).eq("id", currentUser.id);
      onMessage(messaging, (payload)=>{
        console.log("Push in foreground:", payload);
        if(document.hidden && Notification.permission === "granted"){
          new Notification(payload.notification?.title || "DDchat", { body: payload.notification?.body || "New message", icon: './icon-192.png.png' });
        }
      });
    }
  }catch(e){ console.log("Push setup error:", e); }
}

function listenToOtherPresence(otherUid){
  if(presenceChannel) supabase.removeChannel(presenceChannel);
  presenceChannel = supabase.channel('presence-'+otherUid)
    .on('postgres_changes', { event:'*', schema:'public', table:'users', filter:`id=eq.${otherUid}` }, payload=>{
      const u = payload.new;
      if(!u) return;
      userCache[otherUid] = {...userCache[otherUid], ...u, photoURL: u.photo_url, avatar: u.avatar, name: u.name, about: u.about, isOnline: u.is_online, lastSeen: u.last_seen ? { toDate:()=>new Date(u.last_seen) } : null, currentChatWith: u.current_chat_with };
      const lastSeenEl = $("#chatLastSeen");
      const dot = $("#chatAvatarStatus");
      const aboutEl = $("#chatAboutStatus");
      if(!lastSeenEl || !dot) return;
      const isAppOnline = u.is_online === true;
      const isInsideMyChat = u.current_chat_with === currentUser.id;
      dot.style.display="block";
      if(aboutEl && u.about){ aboutEl.textContent = u.about; }
      if(isInsideMyChat && isAppOnline){
        setPresenceText(lastSeenEl, "Online");
        dot.className = "online";
        markMyMessagesAsRead();
      } else if(isAppOnline){
        setPresenceText(lastSeenEl, "Online");
        dot.className = "online";
      } else {
        const last = u.last_seen ? new Date(u.last_seen) : new Date();
        const timeStr = last.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
        setPresenceText(lastSeenEl, `last seen today at ${timeStr}`);
        dot.className = "offline";
      }
    }).subscribe();
}

async function markMyMessagesAsRead(){
  if(!currentChatId) return;
  try{
    const { data } = await supabase.from("messages").select("id").eq("chat_id", currentChatId).eq("from_id", currentUser.id).neq("status","read");
    if(data){ for(const m of data){ await supabase.from("messages").update({ status:"read", read:true }).eq("id", m.id); } }
  }catch{}
}

// === NEW AUTH LISTENER - SUPABASE ===
supabase.auth.onAuthStateChange(async (event, session) => {
  authChecked = true;
  const user = session?.user || null;
  if (user) { 
    currentUser = { uid: user.id, id: user.id, email: user.email }; 
    const { data: d } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (d) { 
      userCache[user.id] = d;
      let myLang = d.lang || localStorage.getItem("ddchat_lang") || "en";
      selectedLang = myLang;
      localStorage.setItem("ddchat_lang", myLang);
      if(myLang!=="en") setTimeout(()=>translateApp(myLang),400);
      if(!d.lang){ try{ await supabase.from("users").update({ lang:myLang }).eq("id", user.id); }catch{} }
      $("#profileName").textContent = d.name; $("#profileUsername").textContent = "@"+d.username; 
      const av = $("#profileAvatar"); 
      if(d.photo_url){ av.innerHTML = `<img src="${d.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; av.dataset.full = d.photo_url; } 
      else { av.textContent = d.avatar || d.name[0].toUpperCase(); av.dataset.full = ""; } 
      const sticky = document.getElementById("profileStickyName"); if(sticky) sticky.textContent = d.name; 
      if(!d.dd_id){ const ddId = Math.floor(10000000 + Math.random()*90000000).toString(); await supabase.from("users").update({ dd_id: ddId }).eq("id", user.id); } 
    } 
    showScreen("app"); startPresence(); loadChats(); loadGroups(); loadStatus(); loadCalls(); 
  } else { 
    currentUser=null; if(heartbeatInterval) clearInterval(heartbeatInterval); 
    if(presenceChannel) supabase.removeChannel(presenceChannel);
    if(chatChannel) supabase.removeChannel(chatChannel);
    if(chatsChannel) supabase.removeChannel(chatsChannel);
    if(localStorage.getItem("ddchat_lang")) showScreen("auth-screen"); else showScreen("language-screen"); 
  }
});

$$("#bottomnav button").forEach(btn => { btn.onclick = () => { $$("#bottomnav button").forEach(b => b.classList.remove("active")); btn.classList.add("active"); $$(".page").forEach(p => p.classList.remove("active")); $("#page-" + btn.dataset.page).classList.add("active"); $("#topTitle").textContent = btn.dataset.page === "chats" ? "DDchat" : btn.dataset.page.charAt(0).toUpperCase()+btn.dataset.page.slice(1); if(btn.dataset.page !== "profile"){ const sticky = document.getElementById("profileStickyName"); if(sticky) sticky.style.opacity = "0"; } const l=localStorage.getItem("ddchat_lang"); if(l&&l!=="en") setTimeout(()=>translateApp(l),200); }; });
function openFullPhoto(url){ if(!url) return; showModal("Photo",`<div style="position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column"><div style="padding:15px;display:flex;align-items:center;background:#111"><button id="photoBackBtn" style="background:#333;border:none;width:42px;height:42px;border-radius:50%;color:white;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer">←</button><span style="color:white;margin-left:15px;font-weight:bold">Profile Photo</span></div><div style="flex:1;display:flex;align-items:center;justify-content:center;background:black;padding:10px"><img src="${url}" style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:8px"/></div></div>`); setTimeout(()=>{ const btn=document.getElementById("photoBackBtn"); if(btn) btn.onclick=()=>$("#modal").classList.add("hidden"); },50); }

async function loadChats(){ 
  if(!currentUser) return; 
  const { data: chats, error } = await supabase.from("chats").select("*").contains("members", [currentUser.id]).order("updated_at", { ascending:false });
  const list=$("#chatList");
  if(error || !chats || chats.length===0){ list.innerHTML="<li style='padding:15px;color:#8696a0'>No chats yet. Search username or DD ID above to start.</li>"; return; }
  const chatMap = new Map();
  chats.forEach(c=>{
    const otherUid=c.members.find(m=>m!==currentUser.id);
    if(!otherUid) return;
    const exist = chatMap.get(otherUid);
    if(!exist) chatMap.set(otherUid, c);
    else { if(new Date(c.updated_at) > new Date(exist.updated_at)) chatMap.set(otherUid, c); }
  });
  list.innerHTML="";
  for(const [otherUid, data] of chatMap){
    const unread = data.unread_count?.[currentUser.id] || 0;
    let cached = userCache[otherUid];
    if(!cached){
      const { data: u } = await supabase.from("users").select("*").eq("id", otherUid).single();
      if(u){ userCache[otherUid]=u; cached=u; }
    }
    const name = cached?.name || "DD User";
    const letter = cached?.avatar || name[0] || "U";
    const photo = cached?.photo_url || cached?.photoURL || "";
    const avatarHtml = photo ? `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${photo}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>` : `<div class="avatar" style="width:48px;height:48px;flex-shrink:0">${letter}</div>`;
    const li=document.createElement("li"); li.id = "chat_"+otherUid; li.style.display="flex"; li.style.alignItems="center"; li.style.gap="12px"; li.style.padding="12px"; li.style.borderBottom="1px solid rgba(255,255,255,0.06)"; li.style.cursor="pointer";
    li.innerHTML=`${avatarHtml}<div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(name)}</b><small style="color:#8696a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${escapeHtml(data.last_msg||"Start chatting")}</small></div>${unread>0?`<span class="unread-badge">${unread}</span>`:''}`;
    li.onclick=()=>openChat(data.id,otherUid, cached?.name||"");
    list.appendChild(li);
  }
  if(chatsChannel) supabase.removeChannel(chatsChannel);
  chatsChannel = supabase.channel('chats-list').on('postgres_changes', { event:'*', schema:'public', table:'chats' }, ()=> loadChats()).subscribe();
}

$("#chatSearch").oninput = async (e)=>{ 
  const raw = e.target.value.trim(); if(raw.length<1){ loadChats(); return; } 
  const list=$("#chatList"); list.innerHTML="<li style='padding:15px'>Searching...</li>"; 
  let found = []; const low = raw.toLowerCase(); 
  try{ const { data } = await supabase.from("users").select("*").eq("username", low); if(data) data.forEach(u=>{ if(u.id!==currentUser.id) found.push(u); }); }catch{}
  try{ const { data } = await supabase.from("users").select("*").eq("dd_id", raw); if(data) data.forEach(u=>{ if(u.id!==currentUser.id && !found.find(f=>f.id===u.id)) found.push(u); }); }catch{}
  const clean = raw.replace("DD-","").replace("DD","").trim(); 
  if(clean!==raw){ try{ const { data } = await supabase.from("users").select("*").eq("dd_id", clean); if(data) data.forEach(u=>{ if(u.id!==currentUser.id && !found.find(f=>f.id===u.id)) found.push(u); }); }catch{} } 
  list.innerHTML=""; if(found.length===0){ list.innerHTML=`<li style='padding:15px'>No user found for "${escapeHtml(raw)}"</li>`; return; } 
  found.forEach(u=>{ userCache[u.id]=u; const li=document.createElement("li"); li.innerHTML=`<div class="avatar">${u.avatar||u.name[0]}</div><div><b>${escapeHtml(u.name)}</b><br><small>@${escapeHtml(u.username)} - DD ID: ${u.dd_id}</small></div>`; li.onclick=()=>startChat(u.id); list.appendChild(li); }); 
};

async function startChat(otherUid){ 
  const members=[currentUser.id,otherUid].sort(); const chatId=members.join("_"); 
  const { data } = await supabase.from("chats").select("id").eq("id", chatId).single();
  if(!data) await supabase.from("chats").insert({ id: chatId, members, last_msg:"", unread_count:{[currentUser.id]:0,[otherUid]:0}, updated_at: new Date().toISOString() });
  openChat(chatId,otherUid); 
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","&quot;":"&#39;"}[c])); }
function formatTimeWithAMPM(date){ if(!date) return ""; return date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true}); }
let currentViewerFile = { url:"", name:"", type:"" };
let currentOcrText = "";
function saveFileGlobal(url, name){
  if(url.startsWith("data:")){
    const a=document.createElement("a"); a.href=url; a.download=name||"file"; document.body.appendChild(a); a.click(); a.remove(); return;
  }
  fetch(url).then(r=>r.blob()).then(b=>{
    const u=URL.createObjectURL(b);
    const a=document.createElement("a"); a.href=u; a.download=name||"file"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1500);
  }).catch(()=>{ window.open(url,"_blank"); });
}
window.saveFileGlobal = saveFileGlobal;
function openFileViewer(url, fileName, type){
  currentViewerFile = { url, name: fileName, type };
  let modal = document.getElementById("fileViewerModal");
  if(!modal){ createFileViewerModal(); modal=document.getElementById("fileViewerModal"); }
  $("#viewerFileName").textContent=fileName;
  const content = $("#viewerContent");
  if(type==="image"){
    content.innerHTML=`<img src="${url}" style="max-width:100%;max-height:65vh;border-radius:12px;display:block;margin:auto">`;
  } else if(type==="video"){
    content.innerHTML=`<video src="${url}" controls autoplay style="width:100%;max-height:65vh;border-radius:12px"></video>`;
  } else if(type==="audio" || type==="voice"){
    content.innerHTML=`<audio controls autoplay src="${url}" style="width:100%"></audio>`;
  } else {
    content.innerHTML=`<div style="text-align:center;padding:20px">📄 ${escapeHtml(fileName)}</div>`;
  }
  $("#viewerTranslation").innerHTML="";
  modal.style.display="flex";
}
window.openFileViewer=openFileViewer;
function closeFileViewer(){ const m=document.getElementById("fileViewerModal"); if(m) m.style.display="none"; }
window.closeFileViewer=closeFileViewer;
function createFileViewerModal(){
  const div=document.createElement("div");
  div.id="fileViewerModal";
  div.style.cssText="position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;";
  div.innerHTML=`<div onclick="closeFileViewer()" style="position:absolute;inset:0;background:rgba(0,0,0,0.85)"></div>
  <div style="position:relative;background:#121212;width:95%;max-width:600px;max-height:90vh;overflow-y:auto;border-radius:16px;z-index:2;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #222"><span id="viewerFileName" style="font-weight:bold;color:white">File</span><button onclick="closeFileViewer()" style="background:#222;border:none;color:white;width:36px;height:36px;border-radius:50%">✕</button></div>
    <div id="viewerContent" style="padding:12px"></div>
    <div style="display:flex;gap:10px;padding:12px"><button onclick="saveFileGlobal(currentViewerFile.url, currentViewerFile.name)" style="flex:1;padding:12px;border-radius:10px;border:none;background:#5E35B1;color:white;font-weight:bold">💾 Save to Phone</button><button onclick="translateFileText()" style="flex:1;padding:12px;border-radius:10px;border:none;background:#1e88e5;color:white;font-weight:bold">🌐 Translate</button></div>
    <div id="viewerTranslation" style="padding:12px"></div>
  </div>`;
  document.body.appendChild(div);
}
window.translateFileText = async function(){
  const resEl=document.getElementById("viewerTranslation");
  resEl.innerHTML="🔍 Reading...";
  try{
    if(currentViewerFile.type==="image"){
      if(!window.Tesseract){
        await new Promise((r,j)=>{ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"; s.onload=r; s.onerror=j; document.head.appendChild(s); });
      }
      const { data:{text} } = await Tesseract.recognize(currentViewerFile.url, "eng");
      currentOcrText=text.trim();
    } else { currentOcrText=currentViewerFile.name; }
    if(!currentOcrText){ resEl.innerHTML="No text"; return; }
    const toLang=localStorage.getItem("ddchat_lang")||"en";
    const translated=await googleTranslate(currentOcrText,"auto",toLang);
    resEl.innerHTML=`<div style="background:#1e1e1e;padding:12px;border-radius:10px;color:white;white-space:pre-wrap">${escapeHtml(translated)}</div>`;
  }catch(e){ resEl.innerHTML="Error: "+e.message; }
};
function getFileBubbleHtml(d){
  const fileName = d.file_name || d.fileName || d.text?.replace("📎 ","") || "file";
  let fileUrl = d.file_url || d.fileUrl || d.audio_url || d.audioUrl || "";
  if(!fileUrl) return null;
  if(fileUrl.startsWith("blob:")) return `<div style="padding:8px;background:#3a1a1a;border-radius:8px;color:#ff8a8a;font-size:12px">⚠️ Voice expired - resend please</div>`;
  const safeName = escapeHtml(fileName);
  const isImage = d.file_type?.startsWith("image/") || d.msg_type==="image" || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = d.file_type?.startsWith("video/") || d.msg_type==="video";
  const isVoice = d.file_type?.startsWith("audio/") || d.msg_type==="voice";
  if(isImage){
    return `<div><img src="${fileUrl}" loading="lazy" onclick="openFileViewer(this.src,'${safeName}','image')" style="max-width:220px;max-height:220px;border-radius:12px;display:block;object-fit:cover;cursor:pointer"></div>`;
  } else if(isVideo){
    return `<div><video src="${fileUrl}" controls preload="metadata" style="max-width:220px;border-radius:12px;display:block"></video><button onclick="openFileViewer('${fileUrl}','${safeName}','video')" style="font-size:12px;margin-top:6px;width:100%;background:#5E35B1;border:none;color:white;padding:10px;border-radius:8px;font-weight:bold">📺 View + Save</button></div>`;
  } else if(isVoice){
    return `<div style="min-width:200px;background:#2a1a6a;padding:8px;border-radius:12px"><audio controls preload="metadata" src="${fileUrl}" style="width:100%"></audio></div>`;
  } else {
    return `<div onclick="openFileViewer('${fileUrl}','${safeName}','doc')" style="display:flex;align-items:center;gap:10px;background:#2a1a6a;padding:12px;border-radius:12px;cursor:pointer;min-width:180px"><div style="font-size:28px">📄</div><div><div style="font-weight:bold;color:white;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${safeName}</div><div style="font-size:11px;color:#aaa">Tap to open</div></div></div>`;
  }
}
function openChat(chatId,otherUid,passedName=""){ 
  if(chatChannel) supabase.removeChannel(chatChannel);
  currentChatId=chatId; currentChatWith=otherUid; 
  showScreen("chat-view"); 
  const cached = userCache[otherUid];
  $("#chatTitle").textContent=passedName||cached?.name||"Chat";
  const chatAvatarImg = $("#chatAvatarImg");
  if(chatAvatarImg){
    if(cached?.photo_url || cached?.photoURL){ chatAvatarImg.innerHTML=`<img src="${cached.photo_url||cached.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
    else { chatAvatarImg.textContent = (cached?.avatar||cached?.name?.[0]||"?").toUpperCase(); }
  }
  if(currentUser){
    supabase.from("users").update({ current_chat_with: otherUid, is_online:true, last_seen: new Date().toISOString() }).eq("id", currentUser.id).then(()=>{});
  }
  listenToOtherPresence(otherUid);
  supabase.from("chats").update({ unread_count: { ...((cached||{}).unread_count||{}), [currentUser.id]:0 } }).eq("id", chatId).then(()=>{});
  
  const loadMessages = async ()=>{
    const { data: allMsgs } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending:true }).limit(100);
    const box=$("#chatMessages"); box.innerHTML=""; 
    if(!allMsgs) return;
    allMsgs.forEach(d=>{
      const row=document.createElement("div"); row.className="msg-row "+(d.from_id===currentUser.id?"out":"in");
      const bubble=document.createElement("div"); bubble.className="bubble "+(d.from_id===currentUser.id?"out":"in");
      const dateObj = d.created_at ? new Date(d.created_at) : new Date();
      const timeStr = dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
      let tickClass="sent"; let tickIcon=`<i class="fas fa-check"></i>`;
      if(d.from_id===currentUser.id){
        if(d.status==="read" || d.read){ tickClass="read"; tickIcon=`<i class="fas fa-check-double"></i>`; }
        else if(d.status==="delivered"){ tickClass="delivered"; tickIcon=`<i class="fas fa-check-double"></i>`; }
      }
      const ticks = d.from_id===currentUser.id ? `<span class="ticks ${tickClass}">${tickIcon}</span>` : "";
      const fileHtml = getFileBubbleHtml(d);
      const msgId = "msg_"+d.id;
      bubble.innerHTML = fileHtml ? `${fileHtml}<span class="msg-time">${timeStr} ${ticks}</span>` : `<span id="${msgId}" class="msg-text">${escapeHtml(d.text)}</span><span class="msg-time">${timeStr} ${ticks}</span>`;
      row.appendChild(bubble);
      box.appendChild(row);
      if(!fileHtml && d.from_id!==currentUser.id && d.text && !d.text.startsWith("🎤")){
        const myLang = localStorage.getItem("ddchat_lang")||"en";
        const orig = d.original_lang||"auto";
        if(myLang!==orig){
          const key = myLang+"::"+d.text.trim();
          const el = document.getElementById(msgId);
          if(transCache[key]){ if(el) el.textContent=transCache[key]; }
          else { googleTranslate(d.text, orig, myLang).then(tr=>{ transCache[key]=tr; localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache)); if(el) el.textContent=tr; }); }
        }
      }
      if(d.from_id!==currentUser.id && currentChatWith===d.from_id && d.status!=="read"){
        supabase.from("messages").update({ status:"read" }).eq("id", d.id).then(()=>{});
      }
    }); 
    renderPendingLocal();
    requestAnimationFrame(()=>{ box.scrollTop=box.scrollHeight; });
  };
  loadMessages();
  chatChannel = supabase.channel('chat-'+chatId).on('postgres_changes', { event:'*', schema:'public', table:'messages', filter:`chat_id=eq.${chatId}` }, ()=> loadMessages()).subscribe();
}
$("#sendBtn").onclick=sendMessage; $("#messageInput").addEventListener("keypress",(e)=>{ if(e.key==="Enter") sendMessage(); });
async function sendMessage(){
  const text=$("#messageInput").value.trim(); if(!text||!currentChatId) return;
  const box=$("#chatMessages");
  const tempId="txt_"+Date.now();
  const timeStr=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
  box.insertAdjacentHTML("beforeend", `<div id="${tempId}" class="msg-row out"><div class="bubble out"><span class="msg-text">${escapeHtml(text)}</span><span class="msg-time">${timeStr} <span class="ticks sent"><i class="fas fa-check"></i></span></span></div></div>`);
  box.scrollTop=box.scrollHeight;
  $("#messageInput").value="";
  const myLang = localStorage.getItem("ddchat_lang")||"en";
  const otherOnline = userCache[currentChatWith]?.is_online;
  const initialStatus = otherOnline ? "delivered" : "sent";
  try{
    await supabase.from("messages").insert({ chat_id: currentChatId, from_id: currentUser.id, text, original_lang: myLang, status: initialStatus, created_at: new Date().toISOString() });
    const { data: chatData } = await supabase.from("chats").select("unread_count").eq("id", currentChatId).single();
    const uc = chatData?.unread_count || {};
    uc[currentChatWith] = (uc[currentChatWith]||0)+1;
    await supabase.from("chats").update({ last_msg: text, updated_at: new Date().toISOString(), unread_count: uc }).eq("id", currentChatId);
    document.getElementById(tempId)?.remove();
  }catch(e){ document.getElementById(tempId)?.remove(); alert("Send failed, check network"); }
}
$("#chatBack").onclick=()=>{
  if(currentUser){
    supabase.from("users").update({ current_chat_with:null, last_seen: new Date().toISOString(), is_online:true }).eq("id", currentUser.id).then(()=>{});
  }
  currentChatWith=null;
  if(presenceChannel) supabase.removeChannel(presenceChannel);
  if(chatChannel) supabase.removeChannel(chatChannel);
  showScreen("app");
};
const plusChat = document.getElementById('plusChat');
const fileInput = document.getElementById('fileInput');
const micBtn = document.getElementById('micBtn');
const stickerBtn = document.getElementById('stickerBtn');
const chatVideoCall = document.getElementById('chatVideoCall');
const chatVoiceCall = document.getElementById('chatVoiceCall');
plusChat?.addEventListener('click', ()=> fileInput?.click());

async function compressImage(file) {
  return new Promise((resolve)=>{
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; };
    img.onload = ()=>{
      let w = img.width, h = img.height;
      const maxDim = 600;
      if(w > maxDim || h > maxDim){
        if(w > h){ h *= maxDim/w; w = maxDim; } 
        else { w *= maxDim/h; h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      canvas.toBlob(b=> resolve(b), "image/jpeg", 0.5);
    };
    img.onerror = ()=> resolve(file);
    reader.readAsDataURL(file);
  });
}

async function uploadFree(fileOrBlob, originalName){
  try{
    let fileToUpload = fileOrBlob;
    let name = originalName || fileOrBlob.name || "";
    if(!name || name==="blob" || name.includes("blob")){
      const ext = fileOrBlob.type?.includes("video") ? "mp4" : fileOrBlob.type?.includes("image") ? "jpg" : fileOrBlob.type?.includes("audio") ? "webm" : "file";
      name = `file-${Date.now()}.${ext}`;
    }
    if(fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)){
      fileToUpload = new File([fileOrBlob], name, { type: fileOrBlob.type || 'application/octet-stream' });
    }
    const res = await awStorage.createFile(CONFIG.BUCKET_ID, AppwriteID.unique(), fileToUpload);
    const fileUrl = `${CONFIG.ENDPOINT}/storage/buckets/${CONFIG.BUCKET_ID}/files/${res.$id}/view?project=${CONFIG.PROJECT_ID}`;
    return fileUrl;
  }catch(e){
    console.error("Appwrite upload failed", e);
    throw e;
  }
}

function getPendingKey(){ return `dd_pending_${currentUser?.id}_${currentChatId}`; }
function getAllPending(){
  try{ return JSON.parse(localStorage.getItem(getPendingKey())||"[]"); }catch{ return []; }
}
function savePending(arr){ localStorage.setItem(getPendingKey(), JSON.stringify(arr)); }
function addPendingLocal(item){
  const arr = getAllPending();
  arr.push(item);
  savePending(arr);
}
function updatePendingLocal(id, patch){
  const arr = getAllPending();
  const idx = arr.findIndex(x=>x.id===id);
  if(idx>=0){ arr[idx]={...arr[idx], ...patch}; savePending(arr); }
}
function removePendingLocal(id){
  let arr = getAllPending();
  arr = arr.filter(x=>x.id!==id);
  savePending(arr);
}
function renderPendingLocal(){
  const box=$("#chatMessages");
  if(!box || !currentChatId) return;
  const pendings = getAllPending().filter(p=>p.chatId===currentChatId);
  pendings.forEach(p=>{
    if(document.getElementById(p.id)) return;
    const timeStr = new Date(p.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
    let preview = "";
    if(p.fileType?.startsWith("image/") && p.localPreview){
      preview = `<img src="${p.localPreview}" style="max-width:220px;border-radius:12px;display:block;opacity:0.8">`;
    } else {
      preview = `<div style="background:#2a1a6a;padding:12px;border-radius:12px">📎 ${escapeHtml(p.fileName)}</div>`;
    }
    const statusHtml = p.status==="failed" ? `<span style="color:#ff5252">❌ Failed</span> <button onclick="retryPending('${p.id}')" style="background:#5E35B1;border:none;color:white;padding:4px 10px;border-radius:8px;margin-left:6px">↻ Resend</button>` : `<span>⏳ uploading...</span>`;
    box.insertAdjacentHTML("beforeend", `<div id="${p.id}" class="msg-row out"><div class="bubble out">${preview}<span class="msg-time">${timeStr} ${statusHtml}</span></div></div>`);
  });
}
window.retryPending = async (pid)=>{
  const arr = getAllPending();
  const item = arr.find(x=>x.id===pid);
  if(!item) return;
  if(item.blobBase64){
    try{
      updatePendingLocal(pid, {status:"uploading"});
      const el=document.getElementById(pid);
      if(el) el.querySelector(".msg-time").innerHTML=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true})+" ⏳ uploading...";
      const blob = await (await fetch(item.blobBase64)).blob();
      const url = await uploadFree(blob, item.fileName);
      await supabase.from("messages").insert({ chat_id: item.chatId, from_id: currentUser.id, text:`📎 ${item.fileName}`, file_url:url, file_name:item.fileName, file_type:item.fileType, msg_type:item.msgType, status:"sent", created_at: new Date().toISOString() });
      const { data: chatData } = await supabase.from("chats").select("unread_count").eq("id", item.chatId).single();
      const uc = chatData?.unread_count || {}; uc[item.chatWith]=(uc[item.chatWith]||0)+1;
      await supabase.from("chats").update({ last_msg:`📎 ${item.fileName}`, updated_at: new Date().toISOString(), unread_count: uc }).eq("id", item.chatId);
      removePendingLocal(pid);
      document.getElementById(pid)?.remove();
    }catch(e){
      updatePendingLocal(pid, {status:"failed"});
      const el=document.getElementById(pid);
      if(el) el.querySelector(".msg-time").innerHTML=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true})+` <span style="color:#ff5252">❌ Failed</span> <button onclick="retryPending('${pid}')" style="background:#5E35B1;border:none;color:white;padding:4px 10px;border-radius:8px;margin-left:6px">↻ Resend</button>`;
    }
  } else {
    alert("File expired from cache, please select file again");
    removePendingLocal(pid);
    document.getElementById(pid)?.remove();
  }
};
window.addEventListener('online', ()=>{
  const pendings = getAllPending().filter(p=>p.status==="failed");
  pendings.forEach(p=> retryPending(p.id));
});
fileInput?.addEventListener('change', async (e)=>{
  const f=e.target.files[0]; if(!f||!currentChatId) return;
  const box=$("#chatMessages");
  const tempId="up_"+Date.now();
  let localUrl=null;
  try{ localUrl=URL.createObjectURL(f); }catch{}
  const isImage=f.type.startsWith("image/");
  const preview = isImage && localUrl ? `<img src="${localUrl}" style="max-width:220px;border-radius:12px;display:block">` : `<div style="background:#2a1a6a;padding:12px;border-radius:12px">📎 ${escapeHtml(f.name)}</div>`;
  const timeStr=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
  box.insertAdjacentHTML("beforeend", `<div id="${tempId}" class="msg-row out"><div class="bubble out">${preview}<span class="msg-time">${timeStr} ⏳ uploading...</span></div></div>`);
  box.scrollTop=box.scrollHeight;
  let blobBase64 = null;
  try{
    if(f.size < 8*1024*1024){
      blobBase64 = await new Promise(res=>{
        const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>res(null); r.readAsDataURL(f);
      });
    }
  }catch{}
  addPendingLocal({id:tempId, chatId:currentChatId, chatWith:currentChatWith, fileName:f.name, fileType:f.type, msgType:f.type.startsWith("image/")?"image":f.type.startsWith("video/")?"video":f.type.startsWith("audio/")?"voice":"file", ts:Date.now(), status:"uploading", localPreview: isImage ? localUrl : null, blobBase64 });
  e.target.value="";
  let fileUrl=null;
  try{
    if(isImage){
      const compressedBlob = await compressImage(f);
      fileUrl = await uploadFree(compressedBlob, f.name);
    } else {
      fileUrl = await uploadFree(f, f.name);
    }
  }catch(err){
    updatePendingLocal(tempId, {status:"failed"});
    const el=document.getElementById(tempId);
    if(el) el.querySelector(".msg-time").innerHTML=timeStr+` <span style="color:#ff5252">❌ Failed</span> <button onclick="retryPending('${tempId}')" style="background:#5E35B1;border:none;color:white;padding:4px 10px;border-radius:8px;margin-left:6px">↻ Resend</button>`;
    if(localUrl) URL.revokeObjectURL(localUrl);
    return;
  }
  if(localUrl) URL.revokeObjectURL(localUrl);
  removePendingLocal(tempId);
  document.getElementById(tempId)?.remove();
  if(!fileUrl){ return; }
  const msgType=f.type.startsWith("image/")?"image":f.type.startsWith("video/")?"video":f.type.startsWith("audio/")?"voice":"file";
  try{
    await supabase.from("messages").insert({ chat_id: currentChatId, from_id: currentUser.id, text:`📎 ${f.name}`, file_url: fileUrl, file_name: f.name, file_type: f.type, msg_type: msgType, status:"sent", created_at: new Date().toISOString() });
    const { data: chatData } = await supabase.from("chats").select("unread_count").eq("id", currentChatId).single();
    const uc = chatData?.unread_count || {}; uc[currentChatWith]=(uc[currentChatWith]||0)+1;
    await supabase.from("chats").update({ last_msg:`📎 ${f.name}`, updated_at: new Date().toISOString(), unread_count: uc }).eq("id", currentChatId);
  }catch(err){
    addPendingLocal({id:tempId, chatId:currentChatId, chatWith:currentChatWith, fileName:f.name, fileType:f.type, msgType, ts:Date.now(), status:"failed", blobBase64 });
  }
});
let recState=null;
let mediaChunks=[];
micBtn?.addEventListener('click', async ()=>{
  if(recState?.state=="recording"){ recState.stop(); micBtn.innerHTML='<i class="fas fa-microphone"></i>'; return; }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const rec=new MediaRecorder(stream, {mimeType:'audio/webm'}); recState=rec;
    mediaChunks=[]; rec.ondataavailable=e=>{ if(e.data.size>0) mediaChunks.push(e.data); };
    rec.onstop=async()=>{
      if(!currentChatId || mediaChunks.length===0) return;
      const blob=new Blob(mediaChunks,{type:"audio/webm"});
      const box=$("#chatMessages");
      const tempId="upv_"+Date.now();
      const localAudioUrl=URL.createObjectURL(blob);
      const timeStr=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
      box.insertAdjacentHTML("beforeend", `<div id="${tempId}" class="msg-row out"><div class="bubble out"><audio controls src="${localAudioUrl}" style="width:200px"></audio><span class="msg-time">${timeStr} ⏳ uploading...</span></div></div>`);
      box.scrollTop=box.scrollHeight;
      let blobBase64 = null;
      try{ blobBase64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>res(null); r.readAsDataURL(blob); }); }catch{}
      addPendingLocal({id:tempId, chatId:currentChatId, chatWith:currentChatWith, fileName:"Voice.webm", fileType:"audio/webm", msgType:"voice", ts:Date.now(), status:"uploading", blobBase64 });
      let url=null;
      try{ url = await uploadFree(blob, "Voice.webm"); }catch{
        updatePendingLocal(tempId, {status:"failed"});
        const el=document.getElementById(tempId);
        if(el) el.querySelector(".msg-time").innerHTML=timeStr+` <span style="color:#ff5252">❌ Failed</span> <button onclick="retryPending('${tempId}')" style="background:#5E35B1;border:none;color:white;padding:4px 10px;border-radius:8px;margin-left:6px">↻ Resend</button>`;
        URL.revokeObjectURL(localAudioUrl);
        return;
      }
      URL.revokeObjectURL(localAudioUrl);
      removePendingLocal(tempId);
      document.getElementById(tempId)?.remove();
      if(!url){ return; }
      try{
        await supabase.from("messages").insert({ chat_id: currentChatId, from_id: currentUser.id, text:"🎤 Voice", file_url:url, audio_url:url, file_name:"Voice.webm", file_type:"audio/webm", msg_type:"voice", status:"sent", created_at: new Date().toISOString() });
        const { data: chatData } = await supabase.from("chats").select("unread_count").eq("id", currentChatId).single();
        const uc = chatData?.unread_count || {}; uc[currentChatWith]=(uc[currentChatWith]||0)+1;
        await supabase.from("chats").update({ last_msg:"🎤 Voice", updated_at: new Date().toISOString(), unread_count: uc }).eq("id", currentChatId);
      }catch{
        addPendingLocal({id:tempId, chatId:currentChatId, chatWith:currentChatWith, fileName:"Voice.webm", fileType:"audio/webm", msgType:"voice", ts:Date.now(), status:"failed", blobBase64 });
      }
      stream.getTracks().forEach(t=>t.stop()); mediaChunks=[];
    };
    rec.start(100); micBtn.innerHTML='<i class="fas fa-stop" style="color:#ff3b3b"></i>';
  }catch{ alert("Mic permission needed"); }
});
stickerBtn?.addEventListener('click', ()=>{ if(!currentChatId) return; document.getElementById('messageInput').value+=" 😊"; });
chatVideoCall?.addEventListener('click', ()=> showModal("Video Call","Video calling soon"));
chatVoiceCall?.addEventListener('click', ()=> showModal("Voice Call","Voice calling soon"));
$("#postStatusBtn").onclick=()=>{ showModal("Post Status",`<input id="statusText" placeholder="What's on your mind?" style="width:100%;padding:10px"/><button class="btn" id="saveStatus">Post</button>`); setTimeout(()=>{ $("#saveStatus").onclick= async ()=>{ const text=$("#statusText").value.trim(); if(!text) return; await supabase.from("status").insert({ uid: currentUser.id, text, created_at: new Date().toISOString() }); $("#modal").classList.add("hidden"); }; },100); };
async function loadStatus(){ 
  const { data } = await supabase.from("status").select("*").order("created_at", { ascending:false });
  const list=$("#statusList"); list.innerHTML=""; 
  if(data) data.forEach(s=>{ const li=document.createElement("li"); li.innerHTML=`<div class="avatar">${s.uid.slice(0,2)}</div><div><b>Status</b><br><small>${escapeHtml(s.text)}</small></div>`; list.appendChild(li); }); 
}
$("#createGroupBtn").onclick=()=>{ showModal("Create Group",`<input id="groupName" placeholder="Group name" style="width:100%;padding:10px"/><button class="btn" id="saveGroup">Create</button>`); setTimeout(()=>{ $("#saveGroup").onclick= async ()=>{ const name=$("#groupName").value.trim(); if(!name) return; await supabase.from("groups").insert({ name, members:[currentUser.id], created_by: currentUser.id, created_at: new Date().toISOString() }); $("#modal").classList.add("hidden"); }; },100); };
async function loadGroups(){ 
  const { data } = await supabase.from("groups").select("*").contains("members", [currentUser.id]);
  const list=$("#groupList"); list.innerHTML=""; 
  if(data) data.forEach(g=>{ const li=document.createElement("li"); li.innerHTML=`<div class="avatar">G</div><div><b>${g.name}</b><br><small>${g.members.length} members</small></div>`; list.appendChild(li); }); 
}
function loadCalls(){ $("#callList").innerHTML="<li style='padding:15px;color:#8696a0'>No calls yet.</li>"; }
document.addEventListener("DOMContentLoaded", ()=>{
  createFileViewerModal();
  const scrollArea = document.getElementById('profileScrollArea');
  const stickyName = document.getElementById('profileStickyName');
  if(scrollArea && stickyName){
    scrollArea.addEventListener('scroll', ()=>{
      if(scrollArea.scrollTop > 60){ stickyName.style.opacity = '1'; const nameEl = document.getElementById('profileName'); if(nameEl) stickyName.textContent = nameEl.textContent.replace('▼','').trim(); } else { stickyName.style.opacity = '0'; }
    });
  }
});
document.addEventListener("click", async (e)=>{
  if(e.target.closest("#profileAvatar")){ const av=$("#profileAvatar"); const url=av.dataset.full || av.querySelector("img")?.src || ""; if(url) openFullPhoto(url); }
  if(e.target.closest("#topSearchBtn")){
    showModal("Search Settings",`<input id="settingsSearchInput" placeholder="Search settings" style="width:100%;padding:12px;border-radius:10px;border:1px solid #444;background:#0f0a1e;color:white;margin-bottom:10px"/><ul id="searchSuggestionList" class="list" style="max-height:300px;overflow-y:auto;background:#1e1250;border-radius:8px"></ul>`);
    const all=[{name:"Account",key:"account"},{name:"Privacy",key:"privacy"},{name:"Chats",key:"chats"},{name:"Appearance",key:"appearance"},{name:"Notifications",key:"notifications"},{name:"Storage and Data",key:"storage"},{name:"Help & Feedback",key:"help"},{name:"Invite Contacts",key:"invite"}];
    const render=(term="")=>{ const list=document.getElementById("searchSuggestionList"); if(!list) return; const f=all.filter(s=>s.name.toLowerCase().includes(term.toLowerCase())); list.innerHTML=f.map(s=>`<li data-key="${s.key}" style="padding:12px;border-bottom:1px solid #2a1a6a;cursor:pointer;display:flex;justify-content:space-between"><span>${s.name}</span><i class="fas fa-chevron-right" style="opacity:0.3"></i></li>`).join('')||`<li style="padding:12px;opacity:0.5">No result</li>`; list.querySelectorAll("li").forEach(li=>{ li.onclick=()=>{ document.getElementById("modal").classList.add("hidden"); document.querySelector(`.settings-list li[data-setting="${li.dataset.key}"]`)?.click(); }; }); };
    setTimeout(()=>{ const inp=document.getElementById("settingsSearchInput"); if(inp){ inp.focus(); render(""); inp.oninput=(ev)=>render(ev.target.value); } },100);
  }
if(e.target.closest("#topQrBtn")){
  if(!currentUser) return alert("Login first");
  let { data: d } = await supabase.from("users").select("*").eq("id", currentUser.id).single();
  if(!d.dd_id){ const ddId=Math.floor(10000000+Math.random()*90000000).toString(); await supabase.from("users").update({ dd_id: ddId }).eq("id", currentUser.id); d.dd_id=ddId; }
  const qrData = `DDCHAT:${d.id}:${d.dd_id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
  showModal("QR Code",`
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <button class="btn" id="scanLeftBtn" style="padding:8px 12px">📷 Scan</button>
        <div style="display:flex;gap:6px"><button class="btn" id="shareQrTopRight" style="padding:8px 12px">Share</button><button class="btn" id="closeQrBtn" style="padding:8px 12px;background:#444">Close</button></div>
      </div>
      <div style="text-align:center">
        <img id="qrImg" src="${qrUrl}" style="width:220px;height:220px;border-radius:12px"/>
        <p style="margin:8px 0;font-weight:bold">${d.name}</p><small>DD ID: ${d.dd_id}</small>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <input type="file" id="qrUploadInput" accept="image/*" style="display:none"/>
        <button class="btn" id="uploadQrBtn" style="flex:1">Upload QR Image</button>
        <button class="btn" id="resetQrBtn" style="flex:1;background:#ff3b30;color:#fff">Reset Code</button>
      </div>
      <div id="qrResult" style="margin-top:10px;padding:10px;background:#1e1250;border-radius:8px">Ready...</div>
      <div id="qrCameraWrap" style="display:none;position:fixed;inset:0;background:#000;z-index:99999;flex-direction:column">
        <div style="padding:12px;display:flex;justify-content:space-between;background:#111">
          <button id="stopCameraBtn" style="background:#ff3b30;border:none;color:white;padding:10px 18px;border-radius:22px;font-weight:bold">✕ Leave Camera</button>
          <span style="color:white">Scanning...</span>
        </div>
        <video id="qrVideo" style="flex:1;width:100%;height:100%;object-fit:cover" autoplay playsinline muted></video>
      </div>
    </div>
  `);
  setTimeout(()=>{
    let streamRef=null, scanInt=null;
    const closeCam=()=>{ if(streamRef){streamRef.getTracks().forEach(t=>t.stop()); streamRef=null;} if(scanInt){clearInterval(scanInt); scanInt=null;} document.getElementById("qrCameraWrap").style.display="none"; };
    document.getElementById("closeQrBtn").onclick=()=>{ closeCam(); document.getElementById("modal").classList.add("hidden"); };
    document.getElementById("shareQrTopRight").onclick=async()=>{ if(navigator.share){try{await navigator.share({title:"My DDchat QR",text:`DD ID: ${d.dd_id}`});}catch{}} else{await navigator.clipboard.writeText(qrData); alert("Copied");} };
    async function openFromQr(text){
      if(!text) return;
      const el=document.getElementById("qrResult");
      if(!text.includes("DDCHAT:")){ el.textContent="Invalid QR - Use DDchat QR"; return; }
      const uid=text.split(":")[1]; const ddId=text.split(":")[2];
      if(uid===currentUser.id){ el.textContent="That's your own QR"; return; }
      el.textContent="Fetching account...";
      closeCam();
      try{
        let { data: usnap } = await supabase.from("users").select("*").eq("id", uid).single();
        if(!usnap && ddId){ const { data } = await supabase.from("users").select("*").eq("dd_id", ddId).single(); usnap=data; }
        if(usnap){
          userCache[usnap.id]=usnap;
          el.textContent="Found: "+usnap.name+" - Opening chat...";
          setTimeout(()=>{ document.getElementById("modal").classList.add("hidden"); startChat(usnap.id); },500);
        }else el.textContent="User not found";
      }catch(err){ el.textContent="Fetch failed: "+err.message; }
    }
    async function decodeLocal(file){
      document.getElementById("qrResult").textContent="Reading QR...";
      const bmp=await createImageBitmap(file);
      const cv=document.createElement("canvas"); cv.width=bmp.width; cv.height=bmp.height;
      const ctx=cv.getContext("2d"); ctx.drawImage(bmp,0,0);
      if("BarcodeDetector" in window){
        try{ const det=new BarcodeDetector({formats:["qr_code"]}); const codes=await det.detect(cv); if(codes.length) return openFromQr(codes[0].rawValue); }catch{}
      }
      if(!window.jsQR){
        await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
      }
      const data=ctx.getImageData(0,0,cv.width,cv.height);
      const code=window.jsQR(data.data,cv.width,cv.height);
      if(code && code.data) openFromQr(code.data);
      else document.getElementById("qrResult").textContent="Could not read QR - try clearer image";
    }
    document.getElementById("uploadQrBtn").onclick=()=>document.getElementById("qrUploadInput").click();
    document.getElementById("qrUploadInput").onchange=(ev)=>{ const f=ev.target.files[0]; if(f) decodeLocal(f); };
    document.getElementById("scanLeftBtn").onclick=async()=>{
      const wrap=document.getElementById("qrCameraWrap"), video=document.getElementById("qrVideo");
      wrap.style.display="flex"; document.getElementById("qrResult").textContent="Opening camera...";
      try{
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
        streamRef=stream; video.srcObject=stream; await video.play();
        document.getElementById("qrResult").textContent="Camera ON - point at QR";
        if("BarcodeDetector" in window){
          const det=new BarcodeDetector({formats:["qr_code"]});
          scanInt=setInterval(async()=>{ try{ const codes=await det.detect(video); if(codes.length){ clearInterval(scanInt); openFromQr(codes[0].rawValue);} }catch{} },400);
        }
      }catch(err){ document.getElementById("qrResult").textContent="Camera denied: "+err.message; wrap.style.display="none"; }
    };
    document.getElementById("stopCameraBtn").onclick=()=>{ closeCam(); document.getElementById("qrResult").textContent="Camera closed"; };
    document.getElementById("resetQrBtn").onclick=async()=>{
      const newDdId=Math.floor(10000000+Math.random()*90000000).toString();
      await supabase.from("users").update({ dd_id: newDdId }).eq("id", currentUser.id);
      const newData=`DDCHAT:${currentUser.id}:${newDdId}`; const newUrl=`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newData)}`;
      document.getElementById("qrImg").src=newUrl; document.getElementById("qrResult").textContent="New ID: "+newDdId+" - QR reset";
    };
  },100);
}
  if(e.target.closest("#topEditBtn")){
    if(!currentUser) return;
    let { data: d } = await supabase.from("users").select("*").eq("id", currentUser.id).single();
    if(!d.dd_id){ const ddId=Math.floor(10000000+Math.random()*90000000).toString(); await supabase.from("users").update({ dd_id: ddId }).eq("id", currentUser.id); d.dd_id=ddId; }
    showModal("Edit Profile",`<div style="display:flex;flex-direction:column;gap:10px"><div style="text-align:center"><div class="avatar" id="editAvatarPreview" style="width:70px;height:70px;font-size:30px;margin:auto;overflow:hidden;background:#5E35B1;color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer">${d.photo_url?`<img src="${d.photo_url}" style="width:100%;height:100%;object-fit:cover">`:(d.avatar||d.name[0])}</div><input type="file" id="photoInput" accept="image/*" style="margin-top:8px"/><br><small>Any size allowed - click photo to view big</small></div><label>Name</label><input id="editName" value="${escapeHtml(d.name)}" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd"/><label>About</label><textarea id="editAbout" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd">${escapeHtml(d.about||"")}</textarea><label>Phone</label><input id="editPhone" value="${escapeHtml(d.phone||"")}" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd"/><label>Email</label><input value="${escapeHtml(d.email||"")}" disabled style="width:100%;padding:10px;border-radius:8px;background:#f5f5f5"/><label>DD ID</label><input value="${d.dd_id}" disabled style="width:100%;padding:10px;border-radius:8px;background:#f5f5f5"/><button class="btn" id="saveProfileNew" style="margin-top:8px">Save Changes</button><div id="editStatus" style="text-align:center;margin-top:8px"></div></div>`);
    setTimeout(()=>{
      let finalPhoto = d.photo_url || "";
      document.getElementById("editAvatarPreview").onclick=()=>{ if(finalPhoto) openFullPhoto(finalPhoto); };
      document.getElementById("photoInput").onchange= async (ev)=>{ 
        const file=ev.target.files[0]; if(!file) return; 
        document.getElementById("editStatus").textContent="Uploading to Appwrite FRA...";
        try{
          const url = await uploadFree(file, file.name);
          finalPhoto=url;
          document.getElementById("editAvatarPreview").innerHTML=`<img src="${finalPhoto}" style="width:100%;height:100%;object-fit:cover">`;
          document.getElementById("editStatus").textContent=`Uploaded! ${(file.size/1024/1024).toFixed(2)}MB ✓`;
        }catch(e){ document.getElementById("editStatus").textContent="Upload failed: "+e.message; }
      };
      document.getElementById("saveProfileNew").onclick=async()=>{ const name=document.getElementById("editName").value.trim(); const about=document.getElementById("editAbout").value.trim(); const phone=document.getElementById("editPhone").value.trim(); if(!name) return alert("Name required"); document.getElementById("editStatus").textContent="Saving..."; try{ await supabase.from("users").update({ name, about, phone, avatar:name[0].toUpperCase(), photo_url:finalPhoto }).eq("id", currentUser.id); userCache[currentUser.id]={...userCache[currentUser.id], photo_url:finalPhoto, photoURL:finalPhoto, name}; document.getElementById("profileName").textContent=name; const av=document.getElementById("profileAvatar"); if(finalPhoto){ av.innerHTML=`<img src="${finalPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; av.dataset.full=finalPhoto; } const sticky=document.getElementById("profileStickyName"); if(sticky) sticky.textContent=name; document.getElementById("editStatus").textContent="Saved! ✓"; setTimeout(()=>document.getElementById("modal").classList.add("hidden"),800); }catch(err){ document.getElementById("editStatus").textContent="Save failed: "+err.message; } };
    },100);
  }
});
$$(".settings-list li").forEach(li=>{ li.onclick= async ()=>{ const s=li.dataset.setting; if(s==="logout"){ await supabase.auth.signOut(); return; } if(s==="account"){ document.getElementById("topEditBtn")?.click(); return; } showModal(li.textContent.trim(),"<p>"+s+" settings coming soon - built.</p>"); }; });