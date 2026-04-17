import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

function showError(targetId, message) {
  const node = document.getElementById(targetId);
  if (!node) {
    return;
  }
  node.textContent = message;
}

function clearError(targetId) {
  showError(targetId, "");
}

export function initLoginPage() {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (!signupForm || !loginForm) {
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "index.html";
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError("signupError");
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "index.html";
    } catch (error) {
      showError("signupError", error.message || "Signup failed.");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError("loginError");
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "index.html";
    } catch (error) {
      showError("loginError", error.message || "Login failed.");
    }
  });
}

export function requireAuthForChat() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      resolve(user);
    });
  });
}

export async function logoutCurrentUser() {
  await signOut(auth);
  window.location.href = "login.html";
}
