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

  // 1. Match custom All-In-One Light Event Card syntax: [EVENT_CARD:id|title|type|status|time|location|desc]
  safe = safe.replace(/\[EVENT_CARD:([^|]+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]/g,
    (match, id, title, type, status, time, location, desc) => {
      const cleanId = id.trim();
      const cleanTitle = title.trim() || "Sự kiện";
      const cleanType = type.trim() || "Event";
      const cleanStatus = status.trim() || "ĐANG DIỄN RA";
      const cleanTime = time.trim() || "";
      const cleanLocation = location.trim() || "";
      const cleanDesc = desc.trim() || "";

      const isOngoing = cleanStatus.toUpperCase().includes("ĐANG") || cleanStatus.toUpperCase().includes("ONGOING");

      return `<div class="chatbot-event-card border border-slate-200 bg-white rounded-xl p-3 my-2 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group text-left" data-event-id="${cleanId}">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            <i class="fa-solid fa-tag text-[9px]"></i> ${cleanType}
          </span>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isOngoing ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}">
            <span class="w-1.5 h-1.5 rounded-full ${isOngoing ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span> ${cleanStatus}
          </span>
        </div>

        <h4 class="font-bold text-xs text-slate-800 group-hover:text-primary transition-colors mb-1.5 line-clamp-1">
          ${cleanTitle}
        </h4>

        <div class="space-y-1 text-[11px] text-slate-600 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
          ${cleanTime ? `<div class="flex items-center gap-1.5"><i class="fa-regular fa-clock text-blue-500 shrink-0 text-[11px]"></i><span class="font-medium text-slate-700 truncate">${cleanTime}</span></div>` : ''}
          ${cleanLocation ? `<div class="flex items-start gap-1.5"><i class="fa-solid fa-location-dot text-rose-500 shrink-0 text-[11px] mt-0.5"></i><span class="line-clamp-1 text-slate-600">${cleanLocation}</span></div>` : ''}
          ${cleanDesc ? `<div class="flex items-start gap-1.5 pt-1 border-t border-slate-200/60 mt-1"><i class="fa-regular fa-file-lines text-slate-400 shrink-0 text-[11px] mt-0.5"></i><span class="line-clamp-1 text-slate-500 italic">${cleanDesc}</span></div>` : ''}
        </div>

        <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] font-bold text-primary group-hover:text-primary-dark">
          <span class="flex items-center gap-1">
            <i class="fa-solid fa-circle-info text-[10px]"></i> ${viewText}
          </span>
          <i class="fa-solid fa-arrow-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
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
        return `<div class="chatbot-event-card border border-slate-200 bg-white rounded-xl p-2.5 my-2 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group flex items-center justify-between gap-2 text-left" data-event-id="${eventId}">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <i class="fa-solid fa-calendar-check text-xs"></i>
            </div>
            <div class="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors line-clamp-1">${label}</div>
          </div>
          <span class="inline-flex items-center gap-1 text-[11px] font-bold text-primary shrink-0">
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
