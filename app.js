import { requireAuthForChat, logoutCurrentUser } from "./auth.js";
import { db, isFirebaseConfigured } from "./firebase.js";
import { generateAiReply, getGeminiApiKey, setGeminiApiKey } from "./ai.js";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const newChatBtn = document.getElementById("newChatBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatHistory = document.getElementById("chatHistory");
const chatArea = document.getElementById("chatArea");
const typingIndicator = document.getElementById("typingIndicator");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const usageBadge = document.getElementById("usageBadge");
const usageProgressFill = document.getElementById("usageProgressFill");
const usageProgressText = document.getElementById("usageProgressText");
const usageRemainingText = document.getElementById("usageRemainingText");
const planBadge = document.getElementById("planBadge");
const limitNotice = document.getElementById("limitNotice");
const upgradeBtn = document.getElementById("upgradeBtn");
const geminiSetupBtn = document.getElementById("geminiSetupBtn");
const geminiBanner = document.getElementById("geminiBanner");
const geminiBannerBtn = document.getElementById("geminiBannerBtn");
const geminiModal = document.getElementById("geminiModal");
const geminiModalBackdrop = document.getElementById("geminiModalBackdrop");
const geminiModalClose = document.getElementById("geminiModalClose");
const geminiKeyInput = document.getElementById("geminiKeyInput");
const geminiSaveBtn = document.getElementById("geminiSaveBtn");
const geminiKeyStatus = document.getElementById("geminiKeyStatus");

let currentUser = null;
let activeChatId = null;
let unsubscribeMessages = null;
let unsubscribeChats = null;
let unsubscribeUsage = null;
let localChats = [];
const FREE_DAILY_LIMIT = 20;
let todaysUsage = 0;
let usageBlocked = false;
let activeChatMessages = [];
let currentPlan = "free";
let geminiBlocked = true;

function hasGeminiKey() {
  return Boolean(getGeminiApiKey());
}

function syncGeminiUi() {
  geminiBlocked = !hasGeminiKey();
  if (geminiBanner) {
    geminiBanner.classList.toggle("hidden", !geminiBlocked);
  }
  if (geminiKeyInput && hasGeminiKey()) {
    geminiKeyInput.value = "";
    geminiKeyInput.placeholder = "Key saved — enter a new key to replace";
  }
  chatForm?.classList.toggle("blocked-no-key", geminiBlocked);
  if (geminiBlocked && messageInput && !usageBlocked) {
    messageInput.placeholder = "Add Gemini API key first (AI key button)…";
  } else if (messageInput && !usageBlocked) {
    messageInput.placeholder = "Message AF AI Chat…";
  }
  updateSendDisabledState();
}

function updateSendDisabledState() {
  const blocked = usageBlocked || geminiBlocked;
  messageInput.disabled = blocked;
  sendBtn.disabled = blocked;
}

function openGeminiModal() {
  if (!geminiModal) {
    return;
  }
  geminiModal.classList.remove("hidden");
  if (geminiKeyStatus) {
    geminiKeyStatus.textContent = "";
    geminiKeyStatus.className = "modal-status";
  }
  if (geminiKeyInput) {
    geminiKeyInput.focus();
  }
}

function closeGeminiModal() {
  geminiModal?.classList.add("hidden");
}

function saveGeminiKeyFromModal() {
  const raw = geminiKeyInput?.value?.trim() || "";
  if (!raw) {
    if (geminiKeyStatus) {
      geminiKeyStatus.textContent = "Paste your API key, or close and use another device.";
      geminiKeyStatus.className = "modal-status err";
    }
    return;
  }
  setGeminiApiKey(raw);
  if (geminiKeyStatus) {
    geminiKeyStatus.textContent = "Saved. You can chat now.";
    geminiKeyStatus.className = "modal-status ok";
  }
  syncGeminiUi();
  setTimeout(() => closeGeminiModal(), 600);
}

function scrollToLatest() {
  chatArea.scrollTo({
    top: chatArea.scrollHeight,
    behavior: "smooth",
  });
}

function autoGrowInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function setUsageState(used, plan = currentPlan) {
  currentPlan = plan;
  todaysUsage = used;
  const isPro = currentPlan === "pro";
  usageBlocked = !isPro && todaysUsage >= FREE_DAILY_LIMIT;

  const clampedUsage = Math.min(todaysUsage, FREE_DAILY_LIMIT);
  const remaining = Math.max(FREE_DAILY_LIMIT - clampedUsage, 0);
  const progressPercent = Math.min((clampedUsage / FREE_DAILY_LIMIT) * 100, 100);

  usageBadge.textContent = isPro
    ? "Pro plan active"
    : `${clampedUsage} / ${FREE_DAILY_LIMIT} today`;
  usageBadge.classList.toggle("pro", isPro);
  if (usageProgressFill) {
    usageProgressFill.style.width = `${isPro ? 100 : progressPercent}%`;
    usageProgressFill.classList.toggle("pro", isPro);
    usageProgressFill.classList.toggle("near-limit", !isPro && clampedUsage >= 16 && clampedUsage < FREE_DAILY_LIMIT);
    usageProgressFill.classList.toggle("at-limit", !isPro && clampedUsage >= FREE_DAILY_LIMIT);
  }
  if (usageProgressText) {
    usageProgressText.textContent = isPro
      ? "Pro — unlimited messages"
      : `${clampedUsage} / ${FREE_DAILY_LIMIT} used today`;
  }
  if (usageRemainingText) {
    usageRemainingText.textContent = isPro
      ? "No daily cap"
      : `${remaining} free messages left`;
  }
  planBadge.textContent = isPro ? "Plan: Pro" : "Plan: Free";
  planBadge.classList.toggle("pro", isPro);

  upgradeBtn.classList.toggle("hidden", isPro);
  limitNotice.classList.toggle("hidden", !usageBlocked);
  updateSendDisabledState();
}

function disableInputTemporarily(disabled) {
  messageInput.disabled = disabled || usageBlocked || geminiBlocked;
  sendBtn.disabled = disabled || usageBlocked || geminiBlocked;
}

function renderMessage(role, text) {
  const message = document.createElement("article");
  message.className = `message ${role}`;

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  message.appendChild(content);

  if (role === "assistant") {
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy-btn";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = "Copied";
      } catch (_error) {
        copyButton.textContent = "Failed";
      }
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1200);
    });
    message.appendChild(copyButton);
  }

  chatArea.appendChild(message);
  scrollToLatest();
}

