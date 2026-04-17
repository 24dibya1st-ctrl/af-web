import { requireAuthForChat, logoutCurrentUser } from "./auth.js";
import { db } from "./firebase.js";
import { generateAiReply } from "./ai.js";
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
  updateDoc,
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
const usageCounter = document.getElementById("usageCounter");
const upgradeBanner = document.getElementById("upgradeBanner");
const upgradeBtn = document.getElementById("upgradeBtn");

let currentUser = null;
let activeChatId = null;
let unsubscribeMessages = null;
let unsubscribeChats = null;
let localChats = [];
const FREE_DAILY_LIMIT = 20;
let todaysUsage = 0;
let usageBlocked = false;
let activeChatMessages = [];

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

function setUsageState(used) {
  todaysUsage = used;
  usageBlocked = todaysUsage >= FREE_DAILY_LIMIT;
  usageCounter.textContent = `${Math.min(todaysUsage, FREE_DAILY_LIMIT)}/${FREE_DAILY_LIMIT} free messages today`;
  messageInput.disabled = usageBlocked;
  sendBtn.disabled = usageBlocked;
  upgradeBanner.classList.toggle("hidden", !usageBlocked);
}

function disableInputTemporarily(disabled) {
  messageInput.disabled = disabled || usageBlocked;
  sendBtn.disabled = disabled || usageBlocked;
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

  const nextUsage = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(usageDocRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const currentDay = data.day || "";
    const currentCount = typeof data.count === "number" ? data.count : 0;
    const baseCount = currentDay === today ? currentCount : 0;

    if (baseCount >= FREE_DAILY_LIMIT) {
      throw new Error("DAILY_LIMIT_REACHED");
    }

    const updated = baseCount + 1;
    transaction.set(
      usageDocRef,
      {
        day: today,
        count: updated,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return updated;
  });

  setUsageState(nextUsage);
}

async function loadUsageState() {
  const usageRef = collection(db, "users", currentUser.uid, "usage");
  const usageQuery = query(usageRef, limit(10));
  const usageSnapshot = await getDocs(usageQuery);
  const today = getTodayKey();
  let used = 0;

  usageSnapshot.forEach((docSnap) => {
    if (docSnap.id !== "daily") {
      return;
    }
    const data = docSnap.data();
    if (data.day === today && typeof data.count === "number") {
      used = data.count;
    }
  });

  setUsageState(used);
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
  await updateDoc(chatDocRef, {
    lastMessage: text,
    lastRole: role,
    updatedAt: serverTimestamp(),
  });
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
      setUsageState(FREE_DAILY_LIMIT);
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
  const chatsRef = collection(db, "users", currentUser.uid, "chats");
  const chatsQuery = query(chatsRef, limit(1));
  const snapshotPromise = new Promise((resolve) => {
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      unsubscribe();
      resolve(snapshot);
    });
  });
  const snapshot = await snapshotPromise;
  if (!snapshot.size) {
    await createChatAndActivate("Welcome chat");
  }
}

requireAuthForChat().then((user) => {
  if (!user) {
    return;
  }
  currentUser = user;
  Promise.all([initializeFirstChatIfNeeded(), loadUsageState()])
    .then(() => {
      subscribeToChats();
    })
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
});
