import { isAuthenticated } from "../lib/session.js";
import { sendChatMessage } from "../api/chatbot.js";
import { t } from "../lib/i18n.js";

let isOpen = false;
let conversationHistory = [];

export async function initChatbot() {
  const container = document.getElementById("chatbot-container");
  if (!container) return;

  const resp = await fetch("./components/chatbot.html");
  const html = await resp.text();
  container.innerHTML = html;

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
}

function toggleChat() {
  isOpen = !isOpen;
  document.getElementById("chatbot-widget").classList.toggle("open", isOpen);
  if (isOpen) {
    document.getElementById("chatbot-input").focus();
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

  if (!isAuthenticated()) {
    addMessage("bot", t("chatbot.login_required"));
    return;
  }

  const msgEl = addMessage("bot", "");
  msgEl.classList.add("typing");
  msgEl.querySelector(".message-content").innerHTML =
    "<span></span><span></span><span></span>";

  try {
    const data = await sendChatMessage(text, conversationHistory);
    msgEl.classList.remove("typing");
    msgEl.querySelector(".message-content").textContent = data.reply;
    conversationHistory.push({ role: "assistant", content: data.reply });
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
  div.innerHTML = `<div class="message-content">${content}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  if (role === "user") {
    conversationHistory.push({ role: "user", content });
  }
  return div;
}
