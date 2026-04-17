import { requireAuthForChat, logoutCurrentUser } from "./auth.js";
import { db } from "./firebase.js";
import { getAiReply } from "./ai.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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

let currentUser = null;
let activeChatId = null;
let unsubscribeMessages = null;
let localChats = [];

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
    button.textContent = chat.title;
    chatHistory.appendChild(button);
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
    snapshot.forEach((msgDoc) => {
      const data = msgDoc.data();
      if (data.role && data.text) {
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
}

async function askAiAndPersist(userText) {
  showTypingIndicator();
  try {
    const reply = await getAiReply(userText);
    await sendMessageToActiveChat("assistant", reply);
  } catch (error) {
    const safeMessage = error?.message || "AI request failed.";
    await sendMessageToActiveChat("assistant", `Error: ${safeMessage}`);
  } finally {
    hideTypingIndicator();
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }
  await sendMessageToActiveChat("user", text);
  messageInput.value = "";
  autoGrowInput();
  await askAiAndPersist(text);
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

async function createChatAndActivate(title) {
  const chatsRef = collection(db, "users", currentUser.uid, "chats");
  const chatDoc = await addDoc(chatsRef, {
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  localChats = [{ id: chatDoc.id, title }, ...localChats];
  setActiveChat(chatDoc.id);
}

async function loadOrCreateInitialChats() {
  const chatsRef = collection(db, "users", currentUser.uid, "chats");
  const chatsQuery = query(chatsRef, orderBy("updatedAt", "desc"), limit(20));
  const snapshot = await getDocs(chatsQuery);

  localChats = snapshot.docs.map((chatDoc) => ({
    id: chatDoc.id,
    title: chatDoc.data().title || "Untitled chat",
  }));

  if (!localChats.length) {
    await createChatAndActivate("Welcome chat");
    return;
  }

  setActiveChat(localChats[0].id);
}

requireAuthForChat().then((user) => {
  if (!user) {
    return;
  }
  currentUser = user;
  loadOrCreateInitialChats().catch((error) => {
    console.error("Failed to load chats:", error);
    chatArea.innerHTML = "";
    renderMessage("assistant", "Failed to load chats. Please refresh.");
  });
});
