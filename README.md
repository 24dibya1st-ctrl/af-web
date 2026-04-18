# af-web

AF AI Chat scaffold with:
- ChatGPT-style UI (Option 1)
- Step 2 auth flow (signup/login/logout + protected chat route)
- Step 3 real chat flow (Gemini + Firestore persistence)
- Step 4 free-tier usage limit (20 messages/day + upgrade prompt)
- Step 6 usage UX (progress bar + remaining count + Pro status)

## Step 2 setup (Firebase)

**Option A — deployed on Firebase Hosting (recommended)**  
After you deploy, the app loads config automatically from `/__/firebase/init.json`. You do not need to paste keys into the repo.

**Option B — local dev (`python3 -m http.server`) — recommended**  
Copy `firebase-config.example.js` → **`firebase-config.js`** and paste your Firebase web config from **Project settings → Web app**. That file is **gitignored** and **not deployed**. Then open `http://localhost:8000/login.html` — signup/login will work locally.

**Option C — edit repo file**  
Edit `firebase.js` and replace every `REPLACE_WITH_...` value with your Firebase web app config from **Project settings**:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

Also make sure in Firebase Console:
- Authentication -> Sign-in method -> **Email/Password enabled**
- Firestore database is created

## Step 3 setup (real AI + saved chat)

1. **Gemini API key**

   **Production / real users:** After login, click **AI key** and paste their own key from [Google AI Studio](https://aistudio.google.com/apikey). Stored in **`localStorage`** only for that browser.

   **Local testing without typing the key each time:** Copy `secrets.example.js` → `secrets.js`, put your **new rotated** API key in `GEMINI_API_KEY_DEV`. File `secrets.js` is **gitignored** and **not deployed** to Hosting. Never commit secrets.

   If you pasted a key in chat anywhere, **revoke it** in Google Cloud and create a **new** key — treat the old one as leaked.

2. In Firebase Console, keep Firestore enabled.

Firestore structure used:

`users/{uid}/conversations/{conversationId}`
- `title`
- `createdAt`
- `updatedAt`

`users/{uid}/conversations/{conversationId}/messages/{messageId}`
- `role` (`user` or `assistant`)
- `text`
- `createdAt`

## Run web app

```bash
python3 -m http.server 8000
```

Open:
- Login page: `http://localhost:8000/login.html`
- Chat page: `http://localhost:8000/index.html`

## Firebase Hosting deploy (fixes 404 on web.app)

Project is set to:
- `af-ai-store-f0761e`

Hosting config files are already included:
- `.firebaserc`
- `firebase.json` (static files are served as files; no catch-all rewrite that breaks `login.html` / JS)

Deploy commands:

```bash
firebase login
firebase use af-ai-store-f0761e
firebase deploy --only hosting,firestore
```

Deploy includes **Firestore security rules** (`firestore.rules`). Without deploying rules, chat and usage saves can fail with **permission denied** for real users.

After successful deploy, open:
- `https://af-ai-store-f0761e.web.app`
- `https://af-ai-store-f0761e.firebaseapp.com`

If you still see **404**, the site has not been deployed to this project yet — run the deploy commands above from this repository root.

## Step 2 behavior

- Signup with email/password on `login.html`
- Login with email/password on `login.html`
- Unauthenticated users visiting `index.html` are redirected to `login.html`
- Logged-in users are redirected away from `login.html` to `index.html`
- Logout button in chat top bar signs out and redirects to `login.html`

## Step 3 behavior

- Sidebar shows user conversations loaded from Firestore
- Creating/selecting a chat loads saved messages
- Sending a message:
  - stores user message in Firestore
  - sends prompt to Gemini API
  - stores AI response in Firestore
  - renders both in chat UI

## Step 5 behavior (real-time sidebar improvements)

- Chat list updates in real-time with Firestore listeners
- Sidebar entries show:
  - chat title
  - last message preview
  - updated timestamp
- Conversations reorder automatically by latest activity (`updatedAt`)
- Message list remains real-time for active conversation

## Step 6 behavior (usage UX + Pro status)

- Top bar now shows:
  - current plan badge (`Free` or `Pro`)
  - usage summary text
  - remaining messages for free users
  - visual usage progress bar
- If usage document plan is `pro`, the app:
  - shows `Pro plan active`
  - removes daily message blocking
  - hides upgrade CTA
- Firestore usage document supports:
  - `day` (`YYYY-MM-DD`)
  - `count` (daily used)
  - `plan` (`free` or `pro`)

## Step 4 behavior (20/day limit)

- Free plan includes **20 user messages/day**
- Usage is tracked in Firestore:
  - `users/{uid}/usage/daily` with fields:
    - `day` (`YYYY-MM-DD`, UTC)
    - `count` (number of user messages sent today)
    - `plan` (`free` default, optional `pro`)
- On each send attempt:
  - app increments usage count in a Firestore transaction
  - if count exceeds 20, send is blocked
- UI shows:
  - remaining messages today
  - progress bar
  - `Upgrade to Pro` button (UI placeholder)
- When limit is reached:
  - input + send are disabled
  - upgrade panel becomes prominent

## Existing Firebase project values

- Project ID: `af-ai-store-f0761e`
- Site name: `af-ai-store-f0761e`
- Live URL: `https://af-ai-store-f0761e.web.app`
- Alternate URL: `https://af-ai-store-f0761e.firebaseapp.com`