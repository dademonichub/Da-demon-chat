import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, where,
  orderBy, doc, setDoc, getDoc, serverTimestamp, updateDoc, getDocs, increment
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentChatId = null;
let currentChatWith = null;
let isSignup = true;
let selectedLang = localStorage.getItem("ddchat_lang") || "en";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
}
function showModal(title, bodyHtml) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modal").classList.remove("hidden");
}
$("#modalClose").onclick = () => $("#modal").classList.add("hidden");

let authChecked = false;
setTimeout(() => {
  if(!authChecked){
    if(!localStorage.getItem("ddchat_lang")) showScreen("language-screen");
  }
}, 1800);

const LANGUAGES = [
  { code:"en", name:"English" },
  { code:"es", name:"Spanish" },
  { code:"fr", name:"French" },
  { code:"de", name:"German" },
  { code:"pt", name:"Portuguese" },
  { code:"zh", name:"Chinese" },
  { code:"hi", name:"Hindi" },
  { code:"ar", name:"Arabic" },
  { code:"ru", name:"Russian" },
  { code:"ja", name:"Japanese" },
  { code:"ko", name:"Korean" },
  { code:"it", name:"Italian" },
  { code:"nl", name:"Dutch" },
  { code:"tr", name:"Turkish" },
  { code:"pl", name:"Polish" },
  { code:"vi", name:"Vietnamese" },
  { code:"th", name:"Thai" },
  { code:"id", name:"Indonesian" },
  { code:"ms", name:"Malay" },
  { code:"yo", name:"Yoruba" },
  { code:"ig", name:"Igbo" },
  { code:"ha", name:"Hausa" },
  { code:"sw", name:"Swahili" },
  { code:"am", name:"Amharic" },
  { code:"zu", name:"Zulu" },
  { code:"bn", name:"Bengali" },
  { code:"ur", name:"Urdu" },
  { code:"fa", name:"Persian" },
  { code:"he", name:"Hebrew" },
  { code:"el", name:"Greek" },
  { code:"uk", name:"Ukrainian" },
  { code:"ro", name:"Romanian" },
  { code:"sv", name:"Swedish" },
  { code:"da", name:"Danish" },
  { code:"no", name:"Norwegian" },
  { code:"fi", name:"Finnish" },
  { code:"hu", name:"Hungarian" },
  { code:"cs", name:"Czech" },
  { code:"sk", name:"Slovak" },
  { code:"hr", name:"Croatian" },
  { code:"sr", name:"Serbian" },
  { code:"fil", name:"Filipino" },
  { code:"ta", name:"Tamil" },
  { code:"te", name:"Telugu" },
  { code:"ml", name:"Malayalam" },
  { code:"kn", name:"Kannada" },
  { code:"gu", name:"Gujarati" },
  { code:"mr", name:"Marathi" },
  { code:"pa", name:"Punjabi" },
  { code:"my", name:"Burmese" },
  { code:"km", name:"Khmer" },
  { code:"lo", name:"Lao" },
  { code:"si", name:"Sinhala" },
  { code:"ne", name:"Nepali" },
  { code:"af", name:"Afrikaans" },
  { code:"sq", name:"Albanian" },
  { code:"hy", name:"Armenian" },
  { code:"az", name:"Azerbaijani" },
  { code:"eu", name:"Basque" },
  { code:"be", name:"Belarusian" },
  { code:"bs", name:"Bosnian" },
  { code:"bg", name:"Bulgarian" },
  { code:"ca", name:"Catalan" },
  { code:"et", name:"Estonian" },
  { code:"ka", name:"Georgian" },
  { code:"is", name:"Icelandic" },
  { code:"kk", name:"Kazakh" },
  { code:"ky", name:"Kyrgyz" },
  { code:"lv", name:"Latvian" },
  { code:"lt", name:"Lithuanian" },
  { code:"mk", name:"Macedonian" },
  { code:"mn", name:"Mongolian" },
  { code:"sl", name:"Slovenian" },
  { code:"so", name:"Somali" },
  { code:"sw", name:"Swahili" },
  { code:"tg", name:"Tajik" },
  { code:"tk", name:"Turkmen" },
  { code:"uz", name:"Uzbek" },
  { code:"cy", name:"Welsh" }
];

