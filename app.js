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
  const l = localStorage.getItem("ddchat_lang"); if(l && l!=="en") setTimeout(()=>translateApp(l), 80);
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

const BAD_FIX = { "Client en Compte":"Compte", "Compte du client":"Compte" };
const FORCE_FIX = { "QR Code": { "th":"คิวอาร์โค้ด", "zh":"二维码", "fr":"Code QR", "es":"Código QR", "de":"QR-Code" } };
let transCache = JSON.parse(localStorage.getItem("ddchat_trans_v3") || "{}");
async function googleTranslate(text, from, to){
  if(!text || from===to) return text;
  try{
    const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const r=await fetch(url); const j=await r.json();
    let out=""; j[0].forEach(x=>{ if(x[0]) out+=x[0]; });
    return out||text;
  }catch{ return text; }
}
function getNodes(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    const p=n.parentElement; if(!p) return NodeFilter.FILTER_REJECT;
    if(["SCRIPT","STYLE"].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
    if(p.closest("#langList")) return NodeFilter.FILTER_REJECT;
    return n.nodeValue.trim().length>1?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  const a=[];let x;while(x=w.nextNode())a.push(x);return a;
}
async function translateApp(lang){
  if(!lang||lang==="en")return;
  const nodes=getNodes(document.body);
  const need=new Map();
  nodes.forEach(tn=>{
    const p=tn.parentElement; if(!p.dataset.o) p.dataset.o=tn.nodeValue;
    const orig=p.dataset.o; const key=lang+"::"+orig.trim();
    if(transCache[key]){ let t=transCache[key]; if(BAD_FIX[t])t=BAD_FIX[t]; tn.nodeValue=t; }
    else{ if(!need.has(orig))need.set(orig,[]); need.get(orig).push(tn); }
  });
  $$("input[placeholder], textarea[placeholder]").forEach(el=>{
    if(!el.dataset.oPh) el.dataset.oPh=el.placeholder;
    const orig=el.dataset.oPh; const key=lang+"::"+orig.trim();
    if(transCache[key]) el.placeholder=transCache[key];
    else if(orig.trim()){ if(!need.has(orig))need.set(orig,[]); }
  });
  if(need.size){
    for(const o of [...need.keys()]){
      let q=o.trim();
      if(q==="QR Code" && FORCE_FIX["QR Code"][lang]){
        const t=FORCE_FIX["QR Code"][lang];
        transCache[lang+"::"+o.trim()]=t; transCache[lang+"::"+o]=t;
        (need.get(o)||[]).forEach(n=>{ if(n.nodeType===3) n.nodeValue=t; });
        $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.dataset.oPh===o) el.placeholder=t; });
        continue;
      }
      let isAtUser=q.toLowerCase()==="@username";
      if(isAtUser) q="username";
      let t=await googleTranslate(q,"en",lang);
      if(isAtUser) t="@"+t;
      if(BAD_FIX[t])t=BAD_FIX[t];
      transCache[lang+"::"+o.trim()]=t; transCache[lang+"::"+o]=t;
      (need.get(o)||[]).forEach(n=>{ if(n.nodeType===3) n.nodeValue=t; });
      $$("input[placeholder], textarea[placeholder]").forEach(el=>{ if(el.dataset.oPh===o) el.placeholder=t; });
    }
    localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache));
  }
}
new MutationObserver(()=>{ const l=localStorage.getItem("ddchat_lang"); if(l&&l!=="en")translateApp(l); }).observe(document.body,{childList:true,subtree:true});
const savedLang = localStorage.getItem("ddchat_lang");
if(savedLang && savedLang!=="en") setTimeout(()=>translateApp(savedLang), 600);

