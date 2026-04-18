import { FIREBASE_WEB_CONFIG_KEY } from "./firebase-config-constants.js";

const jsonInput = document.getElementById("firebaseJson");
const saveBtn = document.getElementById("saveFirebaseConfig");
const clearBtn = document.getElementById("clearFirebaseConfig");
const statusEl = document.getElementById("setupStatus");

function showStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `setup-status ${isError ? "err" : "ok"}`;
}

function normalizeConfig(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Must be a JSON object.");
  }
  const apiKey = String(raw.apiKey || "").trim();
  const projectId = String(raw.projectId || "").trim();
  const appId = String(raw.appId || "").trim();
  if (!apiKey || !projectId || !appId) {
    throw new Error("Need apiKey, projectId, and appId (copy full object from Firebase Console).");
  }
  return {
    apiKey,
    authDomain: String(raw.authDomain || "").trim() || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      String(raw.storageBucket || "").trim() || `${projectId}.appspot.com`,
    messagingSenderId: String(raw.messagingSenderId || "").trim(),
    appId,
  };
}

saveBtn?.addEventListener("click", () => {
  showStatus("");
  try {
    const text = jsonInput?.value?.trim() || "";
    if (!text) {
      showStatus("Paste your Firebase web app JSON here.", true);
      return;
    }
    const parsed = JSON.parse(text);
    const cfg = normalizeConfig(parsed);
    localStorage.setItem(FIREBASE_WEB_CONFIG_KEY, JSON.stringify(cfg));
    showStatus("Saved. Redirecting…");
    window.location.href = "login.html";
  } catch (err) {
    showStatus(err.message || "Invalid JSON.", true);
  }
});

clearBtn?.addEventListener("click", () => {
  localStorage.removeItem(FIREBASE_WEB_CONFIG_KEY);
  if (jsonInput) jsonInput.value = "";
  showStatus("Removed saved config from this browser.");
});
