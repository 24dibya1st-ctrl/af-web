import { auth, isFirebaseConfigured } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

function showStatus(message) {
  const status = document.getElementById("authStatus");
  if (status) {
    status.textContent = message;
  }
}

export function onAuthStateChangedSafe(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signOutSafe() {
  if (!auth) {
    window.location.href = "login.html";
    return;
  }
  await signOut(auth);
  window.location.href = "login.html";
}

/** Resolves once Firestore-backed session is known; redirects guests to login. */
export function requireAuthForChat() {
  return new Promise((resolve) => {
    if (!auth) {
      resolve(null);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        window.location.href = "login.html";
        resolve(null);
        return;
      }
      resolve(user);
    });
  });
}

export async function logoutCurrentUser() {
  if (!auth) {
    window.location.href = "login.html";
    return;
  }
  await signOut(auth);
  window.location.href = "login.html";
}

function initLoginPage() {
  const authForm = document.getElementById("authForm");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");

  if (!authForm || !loginBtn || !signupBtn || !emailInput || !passwordInput) {
    return;
  }

  if (!isFirebaseConfigured()) {
    showStatus(
      "Firebase is not ready. Deploy to Firebase Hosting (uses auto-config), or paste your web app keys into firebase.js."
    );
    loginBtn.disabled = true;
    signupBtn.disabled = true;
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "index.html";
    }
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("");
    loginBtn.disabled = true;
    signupBtn.disabled = true;
    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );
      window.location.href = "index.html";
    } catch (error) {
      showStatus(error.message || "Login failed.");
    } finally {
      loginBtn.disabled = false;
      signupBtn.disabled = false;
    }
  });

  signupBtn.addEventListener("click", async () => {
    showStatus("");
    loginBtn.disabled = true;
    signupBtn.disabled = true;
    try {
      await createUserWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );
      window.location.href = "index.html";
    } catch (error) {
      showStatus(error.message || "Signup failed.");
    } finally {
      loginBtn.disabled = false;
      signupBtn.disabled = false;
    }
  });
}

initLoginPage();
