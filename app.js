import { onAuthStateChangedSafe, signOutSafe } from "./auth.js";

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const newChatBtn = document.getElementById("newChatBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatHistory = document.getElementById("chatHistory");
const chatArea = document.getElementById("chatArea");
const typingIndicator = document.getElementById("typingIndicator");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

let activeChatId = "chat-1";
let chatCounter = 3;
let aiTimer = null;

const chats = [
  { id: "chat-1", title: "Welcome chat" },
  { id: "chat-2", title: "Product ideas" },
  { id: "chat-3", title: "Support draft" },
];

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

function createMessage(role, text) {
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
  chats.forEach((chat) => {
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

function setActiveChat(chatId) {
  activeChatId = chatId;
  renderHistory();
  chatArea.innerHTML = "";
  createMessage("assistant", `Switched to ${chatId}. Start chatting.`);
}

function mockAssistantReply(userText) {
  if (aiTimer) {
    clearTimeout(aiTimer);
  }
  showTypingIndicator();
  aiTimer = setTimeout(() => {
    hideTypingIndicator();
    createMessage("assistant", `You said: "${userText}"\n\nThis is a UI-only demo reply.`);
    aiTimer = null;
  }, 900);
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }
  createMessage("user", text);
  messageInput.value = "";
  autoGrowInput();
  mockAssistantReply(text);
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
  chatCounter += 1;
  const chatId = `chat-${chatCounter}`;
  chats.unshift({ id: chatId, title: `New chat ${chatCounter}` });
  setActiveChat(chatId);
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
  await signOutSafe();
});

onAuthStateChangedSafe((user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

renderHistory();
createMessage("assistant", "Welcome to AF AI Chat. Ask anything to begin.");
