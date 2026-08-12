import { isAuthenticated, getUser } from "../lib/session.js";
import { sendChatMessage } from "../api/chatbot.js";
import { t, applyTranslation } from "../lib/i18n.js";
import { openEventPopup } from "./eventPopup.js";

const HISTORY_KEY = "springwave_chat_history";
const MAX_HISTORY = 50;

let isOpen = false;
let conversationHistory = [];

function renderEventCardFromJSON(data) {
  const cleanId = escapeHtml(String(data.id || data.eventId || "").trim());
  if (!cleanId) return "";

  const cleanTitle = escapeHtml(String(data.title || data.name || "Sự kiện").trim());
  const cleanType = escapeHtml(String(data.type || data.category || "Sự kiện").trim());
  const cleanStatus = escapeHtml(String(data.status || "ĐÃ KẾT THÚC").trim());
  const cleanTime = escapeHtml(String(data.time || data.heldDate || "").trim());
  const cleanLocation = escapeHtml(String(data.location || "").trim());

  const statusUpper = cleanStatus.toUpperCase();
  let statusBadgeClass = "status-ended";
  if (statusUpper.includes("ĐANG") || statusUpper.includes("ONGOING")) {
    statusBadgeClass = "status-ongoing";
  } else if (statusUpper.includes("SẮP") || statusUpper.includes("UPCOMING")) {
    statusBadgeClass = "status-upcoming";
  }

  return `<div class="chatbot-event-card" data-event-id="${cleanId}">
    <div class="chatbot-event-card-badges">
      <span class="chatbot-pill-type"><i class="fa-solid fa-tag" style="font-size:8px;"></i> ${cleanType}</span>
      <span class="chatbot-pill-status ${statusBadgeClass}">${cleanStatus}</span>
    </div>
    <h4 class="chatbot-event-card-title">${cleanTitle}</h4>
    ${(cleanTime || cleanLocation) ? `<div class="chatbot-info-box">
      ${cleanTime ? `<div class="info-row"><i class="fa-regular fa-clock info-icon" style="color:#3b82f6;"></i><span>${cleanTime}</span></div>` : ''}
      ${cleanLocation ? `<div class="info-row"><i class="fa-solid fa-location-dot info-icon" style="color:#ef4444;"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${cleanLocation}</span></div>` : ''}
    </div>` : ''}
    <button type="button" data-event-id="${cleanId}" class="chat-event-btn-blue">
      <span>Xem chi tiết</span>
      <i class="fa-solid fa-arrow-right" style="font-size:9px;"></i>
    </button>
  </div>`;
}

function formatMessageContent(text) {
  if (!text) return "";

  const cardsMap = {};
  let cardIndex = 0;

  // 0. Extract ```json:event ... ``` or ```json ... ``` blocks BEFORE HTML escaping
  let rawProcessed = text.replace(/```json(?::event)?\s*([\s\S]*?)\s*```/gi, (match, jsonString) => {
    try {
      const decodedJson = jsonString.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const data = JSON.parse(decodedJson.trim());
      if (data && (data.id || data.eventId)) {
        const placeholder = `___EVENT_CARD_TOKEN_${cardIndex++}___`;
        cardsMap[placeholder] = renderEventCardFromJSON(data);
        return placeholder;
      }
    } catch (err) {
      console.warn("Error parsing JSON event block in chatbot:", err);
    }
    return match;
  });

  let safe = escapeHtml(rawProcessed);

  // Re-inject rendered event card HTML
  Object.keys(cardsMap).forEach(token => {
    safe = safe.replace(token, cardsMap[token]);
  });

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

      return renderEventCardFromJSON({ id: cleanId, title: cleanTitle, type: cleanType, status: cleanStatus, time: cleanTime, location: cleanLocation });
    }
  );

  // 2. Replace Markdown links: [label](/explore.html?id=xxx) or [label](url)
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const eventIdMatch = url.match(/[?&]id=([a-f0-9]{24})/i);
    if (eventIdMatch) {
      const eventId = eventIdMatch[1];
      // Render a compact inline link button — never a full card from markdown links
      // (Full cards come from json:event blocks only, to avoid layout inconsistency)
      return `<button type="button" data-event-id="${eventId}" class="chat-event-btn inline-flex items-center gap-1.5 px-3 py-1.5 my-1 text-xs font-bold rounded-lg transition-all cursor-pointer" style="color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;"><i class="fa-solid fa-calendar-check text-xs"></i> ${label}</button>`;
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