// === LANGUAGE TRANSLATION FOR ALL WORLD LANGUAGES - START ===
const BASE_EN = {
  chooseLang:"Choose your language", searchLang:"Search language", continue:"Continue", signup:"Sign Up", login:"Log In", createAcc:"Create Account", already:"Already have an account?", newHere:"New here?", name:"Name", username:"Username", email:"Email", password:"Password", forgot:"Forgot password?", searchUser:"Search username...", noChats:"No chats yet. Search username above to start.", noUser:"No user found", editProfile:"Edit Profile", about:"About", save:"Save", postStatus:"Post Status", whatMind:"What's on your mind?", post:"Post", createGroup:"Create Group", groupName:"Group name", create:"Create", noCalls:"No calls yet. Voice/video calling integration coming (use WebRTC).", yourQr:"Your QR", newChat:"New Chat (search above)", newGroup:"New Group", fileSelected:"File selected", profileUpdated:"Profile updated!", reset:"Reset"
};
let currentTranslations = {...BASE_EN};
let translationCache = JSON.parse(localStorage.getItem("ddchat_translation_cache") || "{}");
function tr(k){ return currentTranslations[k] || BASE_EN[k] || k; }
function applyTranslationsNow(){
  if($("#langSearch")) $("#langSearch").placeholder = tr("searchLang");
  if($("#langContinue")) $("#langContinue").textContent = tr("continue");
  if($("#authTitle")) $("#authTitle").textContent = isSignup ? tr("signup") : tr("login");
  if($("#authBtn")) $("#authBtn").textContent = isSignup ? tr("createAcc") : tr("login");
  if($("#switchText")) $("#switchText").textContent = isSignup ? tr("already") : tr("newHere");
  if($("#switchAuth")) $("#switchAuth").textContent = isSignup ? tr("login") : tr("signup");
  if($("#forgotLink")) $("#forgotLink").textContent = tr("forgot");
  if($("#authName")) $("#authName").placeholder = tr("name");
  if($("#authUsername")) $("#authUsername").placeholder = tr("username");
  if($("#authEmail")) $("#authEmail").placeholder = tr("email");
  if($("#authPassword")) $("#authPassword").placeholder = tr("password");
  if($("#chatSearch")) $("#chatSearch").placeholder = tr("searchUser");
}
async function loadTranslationsFor(lang){
  if(lang==="en"){ currentTranslations={...BASE_EN}; applyTranslationsNow(); return; }
  if(translationCache[lang]){ currentTranslations=translationCache[lang]; applyTranslationsNow(); return; }
  applyTranslationsNow();
  const newTrans={};
  for(let k of Object.keys(BASE_EN)){
    try{
      const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(BASE_EN[k])}&langpair=en|${lang}`);
      const j=await r.json();
      newTrans[k]=j.responseData?.translatedText || BASE_EN[k];
    }catch{ newTrans[k]=BASE_EN[k]; }
  }
  currentTranslations=newTrans;
  translationCache[lang]=newTrans;
  localStorage.setItem("ddchat_translation_cache", JSON.stringify(translationCache));
  applyTranslationsNow();
}
loadTranslationsFor(selectedLang);
// === LANGUAGE TRANSLATION - END ===

function renderLanguages(filter="") {
  const ul = $("#langList"); ul.innerHTML = "";
  LANGUAGES.filter(l => l.name.toLowerCase().includes(filter.toLowerCase())).forEach(l => {
    const li = document.createElement("li");
    li.textContent = l.name;
    if (l.code === selectedLang) li.classList.add("selected");
    li.onclick = async () => { 
      selectedLang = l.code; 
      localStorage.setItem("ddchat_lang", l.code);
      $$("#langList li").forEach(x=>x.classList.remove("selected")); 
      li.classList.add("selected"); 
      await loadTranslationsFor(l.code);
    };
    ul.appendChild(li);
  });
}
renderLanguages();
$("#langSearch").oninput = (e) => renderLanguages(e.target.value);
$("#langContinue").onclick = async () => { 
  localStorage.setItem("ddchat_lang", selectedLang); 
  await loadTranslationsFor(selectedLang);
  showScreen("auth-screen"); 
};

$("#switchAuth").onclick = (e) => {
  e.preventDefault(); isSignup = !isSignup;
  $("#authTitle").textContent = isSignup ? tr("signup") : tr("login");
  $("#authBtn").textContent = isSignup ? tr("createAcc") : tr("login");
  $("#switchText").textContent = isSignup ? tr("already") : tr("newHere");
  $("#switchAuth").textContent = isSignup ? tr("login") : tr("signup");
  $("#authName").style.display = isSignup ? "block" : "none";
  $("#authUsername").style.display = isSignup ? "block" : "none";
  $("#forgotLink").style.display = isSignup ? "none" : "block";
};

$("#authBtn").onclick = async () => {
  const email = $("#authEmail").value.trim(); const pass = $("#authPassword").value;
  if (!email || !pass) return alert("Enter email and password");
  try {
    if (isSignup) {
      const name = $("#authName").value.trim(); const username = $("#authUsername").value.trim().toLowerCase();
      if (!name || !username) return alert("Name & username required");
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name, username, email, lang: selectedLang, about: "Hey there! I'm using DDchat.", avatar: name[0].toUpperCase(), createdAt: serverTimestamp() });
    } else { await signInWithEmailAndPassword(auth, email, pass); }
  } catch (err) { alert(err.message); }
};

$("#forgotLink").onclick = (e)=>{ e.preventDefault(); showModal(tr("reset"),"Contact support: flatking43@gmail.com"); };

onAuthStateChanged(auth, async (user) => {
  authChecked = true;
  if (user) {
    currentUser = user;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) { 
      const d = snap.data(); 
      $("#profileName").textContent = d.name; 
      $("#profileUsername").textContent = "@"+d.username; 
      $("#profileAvatar").textContent = d.avatar || d.name[0].toUpperCase();
      if(d.lang && d.lang!==selectedLang){
        selectedLang=d.lang;
        localStorage.setItem("ddchat_lang", d.lang);
        await loadTranslationsFor(d.lang);
      }
    }
    showScreen("app"); loadChats(); loadGroups(); loadStatus(); loadCalls();
  } else {
    currentUser=null;
    if(localStorage.getItem("ddchat_lang")) showScreen("auth-screen");
    else showScreen("language-screen");
  }
});

$$("#bottomnav button").forEach(btn => {
  btn.onclick = () => {
    $$("#bottomnav button").forEach(b => b.classList.remove("active")); btn.classList.add("active");
    $$(".page").forEach(p => p.classList.remove("active")); $("#page-" + btn.dataset.page).classList.add("active");
    $("#topTitle").textContent = btn.dataset.page === "chats" ? "DDchat" : btn.dataset.page.charAt(0).toUpperCase()+btn.dataset.page.slice(1);
  };
});

function loadChats(){
  if(!currentUser) return;
  const q = query(collection(db, "chats"), where("members","array-contains",currentUser.uid));
  onSnapshot(q,(snap)=>{
    const list=$("#chatList"); list.innerHTML="";
    if(snap.empty){ list.innerHTML=`<li style='padding:15px;color:#8696a0'>${tr("noChats")}</li>`; return; }
    snap.forEach(d=>{
      const data=d.data();
      const unread = data.unreadCount?.[currentUser.uid] || 0;
      const li=document.createElement("li");
      li.innerHTML=`<div class="avatar">${(data.lastMsg||"D")[0].toUpperCase()}</div><div style="flex:1"><b>Chat</b><br><small>${data.lastMsg||"Start chatting"}</small></div>${unread>0?`<span class="unread-badge">${unread}</span>`:''}`;
      li.onclick=()=>openChat(d.id,data.members.find(m=>m!==currentUser.uid)); list.appendChild(li);
    });
  });
}

$("#chatSearch").oninput = async (e)=>{
  const term=e.target.value.trim().toLowerCase(); if(term.length<2){ loadChats(); return; }
  const q1=query(collection(db,"users"), where("username","==",term));
  const snap=await getDocs(q1); const list=$("#chatList"); list.innerHTML="";
  snap.forEach(d=>{ const u=d.data(); if(u.uid===currentUser.uid) return; const li=document.createElement("li"); li.innerHTML=`<div class="avatar">${u.name[0]}</div><div><b>${u.name}</b><br><small>@${u.username}</small></div>`; li.onclick=()=>startChat(u.uid); list.appendChild(li); });
  if(list.innerHTML==="") list.innerHTML=`<li style='padding:15px'>${tr("noUser")}</li>`;
};

async function startChat(otherUid){
  const members=[currentUser.uid,otherUid].sort(); const chatId=members.join("_");
  const ref=doc(db,"chats",chatId); const snap=await getDoc(ref);
  if(!snap.exists()) await setDoc(ref,{members,lastMsg:"",unreadCount:{[currentUser.uid]:0,[otherUid]:0},updated:serverTimestamp()}); openChat(chatId,otherUid);
}

function openChat(chatId,otherUid){
  currentChatId=chatId; currentChatWith=otherUid; showScreen("chat-view");
  $("#chatTitle").textContent="Chat";
  updateDoc(doc(db,"chats",chatId),{[ `unreadCount.${currentUser.uid}`]:0}).catch(()=>{});
  const q=query(collection(db,"chats",chatId,"messages"), orderBy("ts"));
  onSnapshot(q,(snap)=>{
    const box=$("#chatMessages"); box.innerHTML="";
    snap.forEach(m=>{ const d=m.data(); const div=document.createElement("div"); div.className="msg "+(d.from===currentUser.uid?"me":"them"); div.innerHTML=`${escapeHtml(d.text)} <span class="translate-btn" data-text="${escapeHtml(d.text)}">🌐</span>`; box.appendChild(div); });
    box.scrollTop=box.scrollHeight;
  });
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
$("#sendBtn").onclick=sendMessage; $("#messageInput").addEventListener("keypress",(e)=>{ if(e.key==="Enter") sendMessage(); });
async function sendMessage(){
  const text=$("#messageInput").value.trim(); if(!text||!currentChatId) return;
  $("#messageInput").value="";
  await addDoc(collection(db,"chats",currentChatId,"messages"),{from:currentUser.uid,text,ts:serverTimestamp()});
  await updateDoc(doc(db,"chats",currentChatId),{lastMsg:text,updated:serverTimestamp(),[ `unreadCount.${currentChatWith}`]: increment(1)});
}
$("#chatBack").onclick=()=>showScreen("app");

document.addEventListener("click", async (e)=>{
  if(e.target.classList.contains("translate-btn")){
    const text=e.target.dataset.text; const target=localStorage.getItem("ddchat_lang")||"en";
    try{ const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${target}`); const j=await r.json(); alert("Translated: "+(j.responseData?.translatedText||text)); }catch{ alert("Translation failed"); }
  }
});

