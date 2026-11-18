import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAnau0kpL3bZXC4gZp9EBcAWjOT0SNAYyQ",
  authDomain: "ddchat-e576d.firebaseapp.com",
  projectId: "ddchat-e576d",
  storageBucket: "ddchat-e576d.firebasestorage.app",
  messagingSenderId: "152427416254",
  appId: "1:152427416254:web:e9dd4a5bfa6219a27dacef",
  measurementId: "G-EKWK4L88Y4"
};

// REPLACE THIS WITH YOUR VAPID KEY FROM FIREBASE CONSOLE!
export const VAPID_KEY = "PASTE_YOUR_VAPID_KEY_HERE_STARTS_WITH_B";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Lazy messaging - only loads when needed, so app stays FAST!
let messagingInstance = null;

export async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log("Push not supported on this device");
      return null;
    }
    const { getMessaging } = await import("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging.js");
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (e) {
    console.log("Messaging not supported:", e);
    return null;
  }
}

export function getFriendlyAuthError(error) {
  const code = error.code;
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return "Incorrect password. Please try again.";
  }
  if (code === 'auth/email-already-in-use') {
    return "This email is already registered. Please log in instead.";
  }
  if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
    return "No account found with this email address.";
  }
  if (code === 'auth/weak-password') {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code === 'auth/network-request-failed') {
    return "Network error. Please check your internet connection.";
  }
  return "Something went wrong. Please try again.";
}