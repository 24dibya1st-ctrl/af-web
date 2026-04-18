import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/**
 * Replace with your Firebase web app config from the console, or leave placeholders
 * and deploy to Firebase Hosting — config is then loaded from /__/firebase/init.json.
 */
const manualFirebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID",
};

const DEFAULT_PROJECT_ID = "af-ai-store-f0761e";

function isPlaceholder(value) {
  return (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("REPLACE_WITH_")
  );
}

function manualConfigLooksComplete(config) {
  return (
    !isPlaceholder(config.apiKey) &&
    !isPlaceholder(config.projectId) &&
    !isPlaceholder(config.appId)
  );
}

async function fetchHostingFirebaseConfig() {
  try {
    const response = await fetch("/__/firebase/init.json", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data && typeof data === "object" && data.apiKey && data.projectId) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function buildFallbackConfig() {
  return {
    apiKey: "",
    authDomain: `${DEFAULT_PROJECT_ID}.firebaseapp.com`,
    projectId: DEFAULT_PROJECT_ID,
    storageBucket: `${DEFAULT_PROJECT_ID}.appspot.com`,
    messagingSenderId: "",
    appId: "",
  };
}

async function resolveFirebaseConfig() {
  const hostingConfig = await fetchHostingFirebaseConfig();
  if (hostingConfig) {
    return hostingConfig;
  }

  if (manualConfigLooksComplete(manualFirebaseConfig)) {
    return { ...manualFirebaseConfig };
  }

  const fallback = buildFallbackConfig();
  if (!isPlaceholder(manualFirebaseConfig.apiKey)) {
    return { ...fallback, ...manualFirebaseConfig };
  }

  return null;
}

export let app = null;
export let auth = null;
export let db = null;

async function bootstrapFirebase() {
  const config = await resolveFirebaseConfig();

  if (!config || isPlaceholder(config.apiKey)) {
    return;
  }

  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

await bootstrapFirebase();

export function isFirebaseConfigured() {
  return Boolean(auth && db);
}

export function requireAuth() {
  return new Promise((resolve) => {
    if (!auth) {
      resolve(null);
      return;
    }
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "login.html";
        resolve(null);
        return;
      }
      resolve(user);
    });
  });
}

export function redirectIfAuthenticated() {
  if (!auth) {
    return;
  }
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "index.html";
    }
  });
}

export async function logoutUser() {
  if (!auth) {
    window.location.href = "login.html";
    return;
  }
  await signOut(auth);
  window.location.href = "login.html";
}
