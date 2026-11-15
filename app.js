import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, where,
  orderBy, doc, setDoc, getDoc, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- State ---------- */
let currentUser = null;
let currentChatId = null;
let currentChatWith = null;
let isSignup = true;
let selectedLang = "en";

/* ---------- Helpers ---------- */
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

/* ---------- Splash → Language ---------- */
setTimeout(() => showScreen("language-screen"), 2200);

/* ---------- Languages (sample; expand as needed) ---------- */
const LANGUAGES = [
  { code:"en", name:"English" }, { code:"es", name:"Spanish" },
  { code:"fr", name:"French" }, { code:"de", name:"German" },
  { code:"pt", name:"Portuguese" }, { code:"zh", name:"Chinese" },
  { code:"hi", name:"Hindi" }, { code:"ar", name:"Arabic" },
  { code:"ru", name:"Russian" }, { code:"ja", name:"Japanese" },
  { code:"ko", name:"Korean" }, { code:"sw", name:"Swahili" },
  { code:"yo", name:"Yoruba" }, { code:"ig", name:"Igbo" },
  { code:"ha", name:"Hausa" }, { code:"it", name:"Italian" },
  { code:"tr", name:"Turkish" }, { code:"id", name:"Indonesian" }
];
function renderLanguages(filter="") {
  const ul = $("#langList");
  ul.innerHTML = "";
  LANGUAGES
    .filter(l => l.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(l => {
      const li = document.createElement("li");
      li.textContent = l.name;
      if (l.code === selectedLang) li.classList.add("selected");
      li.onclick = () => {
        selectedLang = l.code;
        $$("#langList li").forEach(x => x.classList.remove("selected"));
        li.classList.add("selected");
      };
      ul.appendChild(li);
    });
}
renderLanguages();
$("#langSearch").oninput = (e) => renderLanguages(e.target.value);
$("#langContinue").onclick = () => {
  localStorage.setItem("ddchat_lang", selectedLang);
  showScreen("auth-screen");
};

/* ---------- Auth ---------- */
$("#switchAuth").onclick = (e) => {
  e.preventDefault();
  isSignup = !isSignup;
  $("#authTitle").textContent = isSignup ? "Sign Up" : "Log In";
  $("#authBtn").textContent = isSignup ? "Create Account" : "Log In";
  $("#switchText").textContent = isSignup ? "Already have an account?" : "New here?";
  $("#switchAuth").textContent = isSignup ? "Log In" : "Sign Up";
  $("#authName").style.display = isSignup ? "block" : "none";
  $("#authUsername").style.display = isSignup ? "block" : "none";
  $("#forgotLink").style.display = isSignup ? "none" : "block";
};

$("#authBtn").onclick = async () => {
  const email = $("#authEmail").value.trim();
  const pass = $("#authPassword").value;
  if (!email || !pass) return alert("Enter email and password");
  try {
    if (isSignup) {
      const name = $("#authName").value.trim();
      const username = $("#authUsername").value.trim().toLowerCase();
      if (!name || !username) return alert("Name & username required");
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, name, username, email,
        lang: selectedLang, about: "Hey there! I'm using DDchat.",
        createdAt: serverTimestamp()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (err) {
    alert(err.message);
  }
};

$("#forgotLink").onclick = (e) => {
  e.preventDefault();
  showModal("Reset Password", "<p>Email flatking43@gmail.com from your registered email with subject 'Password Reset'.</p>");
};

/* ---------- Auth state ---------- */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      $("#profileName").textContent = d.name;
      $("#profileUsername").textContent = "@" + d.username;
      $("#profileAvatar").textContent = d.name[0].toUpperCase();
    }
    showScreen("app");
    loadChats();
  } else {
    currentUser = null;
    showScreen("auth-screen");
  }
});

/* ---------- Bottom Nav ---------- */
$$("#bottomnav button").forEach(btn => {
  btn.onclick = () => {
    $$("#bottomnav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $$(".page").forEach(p => p.classList.remove("active"));
    $("#page-" + btn.dataset.page).classList.add("active");
    $("#topTitle").textContent =
      btn.dataset.page === "chats" ? "DDchat" :
      btn.dataset.page.charAt(0).toUpperCase() + btn.dataset.page.slice(1);
  };
});

/* ---------- Load Chats ---------- */
function loadChats() {
  if (!currentUser) return;
  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", currentUser.uid)
  );
  onSnapshot(q, (snap) => {
    const list = $("#chatList");
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = "<li style='color:#8696a0'>No chats yet. Search above to find someone.</li>";
      return;
    }
    snap.forEach(d => {
      const data = d.data();
      const other = data.members.find(m => m !== currentUser.uid);
      const li = document.createElement("li");
      li.innerHTML = `<div class="avatar">${(data.lastMsg||"?")[0].toUpperCase()}</div>
                      <div><b>${other.slice(0,6)}...</b><br><small>${data.lastMsg||"Start chatting"}</small></div>`;
      li.onclick = () => openChat(d.id, other);
      list.appendChild(li);
    });
  });
}

