import { isAuthenticated, getUser } from "../lib/session.js";
import { sendChatMessage } from "../api/chatbot.js";
import { t, applyTranslation } from "../lib/i18n.js";
import { openEventPopup } from "./eventPopup.js";

const HISTORY_KEY = "springwave_chat_history";
const MAX_HISTORY = 50;

let isOpen = false;
let conversationHistory = [];

function formatMessageContent(text) {
  if (!text) return "";
  let safe = escapeHtml(text);

  const clickToViewText = t("chatbot.click_to_view", {}, "Nhấn để xem chi tiết & đăng ký");
  const viewText = t("cards.view_details", {}, "Xem chi tiết");

  // 0. Parse structured JSON event blocks: ```json:event ... ``` or ```json ... ``` containing event data
  safe = safe.replace(/```json(?::event)?\s*([\s\S]*?)\s*```/gi, (match, jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data && (data.id || data.eventId)) {
        const cleanId = (data.id || data.eventId).trim();
        const cleanTitle = (data.title || data.name || "Sự kiện").trim();
        const cleanType = (data.type || data.category || "Event").trim();
        const cleanStatus = (data.status || "ĐANG DIỄN RA").trim();

        const isOngoing = cleanStatus.toUpperCase().includes("ĐANG") || cleanStatus.toUpperCase().includes("ONGOING");

        return `<div class="chatbot-mini-card group" data-event-id="${cleanId}">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <div class="w-6 h-6 rounded-md bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 text-[10px]">
              <i class="fa-solid fa-calendar-star"></i>
            </div>
            <span class="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600">${cleanTitle}</span>
            <span class="chatbot-pill-type">${cleanType}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="chatbot-pill-status ${isOngoing ? 'chatbot-pill-ongoing' : 'chatbot-pill-upcoming'}">${cleanStatus}</span>
            <i class="fa-solid fa-chevron-right text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
          </div>
        </div>`;
      }
    } catch (err) {
      console.warn("Error parsing JSON event block in chatbot:", err);
    }
    return match;
  });

  // 1. Match custom All-In-One Light Event Card syntax: [EVENT_CARD:id|title|type|status|time|location|desc]
  safe = safe.replace(/\[EVENT_CARD:([^|]+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]/g,
    (match, id, title, type, status, time, location, desc) => {
      const cleanId = id.trim();
      const cleanTitle = title.trim() || "Sự kiện";
      const cleanType = type.trim() || "Event";
      const cleanStatus = status.trim() || "ĐANG DIỄN RA";

      const isOngoing = cleanStatus.toUpperCase().includes("ĐANG") || cleanStatus.toUpperCase().includes("ONGOING");

      return `<div class="chatbot-mini-card group" data-event-id="${cleanId}">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <div class="w-6 h-6 rounded-md bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 text-[10px]">
            <i class="fa-solid fa-calendar-star"></i>
          </div>
          <span class="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600">${cleanTitle}</span>
          <span class="chatbot-pill-type">${cleanType}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="chatbot-pill-status ${isOngoing ? 'chatbot-pill-ongoing' : 'chatbot-pill-upcoming'}">${cleanStatus}</span>
          <i class="fa-solid fa-chevron-right text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
        </div>
      </div>`;
    }
  );

  // 2. Replace Markdown links: [label](/explore.html?id=xxx) or [label](url)
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const eventIdMatch = url.match(/[?&]id=([a-f0-9]{24})/i);
    if (eventIdMatch) {
      const eventId = eventIdMatch[1];
      if (label.includes("Xem chi tiết") || label.includes("sự kiện") || label.includes("View") || label.includes("event")) {
        return `<div class="chatbot-mini-card group" data-event-id="${eventId}">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <div class="w-6 h-6 rounded-md bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 text-[10px]">
              <i class="fa-solid fa-calendar-star"></i>
            </div>
            <span class="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600">${label}</span>
          </div>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 shrink-0">
            ${viewText} <i class="fa-solid fa-chevron-right text-[9px]"></i>
          </span>
        </div>`;
      }
      return `<button type="button" data-event-id="${eventId}" class="chat-event-btn inline-flex items-center gap-1.5 px-2.5 py-1 my-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-all border border-primary/20 shadow-sm cursor-pointer"><i class="fa-solid fa-calendar-check text-xs"></i> ${label}</button>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary font-medium underline hover:text-primary-dark">${label}</a>`;
  });

  // Bold text **text**
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Bullet points * item or - item
  safe = safe.replace(/^[\*\-]\s+(.+)$/gm, "• $1");

  // Newlines -> <br>
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

function bindMessageClicks() {
  const container = document.getElementById("chatbot-messages");
  if (container && !container.dataset.boundClicks) {
    container.addEventListener("click", (e) => {
      const card = e.target.closest("[data-event-id]");
      if (card && card.dataset.eventId) {
        openEventPopup(card.dataset.eventId);
      }
    });
    container.dataset.boundClicks = "true";
  }
}

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
  applyTranslation(container);

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
  bindMessageClicks();

  window.addEventListener("language-changed", () => {
    const c = document.getElementById("chatbot-container");
    if (c) applyTranslation(c);
    restoreMessages();
  });

  window.addEventListener("beforeunload", () => saveHistory());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveHistory();
  });
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
    div.className = `message ${msg.role === "assistant" ? "bot" : msg.role}`;
    div.innerHTML = `<div class="message-content">${msg.role === "assistant" ? formatMessageContent(msg.content) : escapeHtml(msg.content)}</div>`;
    container.appendChild(div);
  });
  bindMessageClicks();
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
    msgEl.querySelector(".message-content").innerHTML = formatMessageContent(data.reply);
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
  div.className = `message ${role === "assistant" ? "bot" : role}`;
  const formatted = role === "assistant" ? formatMessageContent(content) : escapeHtml(typeof content === 'string' ? content : '');
  div.innerHTML = `<div class="message-content">${formatted}</div>`;
  container.appendChild(div);
  bindMessageClicks();
  container.scrollTop = container.scrollHeight;

  if (content) {
    conversationHistory.push({ role, content });
  }
  return div;
}
