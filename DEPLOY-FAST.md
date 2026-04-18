# Fast fix: 404 on Firebase Hosting

## Cause (most common)

Deployment never reached this Hosting site, or deploy ran from the wrong folder.

## Fix in 3 commands

Run from **this repo root** (same folder as `firebase.json`):

```bash
firebase login
firebase use af-ai-store-f0761e
npm run deploy
```

Or:

```bash
firebase deploy --only hosting,firestore --project af-ai-store-f0761e
```

## Verify immediately

```bash
curl -I https://af-ai-store-f0761e.web.app/login.html
```

Expect: `HTTP/2 200` (not `404`).

## Still 404?

1. Confirm Hosting site ID in Firebase Console matches `firebase.json` → `hosting.site` (`af-ai-store-f0761e`).
2. Run deploy with debug and check the Hosting release URL printed at the end:

```bash
firebase deploy --only hosting --project af-ai-store-f0761e --debug
```

3. Run local check **before** deploy:

```bash
npm run verify:hosting
```

---

## Deploy from GitHub (no local login each time)

1. On your PC once: `firebase login:ci` → copy the token.
2. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `FIREBASE_TOKEN`
   - Value: paste token
3. **Actions** tab → workflow **Deploy Firebase** → **Run workflow**

The workflow deploys Hosting + Firestore using that token (see `.github/workflows/deploy-firebase.yml`).