function renderLanguages(filter="") {
  const ul = $("#langList"); ul.innerHTML = "";
  LANGUAGES.filter(l => l.name.toLowerCase().includes(filter.toLowerCase())).forEach(l => {
    const li = document.createElement("li");
    li.textContent = l.name;
    if (l.code === selectedLang) li.classList.add("selected");
    li.onclick = () => { selectedLang = l.code; $$("#langList li").forEach(x=>x.classList.remove("selected")); li.classList.add("selected"); };
    ul.appendChild(li);
  });
}
renderLanguages();
$("#langSearch").oninput = (e) => renderLanguages(e.target.value);
$("#langContinue").onclick = () => { localStorage.setItem("ddchat_lang", selectedLang); translateApp(selectedLang); showScreen("auth-screen"); };

$("#switchAuth").onclick = (e) => {
  e.preventDefault(); isSignup = !isSignup;
  $("#authTitle").textContent = isSignup ? "Sign Up" : "Log In";
  $("#authBtn").textContent = isSignup ? "Create Account" : "Log In";
  $("#switchText").textContent = isSignup ? "Already have an account?" : "New here?";
  $("#switchAuth").textContent = isSignup ? "Log In" : "Sign Up";
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
      const ddId = Math.floor(10000000 + Math.random()*90000000).toString();
      await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name, username, email, lang: selectedLang, about: "Hey there! I'm using DDchat.", avatar: name[0].toUpperCase(), ddId, phone:"", createdAt: serverTimestamp() });
    } else { await signInWithEmailAndPassword(auth, email, pass); }
  } catch (err) { alert(err.message); }
};

$("#forgotLink").onclick = (e)=>{ e.preventDefault(); showModal("Reset","Contact support: flatking43@gmail.com"); };

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
      const sticky = document.getElementById("profileStickyName");
      if(sticky) sticky.textContent = d.name;
      if(!d.ddId){
        const ddId = Math.floor(10000000 + Math.random()*90000000).toString();
        await updateDoc(doc(db,"users",user.uid),{ddId});
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
    // Reset profile scroll name when switching
    if(btn.dataset.page !== "profile"){
      const sticky = document.getElementById("profileStickyName");
      if(sticky) sticky.style.opacity = "0";
    }
  };
});