function showTypingIndicator() {
  typingIndicator.classList.remove("hidden");
  scrollToLatest();
}

function hideTypingIndicator() {
  typingIndicator.classList.add("hidden");
}

function renderHistory() {
  chatHistory.innerHTML = "";
  localChats.forEach((chat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-history-item";
    if (chat.id === activeChatId) {
      button.classList.add("active");
    }
    button.dataset.chatId = chat.id;

    const titleNode = document.createElement("p");
    titleNode.className = "chat-history-title";
    titleNode.textContent = chat.title;

    const previewNode = document.createElement("p");
    previewNode.className = "chat-history-preview";
    previewNode.textContent = chat.lastMessage || "No messages yet";

    button.appendChild(titleNode);
    button.appendChild(previewNode);
    chatHistory.appendChild(button);
  });
}

async function incrementUsageOrThrow() {
  const usageDocRef = doc(db, "users", currentUser.uid, "usage", "daily");
  const today = getTodayKey();

  const usageState = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(usageDocRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const currentDay = data.day || data.dateKey || "";
    const currentCount = typeof data.count === "number" ? data.count : 0;
    const plan = data.plan === "pro" ? "pro" : "free";
    const baseCount = currentDay === today ? currentCount : 0;

    if (plan !== "pro" && baseCount >= FREE_DAILY_LIMIT) {
      throw new Error("DAILY_LIMIT_REACHED");
    }

    const updated = plan === "pro" ? baseCount : baseCount + 1;
    transaction.set(
      usageDocRef,
      {
        dateKey: today,
        day: today,
        count: updated,
        plan,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { used: updated, plan };
  });

  setUsageState(usageState.used, usageState.plan);
}

function subscribeUsageState() {
  const usageDocRef = doc(db, "users", currentUser.uid, "usage", "daily");
  unsubscribeUsage = onSnapshot(usageDocRef, (snapshot) => {
    const today = getTodayKey();
    if (!snapshot.exists()) {
      setUsageState(0, "free");
      return;
    }

    const data = snapshot.data();
    const day = data.day || data.dateKey || "";
    const plan = data.plan === "pro" ? "pro" : "free";
    const count = day === today && typeof data.count === "number" ? data.count : 0;
    setUsageState(count, plan);
  });
}

function listenToActiveChatMessages(chatId) {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  const messagesRef = collection(
    db,
    "users",
    currentUser.uid,
    "chats",
    chatId,
    "messages"
  );
  const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    chatArea.innerHTML = "";
    activeChatMessages = [];
    snapshot.forEach((msgDoc) => {
      const data = msgDoc.data();
      if (data.role && data.text) {
        activeChatMessages.push({ role: data.role, text: data.text });
        renderMessage(data.role, data.text);
      }
    });
    if (!snapshot.size) {
      renderMessage("assistant", "Welcome to AF AI Chat. Ask anything to begin.");
    }
  });
}

function setActiveChat(chatId) {
  activeChatId = chatId;
  renderHistory();
  listenToActiveChatMessages(chatId);
}

