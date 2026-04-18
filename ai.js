const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

let devGeminiKey = "";
let devGeminiModel = "";

try {
  const secrets = await import("./secrets.js");
  if (secrets.GEMINI_API_KEY_DEV?.trim()) {
    devGeminiKey = secrets.GEMINI_API_KEY_DEV.trim();
  }
  if (secrets.GEMINI_MODEL_OVERRIDE?.trim()) {
    devGeminiModel = secrets.GEMINI_MODEL_OVERRIDE.trim();
  }
} catch {
  /* secrets.js optional — local dev only */
}

function getEffectiveModel() {
  return devGeminiModel || DEFAULT_GEMINI_MODEL;
}

function getGeminiApiKey() {
  const fromStorage = localStorage.getItem("GEMINI_API_KEY")?.trim() || "";
  if (fromStorage) {
    return fromStorage;
  }
  return devGeminiKey;
}

function setGeminiApiKey(apiKey) {
  localStorage.setItem("GEMINI_API_KEY", apiKey.trim());
}

function getPromptInstruction() {
  return "You are a helpful AI assistant. Give clear, useful, and simple answers.";
}

async function generateAiReply({ userMessage, history = [] }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini API key. Use the AI key button or add secrets.js locally.");
  }

  const model = getEffectiveModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const historyText = history
    .map((entry) => `${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.text}`)
    .join("\n");

  const prompt = `${getPromptInstruction()}

Conversation history:
${historyText || "No previous messages."}

Latest user message:
${userMessage}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed: ${errorText}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "I could not generate a response.";
  return text;
}

export { generateAiReply, getGeminiApiKey, setGeminiApiKey };
