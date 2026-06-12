import { isAuthenticated, getUser } from "../lib/session.js";
import { sendChatMessage } from "../api/chatbot.js";
import { t } from "../lib/i18n.js";

const HISTORY_KEY = "springwave_chat_history";
const MAX_HISTORY = 50;

let isOpen = false;
let conversationHistory = [];

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_HISTORY);
      }
    }
  } catch {}
  return [];
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(conversationHistory.slice(-MAX_HISTORY)));
  } catch {}
}

export async function initChatbot() {
  const container = document.getElementById("chatbot-container");
  if (!container) return;

  const resp = await fetch("./components/chatbot.html");
  const html = await resp.text();
  container.innerHTML = html;

  conversationHistory = loadHistory();

  document.getElementById("chatbot-bubble").addEventListener("click", toggleChat);
  document.getElementById("chatbot-close").addEventListener("click", closeChat);
  document.getElementById("chatbot-send").addEventListener("click", sendMessage);

  const input = document.getElementById("chatbot-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  restoreMessages();

  window.addEventListener("beforeunload", () => saveHistory());
}

function restoreMessages() {
  const container = document.getElementById("chatbot-messages");
  if (!container) return;

  const greeting = container.querySelector(".message.bot");
  container.innerHTML = "";

  if (conversationHistory.length === 0) {
    container.appendChild(greeting);
    return;
  }

  conversationHistory.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;
    div.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function toggleChat() {
  isOpen = !isOpen;
  document.getElementById("chatbot-widget").classList.toggle("open", isOpen);
  if (isOpen) {
    document.getElementById("chatbot-input").focus();
    const container = document.getElementById("chatbot-messages");
    container.scrollTop = container.scrollHeight;
  }
}

function closeChat() {
  isOpen = false;
  document.getElementById("chatbot-widget").classList.remove("open");
}

async function sendMessage() {
  const input = document.getElementById("chatbot-input");
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  saveHistory();

  if (!isAuthenticated()) {
    addMessage("assistant", t("chatbot.login_required"));
    saveHistory();
    return;
  }

  const msgEl = addMessage("assistant", "");
  msgEl.classList.add("typing");
  msgEl.querySelector(".message-content").innerHTML =
    "<span></span><span></span><span></span>";

  try {
    const data = await sendChatMessage(text, conversationHistory);
    msgEl.classList.remove("typing");
    msgEl.querySelector(".message-content").textContent = data.reply;
    conversationHistory.push({ role: "assistant", content: data.reply });
    saveHistory();
  } catch {
    msgEl.classList.remove("typing");
    msgEl.querySelector(".message-content").textContent = t("chatbot.error");
  }

  document.getElementById("chatbot-messages").scrollTop =
    document.getElementById("chatbot-messages").scrollHeight;
}

function addMessage(role, content) {
  const container = document.getElementById("chatbot-messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `<div class="message-content">${escapeHtml(typeof content === 'string' ? content : '')}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  if (content) {
    conversationHistory.push({ role, content });
  }
  return div;
}