function loadChats(){
  if(!currentUser) return;
  const q = query(collection(db, "chats"), where("members","array-contains",currentUser.uid));
  onSnapshot(q,(snap)=>{
    const list=$("#chatList"); list.innerHTML="";
    if(snap.empty){ list.innerHTML="<li style='padding:15px;color:#8696a0'>No chats yet. Search username above to start.</li>"; return; }
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
  if(list.innerHTML==="") list.innerHTML="<li style='padding:15px'>No user found</li>";
};

async function startChat(otherUid){
  const members=[currentUser.uid,otherUid].sort(); const chatId=members.join("_");
  const ref=doc(db,"chats",chatId); const snap=await getDoc(ref);
  if(!snap.exists()) await setDoc(ref,{members,lastMsg:"",unreadCount:{[currentUser.uid]:0,[otherUid]:0},updated:serverTimestamp()}); openChat(chatId,otherUid);
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function openChat(chatId,otherUid){
  currentChatId=chatId; currentChatWith=otherUid; showScreen("chat-view");
  $("#chatTitle").textContent="Chat";
  updateDoc(doc(db,"chats",chatId),{[ `unreadCount.${currentUser.uid}`]:0}).catch(()=>{});
  const myLang = localStorage.getItem("ddchat_lang") || "en";
  const q=query(collection(db,"chats",chatId,"messages"), orderBy("ts"));
  onSnapshot(q,(snap)=>{
    const box=$("#chatMessages"); box.innerHTML="";
    snap.forEach(m=>{
      const d=m.data();
      const div=document.createElement("div");
      div.className="msg "+(d.from===currentUser.uid?"me":"them");
      div.id="msg_"+m.id;
      div.dataset.orig=d.text;
      div.innerHTML=escapeHtml(d.text);
      box.appendChild(div);
      if(!d.text.trim() || myLang==="en") return;
      const cacheKey=myLang+"::msg::"+d.text.trim();
      if(div.querySelector("small")) return;
      const cached=transCache[cacheKey];
      if(cached){
        div.innerHTML=escapeHtml(d.text)+`<br><small style="opacity:0.7;display:block;margin-top:3px">→ ${escapeHtml(cached)}</small>`;
      }else{
        if(div.dataset.fetching) return;
        div.dataset.fetching="1";
        googleTranslate(d.text,"auto",myLang).then(t=>{
          if(!t || t.toLowerCase()===d.text.toLowerCase()) return;
          transCache[cacheKey]=t;
          localStorage.setItem("ddchat_trans_v3",JSON.stringify(transCache));
          const el=document.getElementById("msg_"+m.id);
          if(el && !el.querySelector("small")){
            el.innerHTML=escapeHtml(el.dataset.orig)+`<br><small style="opacity:0.7;display:block;margin-top:3px">→ ${escapeHtml(t)}</small>`;
          }
        });
      }
    });
    box.scrollTop=box.scrollHeight;
  });
}

$("#sendBtn").onclick=sendMessage; $("#messageInput").addEventListener("keypress",(e)=>{ if(e.key==="Enter") sendMessage(); });
async function sendMessage(){
  const text=$("#messageInput").value.trim(); if(!text||!currentChatId) return;
  $("#messageInput").value="";
  await addDoc(collection(db,"chats",currentChatId,"messages"),{from:currentUser.uid,text,ts:serverTimestamp()});
  await updateDoc(doc(db,"chats",currentChatId),{lastMsg:text,updated:serverTimestamp(),[ `unreadCount.${currentChatWith}`]: increment(1)});
}
$("#chatBack").onclick=()=>showScreen("app");

$("#postStatusBtn").onclick=()=>{
  showModal("Post Status",`<input id="statusText" placeholder="What's on your mind?" style="width:100%;padding:10px"/><button class="btn" id="saveStatus">Post</button>`);
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
  showModal("Create Group",`<input id="groupName" placeholder="Group name" style="width:100%;padding:10px"/><button class="btn" id="saveGroup">Create</button>`);
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

function loadCalls(){ $("#callList").innerHTML="<li style='padding:15px;color:#8696a0'>No calls yet. Voice/video calling integration coming (use WebRTC).</li>"; }

// ===== PROFILE TOP BAR - WHATSAPP STYLE =====
document.addEventListener("DOMContentLoaded", ()=>{
  const scrollArea = document.getElementById('profileScrollArea');
  const stickyName = document.getElementById('profileStickyName');
  if(scrollArea && stickyName){
    scrollArea.addEventListener('scroll', ()=>{
      stickyName.style.opacity = scrollArea.scrollTop > 60 ? '1' : '0';
      if(scrollArea.scrollTop > 60){
        const nameEl = document.getElementById('profileName');
        if(nameEl) stickyName.textContent = nameEl.textContent.replace('▼','').trim();
      }
    });
  }
});

// SAFE GLOBAL HANDLERS FOR NEW TOP ICONS
document.addEventListener("click", async (e)=>{
  if(e.target.closest("#topSearchBtn")){
    showModal("Search Settings",`<input id="settingsSearchInput" placeholder="Search settings" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;margin-top:8px"/>`);
    setTimeout(()=>{
      const inp=document.getElementById("settingsSearchInput");
      if(inp){
        inp.focus();
        inp.oninput=(ev)=>{
          const term=ev.target.value.toLowerCase();
          document.querySelectorAll(".settings-list li").forEach(li=>{
            li.style.display= li.textContent.toLowerCase().includes(term) ? "" : "none";
          });
        };
      }
    },80);
  }

  if(e.target.closest("#topQrBtn")){
    if(!currentUser) return alert("Login first");
    let snap=await getDoc(doc(db,"users",currentUser.uid));
    let d=snap.data();
    if(!d.ddId){
      const ddId=Math.floor(10000000+Math.random()*90000000).toString();
      await updateDoc(doc(db,"users",currentUser.uid),{ddId});
      d.ddId=ddId;
    }
    const qrData = `DDCHAT:${d.uid}:${d.ddId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

    showModal("QR Code",`
      <div style="position:relative">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <button class="btn" id="scanLeftBtn" style="padding:8px 12px">📷 Scan</button>
          <button class="btn" id="shareQrTopRight" style="padding:8px 12px">Share</button>
        </div>
        <div style="text-align:center">
          <img id="qrImg" src="${qrUrl}" style="width:220px;height:220px;border-radius:12px;border:1px solid #eee"/>
          <p style="margin:8px 0;font-weight:bold">${d.name}</p>
          <small style="color:#8696a0">DD ID: ${d.ddId}</small>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <input type="file" id="qrUploadInput" accept="image/*" style="display:none"/>
          <button class="btn" id="uploadQrBtn" style="flex:1">Upload QR Image</button>
          <button class="btn" id="resetQrBtn" style="flex:1;background:#ff3b30;color:#fff">Reset Code</button>
        </div>
        <div id="qrResult" style="margin-top:10px;font-size:14px"></div>
        <video id="qrVideo" style="width:100%;display:none;border-radius:12px;margin-top:10px" autoplay playsinline></video>
        <canvas id="qrCanvas" style="display:none"></canvas>
      </div>
    `);

    setTimeout(async ()=>{
      document.getElementById("shareQrTopRight").onclick=async()=>{
        const shareData={title:"My DDchat QR", text:`My DD ID: ${d.ddId}`, url: qrUrl};
        if(navigator.share){
          try{ await navigator.share(shareData); }catch{}
        }else{
          await navigator.clipboard.writeText(qrData);
          alert("QR data copied: "+qrData);
        }
      };

      async function handleScanned(text){
        document.getElementById("qrResult").innerHTML="Scanned: "+escapeHtml(text);
        if(text.includes("DDCHAT:")){
          const parts=text.split(":");
          const uid=parts[1];
          if(uid && uid!==currentUser.uid){
            const usnap=await getDoc(doc(db,"users",uid));
            if(usnap.exists()){
              const u=usnap.data();
              document.getElementById("qrResult").innerHTML+=`<br><b>Found: ${u.name} (@${u.username})</b><br><button class="btn" id="goToAccount">Go to Account - Start Chat</button>`;
              document.getElementById("goToAccount").onclick=()=>{ document.getElementById("modal").classList.add("hidden"); startChat(uid); };
            }
          }
        }
      }

      document.getElementById("uploadQrBtn").onclick=()=> document.getElementById("qrUploadInput").click();
      document.getElementById("qrUploadInput").onchange=async(ev)=>{
        const file=ev.target.files[0]; if(!file) return;
        const fd=new FormData(); fd.append("file",file);
        try{
          const res=await fetch("https://api.qrserver.com/v1/read-qr-code/",{method:"POST",body:fd});
          const json=await res.json();
          const decoded=json[0]?.symbol[0]?.data;
          if(decoded) handleScanned(decoded);
          else document.getElementById("qrResult").textContent="Could not read QR";
        }catch{ document.getElementById("qrResult").textContent="Scan failed"; }
      };

      document.getElementById("scanLeftBtn").onclick=async()=>{
        const video=document.getElementById("qrVideo");
        video.style.display="block";
        try{
          const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
          video.srcObject=stream;
          if("BarcodeDetector" in window){
            const detector=new BarcodeDetector({formats:["qr_code"]});
            const interval=setInterval(async()=>{
              try{
                const codes=await detector.detect(video);
                if(codes.length){ clearInterval(interval); stream.getTracks().forEach(t=>t.stop()); video.style.display="none"; handleScanned(codes[0].rawValue); }
              }catch{}
            },500);
          }else{
            document.getElementById("qrResult").textContent="Camera opened - use Upload if not detected.";
          }
        }catch(err){ document.getElementById("qrResult").textContent="Camera permission denied"; }
      };

      document.getElementById("resetQrBtn").onclick=async()=>{
        const newDdId=Math.floor(10000000+Math.random()*90000000).toString();
        await updateDoc(doc(db,"users",currentUser.uid),{ddId:newDdId});
        const newData=`DDCHAT:${currentUser.uid}:${newDdId}`;
        const newUrl=`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(newData)}`;
        document.getElementById("qrImg").src=newUrl;
        document.getElementById("qrResult").innerHTML=`New DD ID: ${newDdId} - QR reset done`;
      };
    },100);
  }

  if(e.target.closest("#topEditBtn")){
    if(!currentUser) return;
    let snap=await getDoc(doc(db,"users",currentUser.uid));
    let d=snap.data();
    if(!d.ddId){
      const ddId=Math.floor(10000000+Math.random()*90000000).toString();
      await updateDoc(doc(db,"users",currentUser.uid),{ddId});
      d.ddId=ddId;
    }
    showModal("Edit Profile",`
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="text-align:center"><div class="avatar" id="editAvatarPreview" style="width:70px;height:70px;font-size:30px;margin:auto">${d.avatar || d.name[0]}</div>
        <input type="file" id="photoInput" accept="image/*" style="margin-top:8px"/></div>
        <label>Name</label>
        <input id="editName" value="${escapeHtml(d.name)}" placeholder="Name" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd"/>
        <label>About</label>
        <textarea id="editAbout" placeholder="About" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd">${escapeHtml(d.about||"")}</textarea>
        <label>Phone</label>
        <input id="editPhone" value="${escapeHtml(d.phone||"")}" placeholder="Phone" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd"/>
        <label>Email area</label>
        <input id="editEmailArea" value="${escapeHtml(d.email||"")}" placeholder="Email" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd" disabled/>
        <small style="color:#8696a0">Email cannot be changed - it's your login</small>
        <label>DD ID</label>
        <input id="editDdId" value="${d.ddId}" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;background:#f5f5f5" disabled/>
        <small style="color:#8696a0">DD ID is random numbers only - system generated</small>
        <button class="btn" id="saveProfileNew" style="margin-top:8px">Save Changes</button>
      </div>
    `);
    setTimeout(()=>{
      let newAvatarLetter = d.avatar;
      document.getElementById("photoInput").onchange=(ev)=>{
        const file=ev.target.files[0]; if(!file) return;
        newAvatarLetter=file.name[0].toUpperCase();
        document.getElementById("editAvatarPreview").textContent=newAvatarLetter;
      };
      document.getElementById("saveProfileNew").onclick=async()=>{
        const name=document.getElementById("editName").value.trim();
        const about=document.getElementById("editAbout").value.trim();
        const phone=document.getElementById("editPhone").value.trim();
        if(!name) return alert("Name required");
        await updateDoc(doc(db,"users",currentUser.uid),{name, about, phone, avatar:newAvatarLetter || name[0].toUpperCase()});
        document.getElementById("profileName").textContent=name;
        document.getElementById("profileAvatar").textContent=newAvatarLetter || name[0].toUpperCase();
        const sticky = document.getElementById("profileStickyName");
        if(sticky) sticky.textContent=name;
        document.getElementById("modal").classList.add("hidden");
      };
    },100);
  }
});

$$(".settings-list li").forEach(li=>{
  li.onclick=()=>{
    const s=li.dataset.setting;
    if(s==="logout"){ signOut(auth); return; }
    if(s==="account"){
      document.getElementById("topEditBtn")?.click();
      return;
    }
    showModal(li.textContent.trim(),"<p>"+s+" settings coming soon - built.</p>");
  };
});

if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js"); }