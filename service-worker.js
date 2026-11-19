const CACHE = "ddchat-v3";

// === FIREBASE FOR PUSH (Background) ===
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAnau0kpL3bZXC4gZp9EBcAWjOT0SNAYyQ",
  authDomain: "ddchat-e576d.firebaseapp.com",
  projectId: "ddchat-e576d",
  storageBucket: "ddchat-e576d.firebasestorage.app",
  messagingSenderId: "152427416254",
  appId: "1:152427416254:web:e9dd4a5bfa6219a27dacef"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "DDchat - New Message";
  const options = {
    body: payload.notification?.body || "You have a new message 💬",
    icon: './icon-192.png.png',
    badge: './icon-192.png.png',
    vibrate: [200, 100, 200],
    tag: 'ddchat-msg',
    renotify: true,
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => 
      cache.addAll([
        "./",
        "./index.html",
        "./manifest.json",
        "./style.css",
        "./app.js",
        "./appwrite-config.js",
        "./firebase-config.js",
        "./icon-192.png.png",
        "./icon-512.png.png"
      ])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;
  if (
    url.includes('fcm') ||
    url.includes('firebase') ||
    url.includes('translate.googleapis') ||
    url.includes('supabase') ||
    url.includes('appwrite') ||
    url.includes('esm.sh') ||
    url.includes('qrserver') ||
    url.includes('tesseract') ||
    url.includes('jsqr') ||
    url.includes('gstatic')
  ) {
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => cached || caches.match("./index.html"));
      })
  );
});