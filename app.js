import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, limit, doc, setDoc, getDoc, serverTimestamp, updateDoc, getDocs, increment, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// FAST LOAD FROM PHONE CACHE LIKE WHATSAPP
enableIndexedDbPersistence(db).catch(()=>{});

let currentUser = null; let currentChatId = null; let currentChatWith = null; let isSignup = true;
let selectedLang = localStorage.getItem("ddchat_lang") || "en";
const userCache = {};
let presenceUnsub = null;
let heartbeatInterval = null;
let chatUnsub = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function showScreen(id){ $$(".screen").forEach(s => s.classList.remove("active")); $("#" + id).classList.add("active"); const l=localStorage.getItem("ddchat_lang"); if(l && l!=="en") setTimeout(()=>translateApp(l),150); }
function showModal(title, bodyHtml){ $("#modalTitle").textContent = title; $("#modalBody").innerHTML = bodyHtml; $("#modal").classList.remove("hidden"); const l=localStorage.getItem("ddchat_lang"); if(l && l!=="en") setTimeout(()=>translateApp(l),100); }
$("#modalClose").onclick = () => $("#modal").classList.add("hidden");
let authChecked = false;
setTimeout(() => { if(!authChecked){ if(!localStorage.getItem("ddchat_lang")) showScreen("language-screen"); } }, 1800);