$("#editProfileBtn").onclick= async ()=>{
  const snap=await getDoc(doc(db,"users",currentUser.uid)); const d=snap.data();
  showModal(tr("editProfile"),`
    <input id="editName" value="${d.name}" placeholder="${tr("name")}" style="width:100%;margin:8px 0;padding:10px;border-radius:8px"/>
    <input id="editAbout" value="${d.about}" placeholder="${tr("about")}" style="width:100%;margin:8px 0;padding:10px;border-radius:8px"/>
    <button class="btn" id="saveProfile">${tr("save")}</button>
  `);
  setTimeout(()=>{
    $("#saveProfile").onclick= async ()=>{
      const name=$("#editName").value.trim(); const about=$("#editAbout").value.trim();
      await updateDoc(doc(db,"users",currentUser.uid),{name,about,avatar:name[0].toUpperCase()});
      $("#profileName").textContent=name; $("#profileAvatar").textContent=name[0].toUpperCase();
      $("#modal").classList.add("hidden"); alert(tr("profileUpdated"));
    };
  },100);
};

$("#postStatusBtn").onclick=()=>{
  showModal(tr("postStatus"),`<input id="statusText" placeholder="${tr("whatMind")}" style="width:100%;padding:10px"/><button class="btn" id="saveStatus">${tr("post")}</button>`);
  setTimeout(()=>{
    $("#saveStatus").onclick= async ()=>{
      const text=$("#statusText").value.trim(); if(!text) return;
      await addDoc(collection(db,"status"),{uid:currentUser.uid,text,ts:serverTimestamp()});
      $("#modal").classList.add("hidden");
    };
  },100);
};
function loadStatus(){
  const q=query(collection(db,"status"), orderBy("ts","desc"));
  onSnapshot(q,(snap)=>{
    const list=$("#statusList"); list.innerHTML="";
    snap.forEach(d=>{ const s=d.data(); const li=document.createElement("li"); li.innerHTML=`<div class="avatar">${s.uid.slice(0,2)}</div><div><b>Status</b><br><small>${escapeHtml(s.text)}</small></div>`; list.appendChild(li); });
  });
}