async function sendMessageToActiveChat(role, text) {
  if (!currentUser || !activeChatId) {
    return;
  }
  const chatDocRef = doc(db, "users", currentUser.uid, "chats", activeChatId);
  const messagesRef = collection(
    db,
    "users",
    currentUser.uid,
    "chats",
    activeChatId,
    "messages"
  );
  await addDoc(messagesRef, {
    role,
    text,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    chatDocRef,
    {
    lastMessage: text,
    lastRole: role,
    updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function askAiAndPersist(userText) {
  showTypingIndicator();
  disableInputTemporarily(true);
  try {
    const reply = await generateAiReply({
      userMessage: userText,
      history: activeChatMessages.slice(-12),
    });
    await sendMessageToActiveChat("assistant", reply);
  } catch (error) {
    const safeMessage = error?.message || "AI request failed.";
    await sendMessageToActiveChat("assistant", `Error: ${safeMessage}`);
  } finally {
    disableInputTemporarily(false);
    hideTypingIndicator();
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (geminiBlocked) {
    openGeminiModal();
    return;
  }
  if (usageBlocked) {
    return;
  }
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }
  disableInputTemporarily(true);
  try {
    await incrementUsageOrThrow();
  } catch (error) {
    disableInputTemporarily(false);
    if (error?.message === "DAILY_LIMIT_REACHED") {
      setUsageState(FREE_DAILY_LIMIT, currentPlan);
      renderMessage(
        "assistant",
        "Free daily limit reached (20/20). Upgrade to Pro for unlimited messages."
      );
      return;
    }
    renderMessage("assistant", "Could not update usage right now. Please retry.");
    return;
  }

  await sendMessageToActiveChat("user", text);
  messageInput.value = "";
  autoGrowInput();
  await askAiAndPersist(text);
  disableInputTemporarily(false);
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

messageInput.addEventListener("input", autoGrowInput);

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

newChatBtn.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  const nextChatNumber = localChats.length + 1;
  createChatAndActivate(`New chat ${nextChatNumber}`).catch((error) => {
    console.error("Failed to create chat:", error);
  });
});

chatHistory.addEventListener("click", (event) => {
  const item = event.target.closest(".chat-history-item");
  if (!item) {
    return;
  }
  setActiveChat(item.dataset.chatId);
  if (window.innerWidth <= 900) {
    sidebar.classList.remove("open");
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    sidebar.classList.remove("open");
  }
});

logoutBtn.addEventListener("click", async () => {
  await logoutCurrentUser();
});

upgradeBtn.addEventListener("click", () => {
  renderMessage(
    "assistant",
    "Upgrade to Pro is a placeholder for now. Payment integration will come in a later step."
  );
});

geminiSetupBtn?.addEventListener("click", () => openGeminiModal());
geminiBannerBtn?.addEventListener("click", () => openGeminiModal());
geminiModalBackdrop?.addEventListener("click", closeGeminiModal);
geminiModalClose?.addEventListener("click", closeGeminiModal);
geminiSaveBtn?.addEventListener("click", saveGeminiKeyFromModal);
geminiKeyInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveGeminiKeyFromModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && geminiModal && !geminiModal.classList.contains("hidden")) {
    closeGeminiModal();
  }
});

async function createChatAndActivate(title) {
  const chatsRef = collection(db, "users", currentUser.uid, "chats");
  const chatDoc = await addDoc(chatsRef, {
    title,
    lastMessage: "",
    lastRole: "assistant",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  setActiveChat(chatDoc.id);
}

function subscribeToChats() {
  const chatsRef = collection(db, "users", currentUser.uid, "chats");
  const chatsQuery = query(chatsRef, orderBy("updatedAt", "desc"), limit(50));

  unsubscribeChats = onSnapshot(chatsQuery, async (snapshot) => {
    localChats = snapshot.docs.map((chatDoc) => ({
      id: chatDoc.id,
      title: chatDoc.data().title || "Untitled chat",
      lastMessage: chatDoc.data().lastMessage || "",
      lastRole: chatDoc.data().lastRole || "assistant",
    }));

    renderHistory();

    if (!localChats.length) {
      await createChatAndActivate("Welcome chat");
      return;
    }

    const hasActive = localChats.some((chat) => chat.id === activeChatId);
    if (!activeChatId || !hasActive) {
      setActiveChat(localChats[0].id);
    }
  });
}

async function initializeFirstChatIfNeeded() {
  if (!localChats.length) {
    await createChatAndActivate("Welcome chat");
  }
}

syncGeminiUi();

requireAuthForChat().then((user) => {
  if (!isFirebaseConfigured() || !db) {
    chatArea.innerHTML = "";
    renderMessage(
      "assistant",
      "Firebase is not configured. Deploy this site to Firebase Hosting (auto-loads config), or paste your Firebase web app keys into firebase.js and refresh."
    );
    disableInputTemporarily(true);
    messageInput.placeholder = "Configure Firebase to chat…";
    return;
  }
  if (!user) {
    return;
  }
  currentUser = user;
  syncGeminiUi();
  subscribeToChats();
  subscribeUsageState();
  Promise.resolve(initializeFirstChatIfNeeded())
    .catch((error) => {
      console.error("Initialization failed:", error);
      chatArea.innerHTML = "";
      renderMessage("assistant", "Failed to initialize chat. Please refresh.");
    });
});

window.addEventListener("beforeunload", () => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
  }
  if (unsubscribeChats) {
    unsubscribeChats();
  }
  if (unsubscribeUsage) {
    unsubscribeUsage();
  }
});
