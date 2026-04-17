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
  return onAuthStateChanged(auth, callback);
}

export async function signOutSafe() {
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
    showStatus("Firebase is not configured yet. Update firebase.js first.");
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
