import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// NEW: Helper to hide Firebase name
export function getFriendlyAuthError(error) {
  const code = error.code;
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return "Password no correct. Try again.";
  }
  if (code === 'auth/email-already-in-use') {
    return "This email don already register. Try login.";
  }
  if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
    return "No account with this email.";
  }
  if (code === 'auth/weak-password') {
    return "Password too short. Use 6+ characters.";
  }
  if (code === 'auth/network-request-failed') {
    return "Network slow. Check internet.";
  }
  // Default - no Firebase word
  return "Something no work. Try again.";
}