const LANGUAGES = [{ code:"en", name:"English" },{ code:"es", name:"Spanish" },{ code:"fr", name:"French" },{ code:"de", name:"German" },{ code:"pt", name:"Portuguese" },{ code:"zh", name:"Chinese" },{ code:"hi", name:"Hindi" },{ code:"ar", name:"Arabic" },{ code:"ru", name:"Russian" },{ code:"ja", name:"Japanese" },{ code:"ko", name:"Korean" },{ code:"it", name:"Italian" },{ code:"nl", name:"Dutch" },{ code:"tr", name:"Turkish" },{ code:"pl", name:"Polish" },{ code:"vi", name:"Vietnamese" },{ code:"th", name:"Thai" },{ code:"id", name:"Indonesian" },{ code:"ms", name:"Malay" },{ code:"yo", name:"Yoruba" },{ code:"ig", name:"Igbo" },{ code:"ha", name:"Hausa" },{ code:"sw", name:"Swahili" },{ code:"am", name:"Amharic" },{ code:"zu", name:"Zulu" },{ code:"bn", name:"Bengali" },{ code:"ur", name:"Urdu" },{ code:"fa", name:"Persian" },{ code:"he", name:"Hebrew" },{ code:"el", name:"Greek" },{ code:"uk", name:"Ukrainian" },{ code:"ro", name:"Romanian" },{ code:"sv", name:"Swedish" },{ code:"da", name:"Danish" },{ code:"no", name:"Norwegian" },{ code:"fi", name:"Finnish" },{ code:"hu", name:"Hungarian" },{ code:"cs", name:"Czech" },{ code:"sk", name:"Slovak" },{ code:"hr", name:"Croatian" },{ code:"sr", name:"Serbian" },{ code:"fil", name:"Filipino" },{ code:"ta", name:"Tamil" },{ code:"te", name:"Telugu" },{ code:"ml", name:"Malayalam" },{ code:"kn", name:"Kannada" },{ code:"gu", name:"Gujarati" },{ code:"mr", name:"Marathi" },{ code:"pa", name:"Punjabi" },{ code:"my", name:"Burmese" },{ code:"km", name:"Khmer" },{ code:"lo", name:"Lao" },{ code:"si", name:"Sinhala" },{ code:"ne", name:"Nepali" },{ code:"af", name:"Afrikaans" },{ code:"sq", name:"Albanian" },{ code:"hy", name:"Armenian" },{ code:"az", name:"Azerbaijani" },{ code:"eu", name:"Basque" },{ code:"be", name:"Belarusian" },{ code:"bs", name:"Bosnian" },{ code:"bg", name:"Bulgarian" },{ code:"ca", name:"Catalan" },{ code:"et", name:"Estonian" },{ code:"ka", name:"Georgian" },{ code:"is", name:"Icelandic" },{ code:"kk", name:"Kazakh" },{ code:"ky", name:"Kyrgyz" },{ code:"lv", name:"Latvian" },{ code:"lt", name:"Lithuanian" },{ code:"mk", name:"Macedonian" },{ code:"mn", name:"Mongolian" },{ code:"sl", name:"Slovenian" },{ code:"so", name:"Somali" },{ code:"sw", name:"Swahili" },{ code:"tg", name:"Tajik" },{ code:"tk", name:"Turkmen" },{ code:"uz", name:"Uzbek" },{ code:"cy", name:"Welsh" }];
const BAD_FIX = { "Client en Compte":"Compte", "Compte du client":"Compte" };
const FORCE_FIX = { "QR Code": { "th":"คิวอาร์โค้ด", "zh":"二维码", "fr":"Code QR", "es":"Código QR", "de":"QR-Code" } };
let transCache = JSON.parse(localStorage.getItem("ddchat_trans_v3") || "{}");
async function googleTranslate(text, from, to){ if(!text) return text; if(from===to && from!=="auto") return text; try{ const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`; const r=await fetch(url); const j=await r.json(); let out=""; j[0].forEach(x=>{ if(x[0]) out+=x[0]; }); return out||text; }catch{ return text; } }
function getNodes(root){ const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{ const p=n.parentElement; if(!p) return NodeFilter.FILTER_REJECT; if(["SCRIPT","STYLE"].includes(p.tagName)) return NodeFilter.FILTER_REJECT; if(p.closest("#langList, #chatMessages")) return NodeFilter.FILTER_REJECT; return n.nodeValue.trim().length>1?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT; }}); const a=[];let x;while(x=w.nextNode())a.push(x);return a; }
async function translateApp(lang){ if(!lang||lang==="en")return; const nodes=getNodes(document.body); const need=new Map(); nodes.forEach(tn=>{ const p=tn.parentElement; if(!p.dataset.o) p.dataset.o=tn.nodeValue; const orig=p.dataset.o; const key=lang+"::"+orig.trim(); if(transCache[key]){ let t=transCache[key]; if(BAD_FIX[t])t=BAD_FIX[t]; tn.nodeValue=t; } else{ if(!need.has(orig))need.set(orig,[]); need.get(orig).push(tn); } }); $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.closest("#chatInputBar")) return; if(!el.dataset.oPh) el.dataset.oPh=el.placeholder; const orig=el.dataset.oPh; const key=lang+"::"+orig.trim(); if(transCache[key]) el.placeholder=transCache[key]; else if(orig.trim()){ if(!need.has(orig))need.set(orig,[]); } }); if(need.size){ for(const o of [...need.keys()]){ let q=o.trim(); if(q==="QR Code" && FORCE_FIX["QR Code"][lang]){ const t=FORCE_FIX["QR Code"][lang]; transCache[lang+"::"+o.trim()]=t; transCache[lang+"::"+o]=t; (need.get(o)||[]).forEach(n=>{ if(n.nodeType===3) n.nodeValue=t; }); $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.dataset.oPh===o) el.placeholder=t; }); continue; } let isAtUser=q.toLowerCase()==="@username"; if(isAtUser) q="username"; let t=await googleTranslate(q,"en",lang); if(isAtUser) t="@"+t; if(BAD_FIX[t])t=BAD_FIX[t]; transCache[lang+"::"+o.trim()]=t; transCache[lang+"::"+o]=t; (need.get(o)||[]).forEach(n=>{ if(n.nodeType===3) n.nodeValue=t; }); $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.dataset.oPh===o) el.placeholder=t; }); } localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache)); } }
async function setPresenceText(el, enText){
  if(!el) return;
  el.textContent = enText;
  const lang = localStorage.getItem("ddchat_lang") || "en";
  if(lang==="en") return;
  const key = lang+"::"+enText.trim();
  if(transCache[key]){ el.textContent = transCache[key]; } else { try{ const t = await googleTranslate(enText,"en",lang); transCache[key]=t; localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache)); el.textContent = t; }catch{} }
}
const savedLang = localStorage.getItem("ddchat_lang"); if(savedLang && savedLang!=="en") setTimeout(()=>translateApp(savedLang), 600);
new MutationObserver(()=>{ const l=localStorage.getItem("ddchat_lang"); if(l&&l!=="en") translateApp(l); }).observe(document.body,{childList:true,subtree:true});
function renderLanguages(filter=""){ const ul = $("#langList"); ul.innerHTML = ""; LANGUAGES.filter(l => l.name.toLowerCase().includes(filter.toLowerCase())).forEach(l => { const li = document.createElement("li"); li.textContent = l.name; if (l.code === selectedLang) li.classList.add("selected"); li.onclick = () => { selectedLang = l.code; $$("#langList li").forEach(x=>x.classList.remove("selected")); li.classList.add("selected"); }; ul.appendChild(li); }); }
renderLanguages(); $("#langSearch").oninput = (e) => renderLanguages(e.target.value);
$("#langContinue").onclick = () => { localStorage.setItem("ddchat_lang", selectedLang); translateApp(selectedLang); showScreen("auth-screen"); };
$("#switchAuth").onclick = (e) => { e.preventDefault(); isSignup = !isSignup; $("#authTitle").textContent = isSignup ? "Sign Up" : "Log In"; $("#authBtn").textContent = isSignup ? "Create Account" : "Log In"; $("#switchText").textContent = isSignup ? "Already have an account?" : "New here?"; $("#switchAuth").textContent = isSignup ? "Log In" : "Sign Up"; $("#authName").style.display = isSignup ? "block" : "none"; $("#authUsername").style.display = isSignup ? "block" : "none"; $("#forgotLink").style.display = isSignup ? "none" : "block"; };
$("#authBtn").onclick = async () => { const email = $("#authEmail").value.trim(); const pass = $("#authPassword").value; if (!email || !pass) return alert("Enter email and password"); try { if (isSignup) { const name = $("#authName").value.trim(); const username = $("#authUsername").value.trim().toLowerCase(); if (!name || !username) return alert("Name & username required"); const cred = await createUserWithEmailAndPassword(auth, email, pass); const ddId = Math.floor(10000000 + Math.random()*90000000).toString(); await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name, username, email, lang: selectedLang, about: "Hey there! I'm using DDchat.", avatar: name[0].toUpperCase(), photoURL:"", ddId, phone:"", isOnline:false, lastSeen:serverTimestamp(), currentChatWith:null, createdAt: serverTimestamp() }); } else { await signInWithEmailAndPassword(auth, email, pass); } } catch (err) { alert(err.message); } };
$("#forgotLink").onclick = (e)=>{ e.preventDefault(); showModal("Reset","Contact support: flatking43@gmail.com"); };
function startPresence(){
  if(!currentUser) return;
  const userRef = doc(db,"users",currentUser.uid);
  const goOnline = ()=> updateDoc(userRef,{isOnline:true, lastSeen:serverTimestamp(), currentChatWith: currentChatWith || null}).catch(()=>{});
  const goOffline = ()=> updateDoc(userRef,{isOnline:false, lastSeen:serverTimestamp(), currentChatWith:null}).catch(()=>{});
  goOnline();
  if(heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(goOnline, 25000);
  window.addEventListener('beforeunload', goOffline);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) goOffline(); else goOnline(); });
}
function listenToOtherPresence(otherUid){
  if(presenceUnsub) presenceUnsub();
  presenceUnsub = onSnapshot(doc(db,"users",otherUid),(snap)=>{
    if(!snap.exists()) return;
    const u = snap.data();
    userCache[otherUid] = {...userCache[otherUid], ...u};
    const lastSeenEl = $("#chatLastSeen");
    const dot = $("#chatAvatarStatus");
    const aboutEl = $("#chatAboutStatus");
    if(!lastSeenEl || !dot) return;
    const isAppOnline = u.isOnline === true;
    const isInsideMyChat = u.currentChatWith === currentUser.uid;
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
      const last = u.lastSeen?.toDate ? u.lastSeen.toDate() : new Date();
      const timeStr = last.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
      setPresenceText(lastSeenEl, `last seen today at ${timeStr}`);
      dot.className = "offline";
    }
  });
}
async function markMyMessagesAsRead(){
  if(!currentChatId) return;
  try{
    const qy = query(collection(db,"chats",currentChatId,"messages"), where("from","==",currentUser.uid));
    const s = await getDocs(qy);
    s.forEach(m=>{ if(m.data().status!=="read") updateDoc(doc(db,"chats",currentChatId,"messages",m.id),{status:"read", read:true}).catch(()=>{}); });
  }catch{}
}
onAuthStateChanged(auth, async (user) => { authChecked = true; if (user) { currentUser = user; const snap = await getDoc(doc(db, "users", user.uid)); if (snap.exists()) { const d = snap.data(); 
let myLang = d.lang || localStorage.getItem("ddchat_lang") || "en";
selectedLang = myLang;
localStorage.setItem("ddchat_lang", myLang);
if(myLang!=="en") setTimeout(()=>translateApp(myLang),400);
if(!d.lang){ try{ await updateDoc(doc(db,"users",user.uid),{lang:myLang}); }catch{} }
$("#profileName").textContent = d.name; $("#profileUsername").textContent = "@"+d.username; const av = $("#profileAvatar"); if(d.photoURL){ av.innerHTML = `<img src="${d.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; av.dataset.full = d.photoURL; } else { av.textContent = d.avatar || d.name[0].toUpperCase(); av.dataset.full = ""; } const sticky = document.getElementById("profileStickyName"); if(sticky) sticky.textContent = d.name; if(!d.ddId){ const ddId = Math.floor(10000000 + Math.random()*90000000).toString(); await updateDoc(doc(db,"users",user.uid),{ddId}); } } showScreen("app"); startPresence(); loadChats(); loadGroups(); loadStatus(); loadCalls(); } else { currentUser=null; if(heartbeatInterval) clearInterval(heartbeatInterval); if(presenceUnsub) presenceUnsub(); if(chatUnsub) chatUnsub(); if(localStorage.getItem("ddchat_lang")) showScreen("auth-screen"); else showScreen("language-screen"); } });
$$("#bottomnav button").forEach(btn => { btn.onclick = () => { $$("#bottomnav button").forEach(b => b.classList.remove("active")); btn.classList.add("active"); $$(".page").forEach(p => p.classList.remove("active")); $("#page-" + btn.dataset.page).classList.add("active"); $("#topTitle").textContent = btn.dataset.page === "chats" ? "DDchat" : btn.dataset.page.charAt(0).toUpperCase()+btn.dataset.page.slice(1); if(btn.dataset.page !== "profile"){ const sticky = document.getElementById("profileStickyName"); if(sticky) sticky.style.opacity = "0"; } const l=localStorage.getItem("ddchat_lang"); if(l&&l!=="en") setTimeout(()=>translateApp(l),200); }; });
function openFullPhoto(url){ if(!url) return; showModal("Photo",`<div style="position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column"><div style="padding:15px;display:flex;align-items:center;background:#111"><button id="photoBackBtn" style="background:#333;border:none;width:42px;height:42px;border-radius:50%;color:white;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer">←</button><span style="color:white;margin-left:15px;font-weight:bold">Profile Photo</span></div><div style="flex:1;display:flex;align-items:center;justify-content:center;background:black;padding:10px"><img src="${url}" style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:8px"/></div></div>`); setTimeout(()=>{ const btn=document.getElementById("photoBackBtn"); if(btn) btn.onclick=()=>$("#modal").classList.add("hidden"); },50); }
function loadChats(){ if(!currentUser) return; const q = query(collection(db, "chats"), where("members","array-contains",currentUser.uid)); onSnapshot(q, (snap)=>{ const list=$("#chatList"); if(snap.empty){ list.innerHTML="<li style='padding:15px;color:#8696a0'>No chats yet. Search username or DD ID above to start.</li>"; return; } const chatMap = new Map(); snap.forEach(chatDoc=>{ const data=chatDoc.data(); const otherUid=data.members.find(m=>m!==currentUser.uid); if(!otherUid) return; const exist = chatMap.get(otherUid); if(!exist) chatMap.set(otherUid, chatDoc); else { const t1 = exist.data().updated?.toMillis?.()||0; const t2 = data.updated?.toMillis?.()||0; if(t2>t1) chatMap.set(otherUid, chatDoc); } }); list.innerHTML=""; chatMap.forEach((chatDoc, otherUid)=>{ const data=chatDoc.data(); const unread = data.unreadCount?.[currentUser.uid] || 0; const cached = userCache[otherUid]; const name = cached?.name || "DD User"; const letter = cached?.avatar || name[0] || "U"; const photo = cached?.photoURL || ""; const avatarHtml = photo ? `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${photo}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>` : `<div class="avatar" style="width:48px;height:48px;flex-shrink:0">${letter}</div>`; const li=document.createElement("li"); li.id = "chat_"+otherUid; li.style.display="flex"; li.style.alignItems="center"; li.style.gap="12px"; li.style.padding="12px"; li.style.borderBottom="1px solid rgba(255,255,255,0.06)"; li.style.cursor="pointer"; li.innerHTML=`${avatarHtml}<div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(name)}</b><small style="color:#8696a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${escapeHtml(data.lastMsg||"Start chatting")}</small></div>${unread>0?`<span class="unread-badge">${unread}</span>`:''}`; li.onclick=()=>openChat(chatDoc.id,otherUid, cached?.name||""); list.appendChild(li); }); chatMap.forEach(async (chatDoc, otherUid)=>{ if(userCache[otherUid]) return; try{ const usnap = await getDoc(doc(db,"users",otherUid)); if(usnap.exists()){ const u = usnap.data(); userCache[otherUid]=u; const el = document.getElementById("chat_"+otherUid); if(el){ const photo = u.photoURL||""; const letter = u.avatar||u.name?.[0]?.toUpperCase()||"U"; const avatarHtml = photo ? `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${photo}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>` : `<div class="avatar" style="width:48px;height:48px;flex-shrink:0">${letter}</div>`; const data = chatDoc.data(); el.innerHTML=`${avatarHtml}<div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.name||"DD User")}</b><small style="color:#8696a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${escapeHtml(data.lastMsg||"Start chatting")}</small></div>${data.unreadCount?.[currentUser.uid]?`<span class="unread-badge">${data.unreadCount[currentUser.uid]}</span>`:''}`; el.onclick=()=>openChat(chatDoc.id,otherUid,u.name); } } }catch{} }); }, (err)=>{ console.log("Chats offline:", err.code); }); }
$("#chatSearch").oninput = async (e)=>{ const raw = e.target.value.trim(); if(raw.length<1){ loadChats(); return; } const list=$("#chatList"); list.innerHTML="<li style='padding:15px'>Searching...</li>"; let found = []; const low = raw.toLowerCase(); try{ const q1=query(collection(db,"users"), where("username","==",low)); const s1=await getDocs(q1); s1.forEach(d=>{ const u=d.data(); if(u.uid!==currentUser.uid) found.push(u); }); }catch{} try{ const q2=query(collection(db,"users"), where("ddId","==",raw)); const s2=await getDocs(q2); s2.forEach(d=>{ const u=d.data(); if(u.uid!==currentUser.uid && !found.find(f=>f.uid===u.uid)) found.push(u); }); }catch{} const clean = raw.replace("DD-","").replace("DD","").trim(); if(clean!==raw){ try{ const q3=query(collection(db,"users"), where("ddId","==",clean)); const s3=await getDocs(q3); s3.forEach(d=>{ const u=d.data(); if(u.uid!==currentUser.uid && !found.find(f=>f.uid===u.uid)) found.push(u); }); }catch{} } list.innerHTML=""; if(found.length===0){ list.innerHTML=`<li style='padding:15px'>No user found for "${escapeHtml(raw)}"</li>`; return; } found.forEach(u=>{ userCache[u.uid]=u; const li=document.createElement("li"); li.innerHTML=`<div class="avatar">${u.avatar||u.name[0]}</div><div><b>${escapeHtml(u.name)}</b><br><small>@${escapeHtml(u.username)} - DD ID: ${u.ddId}</small></div>`; li.onclick=()=>startChat(u.uid); list.appendChild(li); }); };
async function startChat(otherUid){ const members=[currentUser.uid,otherUid].sort(); const chatId=members.join("_"); const ref=doc(db,"chats",chatId); const snap=await getDoc(ref); if(!snap.exists()) await setDoc(ref,{members,lastMsg:"",unreadCount:{[currentUser.uid]:0,[otherUid]:0},updated:serverTimestamp()}); openChat(chatId,otherUid); }
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
  const fileName = d.fileName || d.text?.replace("📎 ","") || "file";
  let fileUrl = d.fileUrl || d.audioUrl || "";
  if(!fileUrl) return null;
  if(fileUrl.startsWith("blob:")) return `<div style="padding:8px;background:#3a1a1a;border-radius:8px;color:#ff8a8a;font-size:12px">⚠️ Voice expired - resend please</div>`;
  const safeName = escapeHtml(fileName);
  const isImage = d.fileType?.startsWith("image/") || d.msgType==="image" || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = d.fileType?.startsWith("video/") || d.msgType==="video";
  const isVoice = d.fileType?.startsWith("audio/") || d.msgType==="voice";
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
  if(chatUnsub) chatUnsub();
  currentChatId=chatId; currentChatWith=otherUid; 
  showScreen("chat-view"); 
  const cached = userCache[otherUid];
  $("#chatTitle").textContent=passedName||cached?.name||"Chat";
  const chatAvatarImg = $("#chatAvatarImg");
  if(chatAvatarImg){
    if(cached?.photoURL){ chatAvatarImg.innerHTML=`<img src="${cached.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
    else { chatAvatarImg.textContent = (cached?.avatar||cached?.name?.[0]||"?").toUpperCase(); }
  }
  if(currentUser){
    updateDoc(doc(db,"users",currentUser.uid),{currentChatWith: otherUid, isOnline:true, lastSeen:serverTimestamp()}).catch(()=>{});
  }
  listenToOtherPresence(otherUid);
  updateDoc(doc(db,"chats",chatId),{[ `unreadCount.${currentUser.uid}`]:0}).catch(()=>{}); 
  const q=query(collection(db,"chats",chatId,"messages"), orderBy("ts","desc"), limit(30)); 
  chatUnsub = onSnapshot(q,(snap)=>{ 
    const box=$("#chatMessages"); box.innerHTML=""; 
    const allMsgs=[];
    snap.forEach(m=> allMsgs.push({id:m.id, ...m.data()}));
    allMsgs.reverse();
    allMsgs.forEach(d=>{
      const row=document.createElement("div"); row.className="msg-row "+(d.from===currentUser.uid?"out":"in");
      const bubble=document.createElement("div"); bubble.className="bubble "+(d.from===currentUser.uid?"out":"in");
      const dateObj = d.ts?.toDate ? d.ts.toDate() : new Date();
      const timeStr = dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
      let tickClass="sent"; let tickIcon=`<i class="fas fa-check"></i>`;
      if(d.from===currentUser.uid){
        if(d.status==="read" || d.read){ tickClass="read"; tickIcon=`<i class="fas fa-check-double"></i>`; }
        else if(d.status==="delivered"){ tickClass="delivered"; tickIcon=`<i class="fas fa-check-double"></i>`; }
      }
      const ticks = d.from===currentUser.uid ? `<span class="ticks ${tickClass}">${tickIcon}</span>` : "";
      const fileHtml = getFileBubbleHtml(d);
      const msgId = "msg_"+d.id;
      bubble.innerHTML = fileHtml ? `${fileHtml}<span class="msg-time">${timeStr} ${ticks}</span>` : `<span id="${msgId}" class="msg-text">${escapeHtml(d.text)}</span><span class="msg-time">${timeStr} ${ticks}</span>`;
      row.appendChild(bubble);
      box.appendChild(row);
      if(!fileHtml && d.from!==currentUser.uid && d.text && !d.text.startsWith("🎤")){
        const myLang = localStorage.getItem("ddchat_lang")||"en";
        const orig = d.originalLang||"auto";
        if(myLang!==orig){
          const key = myLang+"::"+d.text.trim();
          const el = document.getElementById(msgId);
          if(transCache[key]){ if(el) el.textContent=transCache[key]; }
          else { googleTranslate(d.text, orig, myLang).then(tr=>{ transCache[key]=tr; localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache)); if(el) el.textContent=tr; }); }
        }
      }
      if(d.from!==currentUser.uid && currentChatWith===d.from && d.status!=="read"){
        updateDoc(doc(db,"chats",currentChatId,"messages",d.id),{status:"read"}).catch(()=>{});
      }
    }); 
    requestAnimationFrame(()=>{ box.scrollTop=box.scrollHeight; });
  }); 
}
$("#sendBtn").onclick=sendMessage; $("#messageInput").addEventListener("keypress",(e)=>{ if(e.key==="Enter") sendMessage(); });
async function sendMessage(){
  const text=$("#messageInput").value.trim(); if(!text||!currentChatId) return;
  const box=$("#chatMessages");
  // WHATSAPP FAST: show instantly
  const tempId="txt_"+Date.now();
  const timeStr=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
  box.insertAdjacentHTML("beforeend", `<div id="${tempId}" class="msg-row out"><div class="bubble out"><span class="msg-text">${escapeHtml(text)}</span><span class="msg-time">${timeStr} <span class="ticks sent"><i class="fas fa-check"></i></span></span></div></div>`);
  box.scrollTop=box.scrollHeight;
  $("#messageInput").value="";
  const myLang = localStorage.getItem("ddchat_lang")||"en";
  const otherOnline = userCache[currentChatWith]?.isOnline;
  const initialStatus = otherOnline ? "delivered" : "sent";
  try{
    await addDoc(collection(db,"chats",currentChatId,"messages"),{from:currentUser.uid,text,originalLang:myLang,ts:serverTimestamp(), status:initialStatus});
    await updateDoc(doc(db,"chats",currentChatId),{lastMsg:text,updated:serverTimestamp(),[ `unreadCount.${currentChatWith}`]: increment(1)});
    document.getElementById(tempId)?.remove();
  }catch(e){ document.getElementById(tempId)?.remove(); alert("Send failed, check network"); }
}
$("#chatBack").onclick=()=>{
  if(currentUser){
    updateDoc(doc(db,"users",currentUser.uid),{currentChatWith:null, lastSeen:serverTimestamp(), isOnline:true}).catch(()=>{});
  }
  currentChatWith=null;
  if(presenceUnsub) presenceUnsub();
  if(chatUnsub) chatUnsub();
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
      const maxDim = 900;
      if(w > maxDim || h > maxDim){
        if(w > h){ h *= maxDim/w; w = maxDim; } 
        else { w *= maxDim/h; h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      canvas.toBlob(b=> resolve(b), "image/jpeg", 0.65);
    };
    reader.readAsDataURL(file);
  });
}
async function uploadFree(file){
  try{
    const fd = new FormData();
    fd.append("reqtype","fileupload");
    fd.append("fileToUpload", file);
    const r = await fetch("https://catbox.moe/user/api.php",{method:"POST",body:fd});
    const t = (await r.text()).trim();
    if(t.startsWith("https://")) return t;
  }catch{}
  try{
    const fd2 = new FormData(); fd2.append("file", file);
    const r2 = await fetch("https://0x0.st",{method:"POST",body:fd2});
    const t2 = (await r2.text()).trim();
    if(t2.startsWith("https://")) return t2;
  }catch{}
  return null;
}
// FAST FILE SEND LIKE WHATSAPP - SHOW INSTANTLY
fileInput?.addEventListener('change', async (e)=>{
  const f=e.target.files[0]; if(!f||!currentChatId) return;
  if(f.size > 50*1024*1024){ alert("File too big - 50MB max"); e.target.value=""; return; }
  const box=$("#chatMessages");
  const tempId="up_"+Date.now();
  const localUrl=URL.createObjectURL(f);
  const isImage=f.type.startsWith("image/");
  const preview = isImage ? `<img src="${localUrl}" style="max-width:220px;border-radius:12px;display:block">` : `<div style="background:#2a1a6a;padding:12px;border-radius:12px">📎 ${escapeHtml(f.name)}</div>`;
  const timeStr=new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true});
  box.insertAdjacentHTML("beforeend", `<div id="${tempId}" class="msg-row out"><div class="bubble out">${preview}<span class="msg-time">${timeStr} ⏳</span></div></div>`);
  box.scrollTop=box.scrollHeight;
  e.target.value="";
  let fileUrl=null;
  try{
    if(isImage){ const blob = await compressImage(f); fileUrl = await uploadFree(blob); }
    else { fileUrl = await uploadFree(f); }
  }catch{}
  URL.revokeObjectURL(localUrl);
  document.getElementById(tempId)?.remove();
  if(!fileUrl){ alert("Upload failed, try again"); return; }
  const msgType=f.type.startsWith("image/")?"image":f.type.startsWith("video/")?"video":f.type.startsWith("audio/")?"voice":"file";
  await addDoc(collection(db,"chats",currentChatId,"messages"),{from:currentUser.uid,text:`📎 ${f.name}`,fileUrl,fileName:f.name,fileType:f.type,msgType,ts:serverTimestamp(),status:"sent"});
  await updateDoc(doc(db,"chats",currentChatId),{lastMsg:`📎 ${f.name}`,updated:serverTimestamp(),[ `unreadCount.${currentChatWith}`]: increment(1)});
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
      box.insertAdjacentHTML("beforeend", `<div id="${tempId}" class="msg-row out"><div class="bubble out"><audio controls src="${localAudioUrl}" style="width:200px"></audio><span class="msg-time">${timeStr} ⏳</span></div></div>`);
      box.scrollTop=box.scrollHeight;
      let url = await uploadFree(blob);
      if(!url){ url = await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); }); }
      URL.revokeObjectURL(localAudioUrl);
      document.getElementById(tempId)?.remove();
      await addDoc(collection(db,"chats",currentChatId,"messages"),{from:currentUser.uid,text:"🎤 Voice",fileUrl:url,audioUrl:url,fileName:"Voice",fileType:"audio/webm",msgType:"voice",ts:serverTimestamp(),status:"sent"});
      await updateDoc(doc(db,"chats",currentChatId),{lastMsg:"🎤 Voice",updated:serverTimestamp(),[ `unreadCount.${currentChatWith}`]: increment(1)});
      stream.getTracks().forEach(t=>t.stop()); mediaChunks=[];
    };
    rec.start(100); micBtn.innerHTML='<i class="fas fa-stop" style="color:#ff3b3b"></i>';
  }catch{ alert("Mic permission needed"); }
});
stickerBtn?.addEventListener('click', ()=>{ if(!currentChatId) return; document.getElementById('messageInput').value+=" 😊"; });
chatVideoCall?.addEventListener('click', ()=> showModal("Video Call","Video calling soon"));
chatVoiceCall?.addEventListener('click', ()=> showModal("Voice Call","Voice calling soon"));
$("#postStatusBtn").onclick=()=>{ showModal("Post Status",`<input id="statusText" placeholder="What's on your mind?" style="width:100%;padding:10px"/><button class="btn" id="saveStatus">Post</button>`); setTimeout(()=>{ $("#saveStatus").onclick= async ()=>{ const text=$("#statusText").value.trim(); if(!text) return; await addDoc(collection(db,"status"),{uid:currentUser.uid,text,ts:serverTimestamp()}); $("#modal").classList.add("hidden"); }; },100); };
function loadStatus(){ const q=query(collection(db,"status"), orderBy("ts","desc")); onSnapshot(q,(snap)=>{ const list=$("#statusList"); list.innerHTML=""; snap.forEach(d=>{ const s=d.data(); const li=document.createElement("li"); li.innerHTML=`<div class="avatar">${s.uid.slice(0,2)}</div><div><b>Status</b><br><small>${escapeHtml(s.text)}</small></div>`; list.appendChild(li); }); }); }
$("#createGroupBtn").onclick=()=>{ showModal("Create Group",`<input id="groupName" placeholder="Group name" style="width:100%;padding:10px"/><button class="btn" id="saveGroup">Create</button>`); setTimeout(()=>{ $("#saveGroup").onclick= async ()=>{ const name=$("#groupName").value.trim(); if(!name) return; await addDoc(collection(db,"groups"),{name,members:[currentUser.uid],createdBy:currentUser.uid,ts:serverTimestamp()}); $("#modal").classList.add("hidden"); }; },100); };
function loadGroups(){ const q=query(collection(db,"groups"), where("members","array-contains",currentUser.uid)); onSnapshot(q,(snap)=>{ const list=$("#groupList"); list.innerHTML=""; snap.forEach(d=>{ const g=d.data(); const li=document.createElement("li"); li.innerHTML=`<div class="avatar">G</div><div><b>${g.name}</b><br><small>${g.members.length} members</small></div>`; list.appendChild(li); }); }); }
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
  let snap=await getDoc(doc(db,"users",currentUser.uid));
  let d=snap.data();
  if(!d.ddId){ const ddId=Math.floor(10000000+Math.random()*90000000).toString(); await updateDoc(doc(db,"users",currentUser.uid),{ddId}); d.ddId=ddId; }
  const qrData = `DDCHAT:${d.uid}:${d.ddId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
  showModal("QR Code",`
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <button class="btn" id="scanLeftBtn" style="padding:8px 12px">📷 Scan</button>
        <div style="display:flex;gap:6px"><button class="btn" id="shareQrTopRight" style="padding:8px 12px">Share</button><button class="btn" id="closeQrBtn" style="padding:8px 12px;background:#444">Close</button></div>
      </div>
      <div style="text-align:center">
        <img id="qrImg" src="${qrUrl}" style="width:220px;height:220px;border-radius:12px"/>
        <p style="margin:8px 0;font-weight:bold">${d.name}</p><small>DD ID: ${d.ddId}</small>
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
    document.getElementById("shareQrTopRight").onclick=async()=>{ if(navigator.share){try{await navigator.share({title:"My DDchat QR",text:`DD ID: ${d.ddId}`});}catch{}} else{await navigator.clipboard.writeText(qrData); alert("Copied");} };
    async function openFromQr(text){
      if(!text) return;
      const el=document.getElementById("qrResult");
      if(!text.includes("DDCHAT:")){ el.textContent="Invalid QR - Use DDchat QR"; return; }
      const uid=text.split(":")[1]; const ddId=text.split(":")[2];
      if(uid===currentUser.uid){ el.textContent="That's your own QR"; return; }
      el.textContent="Fetching account...";
      closeCam();
      try{
        let usnap=await getDoc(doc(db,"users",uid));
        if(!usnap.exists() && ddId){ const q=query(collection(db,"users"),where("ddId","==",ddId)); const s=await getDocs(q); if(!s.empty) usnap=s.docs[0]; }
        if(usnap && usnap.exists()){
          userCache[usnap.id]=usnap.data();
          el.textContent="Found: "+usnap.data().name+" - Opening chat...";
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
      await updateDoc(doc(db,"users",currentUser.uid),{ddId:newDdId});
      const newData=`DDCHAT:${currentUser.uid}:${newDdId}`; const newUrl=`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newData)}`;
      document.getElementById("qrImg").src=newUrl; document.getElementById("qrResult").textContent="New ID: "+newDdId+" - QR reset";
    };
  },100);
}
  if(e.target.closest("#topEditBtn")){
    if(!currentUser) return;
    let snap=await getDoc(doc(db,"users",currentUser.uid));
    let d=snap.data();
    if(!d.ddId){ const ddId=Math.floor(10000000+Math.random()*90000000).toString(); await updateDoc(doc(db,"users",currentUser.uid),{ddId}); d.ddId=ddId; }
    showModal("Edit Profile",`<div style="display:flex;flex-direction:column;gap:10px"><div style="text-align:center"><div class="avatar" id="editAvatarPreview" style="width:70px;height:70px;font-size:30px;margin:auto;overflow:hidden;background:#5E35B1;color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer">${d.photoURL?`<img src="${d.photoURL}" style="width:100%;height:100%;object-fit:cover">`:(d.avatar||d.name[0])}</div><input type="file" id="photoInput" accept="image/*" style="margin-top:8px"/><br><small>Any size allowed - click photo to view big</small></div><label>Name</label><input id="editName" value="${escapeHtml(d.name)}" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd"/><label>About</label><textarea id="editAbout" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd">${escapeHtml(d.about||"")}</textarea><label>Phone</label><input id="editPhone" value="${escapeHtml(d.phone||"")}" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd"/><label>Email</label><input value="${escapeHtml(d.email||"")}" disabled style="width:100%;padding:10px;border-radius:8px;background:#f5f5f5"/><label>DD ID</label><input value="${d.ddId}" disabled style="width:100%;padding:10px;border-radius:8px;background:#f5f5f5"/><button class="btn" id="saveProfileNew" style="margin-top:8px">Save Changes</button><div id="editStatus" style="text-align:center;margin-top:8px"></div></div>`);
    setTimeout(()=>{
      let finalPhoto = d.photoURL || "";
      document.getElementById("editAvatarPreview").onclick=()=>{ if(finalPhoto) openFullPhoto(finalPhoto); };
      document.getElementById("photoInput").onchange=(ev)=>{ const file=ev.target.files[0]; if(!file) return; document.getElementById("editStatus").textContent="Compressing any size..."; const reader=new FileReader(); reader.onload=(e)=>{ const img=new Image(); img.onload=()=>{ const canvas=document.createElement("canvas"); let w=img.width, h=img.height; const max=800; if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } } canvas.width=w; canvas.height=h; canvas.getContext("2d").drawImage(img,0,0,w,h); finalPhoto=canvas.toDataURL("image/jpeg",0.7); document.getElementById("editAvatarPreview").innerHTML=`<img src="${finalPhoto}" style="width:100%;height:100%;object-fit:cover">`; document.getElementById("editStatus").textContent=`Ready! ${(file.size/1024/1024).toFixed(2)}MB compressed ✓`; }; img.src=e.target.result; }; reader.readAsDataURL(file); };
      document.getElementById("saveProfileNew").onclick=async()=>{ const name=document.getElementById("editName").value.trim(); const about=document.getElementById("editAbout").value.trim(); const phone=document.getElementById("editPhone").value.trim(); if(!name) return alert("Name required"); document.getElementById("editStatus").textContent="Saving..."; try{ await updateDoc(doc(db,"users",currentUser.uid),{name, about, phone, avatar:name[0].toUpperCase(), photoURL:finalPhoto}); if(finalPhoto) userCache[currentUser.uid]={...userCache[currentUser.uid], photoURL:finalPhoto, name}; document.getElementById("profileName").textContent=name; const av=document.getElementById("profileAvatar"); if(finalPhoto){ av.innerHTML=`<img src="${finalPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; av.dataset.full=finalPhoto; } const sticky=document.getElementById("profileStickyName"); if(sticky) sticky.textContent=name; document.getElementById("editStatus").textContent="Saved! ✓"; setTimeout(()=>document.getElementById("modal").classList.add("hidden"),800); }catch(err){ document.getElementById("editStatus").textContent="Save failed: "+err.message; } };
    },100);
  }
});
$$(".settings-list li").forEach(li=>{ li.onclick=()=>{ const s=li.dataset.setting; if(s==="logout"){ signOut(auth); return; } if(s==="account"){ document.getElementById("topEditBtn")?.click(); return; } showModal(li.textContent.trim(),"<p>"+s+" settings coming soon - built.</p>"); }; });