$("#createGroupBtn").onclick=()=>{
  showModal(tr("createGroup"),`<input id="groupName" placeholder="${tr("groupName")}" style="width:100%;padding:10px"/><button class="btn" id="saveGroup">${tr("create")}</button>`);
  setTimeout(()=>{
    $("#saveGroup").onclick= async ()=>{
      const name=$("#groupName").value.trim(); if(!name) return;
      await addDoc(collection(db,"groups"),{name,members:[currentUser.uid],createdBy:currentUser.uid,ts:serverTimestamp()});
      $("#modal").classList.add("hidden");
    };
  },100);
};
function loadGroups(){
  const q=query(collection(db,"groups"), where("members","array-contains",currentUser.uid));
  onSnapshot(q,(snap)=>{ const list=$("#groupList"); list.innerHTML=""; snap.forEach(d=>{ const g=d.data(); const li=document.createElement("li"); li.innerHTML=`<div class="avatar">G</div><div><b>${g.name}</b><br><small>${g.members.length} members</small></div>`; list.appendChild(li); }); });
}

function loadCalls(){ $("#callList").innerHTML=`<li style='padding:15px;color:#8696a0'>${tr("noCalls")}</li>`; }

$("#qrBtn").onclick=()=>{ const url=`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUser.uid}`; showModal(tr("yourQr"),`<img src="${url}" style="width:100%;border-radius:8px"/>`); };
$("#cameraBtn").onclick=()=>{ $("#fileInput").click(); };
$("#plusBtn").onclick=()=>{ showModal("New",`<button class="btn" onclick="document.getElementById('chatSearch').focus();document.getElementById('modal').classList.add('hidden')">💬 ${tr("newChat")}</button><br><br><button class="btn" id="newGroupModal">👥 ${tr("newGroup")}</button>`); setTimeout(()=>{ $("#newGroupModal").onclick=()=>{ $("#modal").classList.add("hidden"); $("#createGroupBtn").click(); }; },100); };
$("#fileInput").onchange=(e)=>{ const file=e.target.files[0]; if(file) alert(`${tr("fileSelected")}: ${file.name}`); };

$$(".settings-list li").forEach(li=>{
  li.onclick=()=>{
    const s=li.dataset.setting;
    if(s==="logout"){ signOut(auth); return; }
    if(s==="account"){ $("#editProfileBtn").click(); return; }
    showModal(li.textContent.trim(),"<p>"+s+" settings coming soon - built.</p>");
  };
});

if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js"); }