/* ---------- Search contacts ---------- */
$("#chatSearch").oninput = async (e) => {
  const term = e.target.value.trim().toLowerCase();
  if (term.length < 2) { loadChats(); return; }
  const q1 = query(collection(db, "users"), where("username", "==", term));
  const snap = await new Promise(r => {
    onSnapshot(q1, r);
  });
  const list = $("#chatList");
  list.innerHTML = "";
  snap.forEach(d => {
    const u = d.data();
    if (u.uid === currentUser.uid) return;
    const li = document.createElement("li");
    li.innerHTML = `<div class="avatar">${u.name[0]}</div>
                    <div><b>${u.name}</b><br><small>@${u.username}</small></div>`;
    li.onclick = () => startChat(u.uid);
    list.appendChild(li);
  });
};

async function startChat(otherUid) {
  const members = [currentUser.uid, otherUid].sort();
  const chatId = members.join("_");
  const ref = doc(db, "chats", chatId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { members, lastMsg: "", updated: serverTimestamp() });
  }
  openChat(chatId, otherUid);
}

/* ---------- Open Chat ---------- */
function openChat(chatId, otherUid) {
  currentChatId = chatId;
  currentChatWith = otherUid;
  showScreen("chat-view");
  $("#chatTitle").textContent = "Chat";
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("ts")
  );
  onSnapshot(q, (snap) => {
    const box = $("#chatMessages");
    box.innerHTML = "";
    snap.forEach(m => {
      const d = m.data();
      const div = document.createElement("div");
      div.className = "msg " + (d.from === currentUser.uid ? "me" : "them");
      div.innerHTML = `${escapeHtml(d.text)}
        <span class="translate-btn" data-text="${escapeHtml(d.text)}">🌐</span>`;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

/* ---------- Translate (free API) ---------- */
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("translate-btn")) {
    const text = e.target.dataset.text;
    const target = localStorage.getItem("ddchat_lang") || "en";
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${target}`);
      const j = await r.json();
      alert("Translated: " + (j.responseData?.translatedText || text));
    } catch {
      alert("Translation failed");
    }
  }
});

/* ---------- Send message ---------- */
$("#sendBtn").onclick = sendMessage;
$("#messageInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
async function sendMessage() {
  const text = $("#messageInput").value.trim();
  if (!text || !currentChatId) return;
  $("#messageInput").value = "";
  await addDoc(collection(db, "chats", currentChatId, "messages"), {
    from: currentUser.uid, text, ts: serverTimestamp()
  });
  await updateDoc(doc(db, "chats", currentChatId), {
    lastMsg: text, updated: serverTimestamp()
  });
}

/* ---------- Back from chat ---------- */
$("#chatBack").onclick = () => showScreen("app");

/* ---------- Profile settings routes ---------- */
$$(".settings-list li").forEach(li => {
  li.onclick = () => {
    const s = li.dataset.setting;
    if (s === "logout") { signOut(auth); return; }
    showModal(
      li.textContent.trim().replace("","").trim(),
      "<p>This section is ready for you to build out. All controls described in your spec can be added here.</p>"
    );
  };
});

/* ---------- QR (simple) ---------- */
$("#qrBtn").onclick = () => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUser.uid}`;
  showModal("Your QR Code", `<img src="${url}" style="width:100%;border-radius:8px" />`);
};

/* ---------- Camera ---------- */
$("#cameraBtn").onclick = () => {
  showModal("Camera / QR", `
    <p>Choose:</p>
    <button class="btn" onclick="document.getElementById('fileInput').click()">📷 Upload Photo</button>
    <button class="btn" onclick="alert('QR scanner ready to integrate (use html5-qrcode library)')">🔍 Scan QR</button>
  `);
};

/* ---------- Plus button ---------- */
$("#plusBtn").onclick = () => {
  showModal("New", `
    <button class="btn" onclick="alert('Search bar above does this')">💬 New Chat</button>
    <button class="btn" onclick="alert('Create Group coming soon')">👥 New Group</button>
  `);
};

/* ---------- Splash → set theme ---------- */
if (localStorage.getItem("ddchat_lang")) {
  selectedLang = localStorage.getItem("ddchat_lang");
}

/* ---------- PWA service worker ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}