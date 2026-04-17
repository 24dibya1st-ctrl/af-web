# af-web

AF AI Chat scaffold with:
- ChatGPT-style UI (Option 1)
- Firebase setup hooks
- Step 2 auth flow (signup/login/logout + protected chat route)

## Step 2 setup (complete this first)

Edit `firebase.js` and replace placeholder values in `firebaseConfig` with your real Firebase web app config:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

Also make sure in Firebase Console:
- Authentication -> Sign-in method -> **Email/Password enabled**
- Firestore database is created (for next steps)

## Run web app

```bash
python3 -m http.server 8000
```

Open:
- Login page: `http://localhost:8000/login.html`
- Chat page: `http://localhost:8000/index.html`

## Step 2 behavior

- Signup with email/password on `login.html`
- Login with email/password on `login.html`
- Unauthenticated users visiting `index.html` are redirected to `login.html`
- Logged-in users are redirected away from `login.html` to `index.html`
- Logout button in chat top bar signs out and redirects to `login.html`

## Existing Firebase project values

- Project ID: `af-ai-store-f0761e`
- Site name: `af-ai-store-f0761e`
- Live URL: `https://af-ai-store-f0761e.web.app`
- Alternate URL: `https://af-ai-store-f0761e.firebaseapp.com`