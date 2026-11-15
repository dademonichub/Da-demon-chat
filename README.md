# DDchat

A global messaging app with auto-translation, groups, status, and calls.

## Setup (5 minutes)

1. Create a free Firebase project at https://console.firebase.google.com
2. Enable **Authentication → Email/Password**
3. Enable **Firestore Database** (test mode)
4. Copy your config into `firebase-config.js`
5. Push to GitHub
6. Enable **GitHub Pages** in repo Settings → Pages → main branch

Your app will be live at:
`https://YOUR-USERNAME.github.io/ddchat/`

## What works now
- ✅ Signup / Login
- ✅ Language select
- ✅ Real-time chat (1-to-1)
- ✅ User search by username
- ✅ QR code generation
- ✅ Auto-translation (MyMemory API — free)
- ✅ Profile, settings scaffold
- ✅ PWA installable

## What to add next
- Groups (Firestore: `groups` collection)
- Status / stories (Firestore `status` with 24h TTL)
- WebRTC calls (use PeerJS or Daily.co free tier)
- File & image uploads (Firebase Storage)
- Push/email notifications (Firebase Functions + Nodemailer)
- Tawk.to live chat in Help section
