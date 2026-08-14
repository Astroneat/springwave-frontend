import { isAuthenticated, getUser } from "../lib/session.js";
import { sendChatMessage, fetchChatHistory, clearChatHistory } from "../api/chatbot.js";
import { t, applyTranslation } from "../lib/i18n.js";
import { openEventPopup } from "./eventPopup.js";
import { formatDate } from "../lib/utils.js";
import { CDN_DOMAIN } from "../config.js";

const HISTORY_KEY = "springwave_chat_history";
const MAX_HISTORY = 50;

let isOpen = false;
let conversationHistory = [];

function formatCardDate(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    try {
      return formatDate(dateStr);
    } catch {
      return dateStr;
    }
  }
  return dateStr;
}

function renderEventCardFromJSON(data) {
  const cleanId = escapeHtml(String(data.id || data.eventId || "").trim());
  if (!cleanId) return "";

  const cleanTitle = escapeHtml(String(data.title || data.name || "Sự kiện").trim());
  const cleanType = escapeHtml(String(data.type || data.category || "Sự kiện").trim());
  const cleanStatus = escapeHtml(String(data.status || "ĐANG DIỄN RA").trim());
  
  const rawTime = data.time || data.heldDate || data.startDate || "";
  const cleanTime = escapeHtml(formatCardDate(rawTime));
  
  const rawDeadline = data.deadline || data.applicationDeadline || data.regDeadline || "";
  const cleanDeadline = escapeHtml(formatCardDate(rawDeadline));
  
  const cleanLocation = escapeHtml(String(data.location || data.address || "").trim());

  const statusUpper = cleanStatus.toUpperCase();
  let statusBadgeClass = "status-ended";
  if (statusUpper.includes("ĐANG") || statusUpper.includes("ONGOING")) {
    statusBadgeClass = "status-ongoing";
  } else if (statusUpper.includes("SẮP") || statusUpper.includes("UPCOMING")) {
    statusBadgeClass = "status-upcoming";
  }

  const html = `
  <div class="chatbot-event-card" data-event-id="${cleanId}">
    <div class="chatbot-event-card-content">
      <div class="chatbot-event-card-badges-row">
        <span class="chatbot-pill-type"><i class="fa-solid fa-tag"></i> ${cleanType}</span>
        <span class="chatbot-pill-status ${statusBadgeClass}">${cleanStatus}</span>
      </div>
      <h4 class="chatbot-event-card-title">${cleanTitle}</h4>
      <div class="chatbot-info-box">
        ${cleanTime ? `
          <div class="info-row">
            <i class="fa-regular fa-calendar info-icon text-blue-500"></i>
            <span class="info-value"><strong>Bắt đầu:</strong> ${cleanTime}</span>
          </div>` : ''}
        ${cleanDeadline ? `
          <div class="info-row">
            <i class="fa-regular fa-clock info-icon text-amber-500"></i>
            <span class="info-value"><strong class="text-amber-600">Hạn ĐK:</strong> ${cleanDeadline}</span>
          </div>` : ''}
        ${cleanLocation ? `
          <div class="info-row">
            <i class="fa-solid fa-location-dot info-icon text-red-500"></i>
            <span class="info-value"><strong>Địa điểm:</strong> ${cleanLocation}</span>
          </div>` : ''}
      </div>
      <button type="button" data-event-id="${cleanId}" class="chat-event-btn-blue">
        <span><i class="fa-solid fa-eye"></i> ${t("cards.view_details", {}, "Xem chi tiết")}</span>
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  </div>`;
  return html.replace(/\n/g, " ");
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

  // 1. Match custom All-In-One Light Event Card syntax: [EVENT_CARD:id|title|type|status|time|location|desc]
  safe = safe.replace(/\[EVENT_CARD:([^|]+)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]/g,
    (match, id, title, type, status, time, location, desc) => {
      const cleanId = id.trim();
      const cleanTitle = title.trim() || "Sự kiện";
      const cleanType = type.trim() || "Event";
      const cleanStatus = status.trim() || "ĐANG DIỄN RA";
      const cleanTime = time.trim() || "";
      const cleanLocation = location.trim() || "";

      const placeholder = `___EVENT_CARD_TOKEN_${cardIndex++}___`;
      cardsMap[placeholder] = renderEventCardFromJSON({ id: cleanId, title: cleanTitle, type: cleanType, status: cleanStatus, time: cleanTime, location: cleanLocation });
      return placeholder;
    }
  );

  // 2. Replace Markdown links with event ID: [label](/explore.html?id=xxx)
  safe = safe.replace(/(?:👉\s*)?\[([^\]]+)\]\(([^)]+)\)\s*(?:[-─➔➜➔→>]*)/gi, (match, label, url) => {
    const eventIdMatch = url.match(/[?&]id=([a-f0-9]{24})/i);
    if (eventIdMatch) {
      const eventId = eventIdMatch[1];
      let cleanLabel = label.replace(/^👉\s*/, '').replace(/\s*[-─➔➜➔→>]+$/, '').trim();
      if (!cleanLabel || cleanLabel.toLowerCase().includes('details') || cleanLabel.toLowerCase().includes('chi tiết')) {
        cleanLabel = "Xem chi tiết sự kiện";
      }
      const placeholder = `___EVENT_BTN_TOKEN_${cardIndex++}___`;
      cardsMap[placeholder] = `<button type="button" data-event-id="${eventId}" class="chat-event-btn-action"><span><i class="fa-solid fa-eye"></i> ${escapeHtml(cleanLabel)}</span><i class="fa-solid fa-arrow-right"></i></button>`;
      return placeholder;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary font-medium underline hover:text-primary-dark">${label}</a>`;
  });

  // 3. Handle plain text "View Details ->" or "Xem chi tiết ->" when NOT inside a markdown link
  safe = safe.replace(/(?:👉\s*)?(View Details|Xem chi tiết sự kiện|Xem chi tiết)\s*(?:[-─➔➜➔→>]+)?/gi, (match, textLabel) => {
    const cleanLabel = textLabel.trim() || "Xem chi tiết sự kiện";
    const placeholder = `___EVENT_BTN_TOKEN_${cardIndex++}___`;
    cardsMap[placeholder] = `<button type="button" class="chat-event-btn-action" onclick="const card=this.closest('.message-content').querySelector('[data-event-id]'); if(card) openEventPopup(card.dataset.eventId);"><span><i class="fa-solid fa-eye"></i> ${escapeHtml(cleanLabel)}</span><i class="fa-solid fa-arrow-right"></i></button>`;
    return placeholder;
  });

  // Clean up orphan trailing arrow lines like "->" or "→" or "➔"
  safe = safe.replace(/^(?:[-─➔➜➔→>]|\s)+$/gm, "");

  // Bold text **text**
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Bullet points * item or - item
  safe = safe.replace(/^[\*\-]\s+(.+)$/gm, "• $1");

  // Newlines -> <br>
  safe = safe.replace(/\n/g, "<br>");

  // Re-inject rendered event cards & button tokens cleanly
  Object.keys(cardsMap).forEach(token => {
    safe = safe.replace(token, cardsMap[token]);
  });

  // Clean multiple consecutive <br>
  safe = safe.replace(/(<br>\s*){3,}/gi, "<br><br>");

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

function loadHistoryFromStorage() {
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

function saveHistoryToStorage() {
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

  conversationHistory = loadHistoryFromStorage();

  document.getElementById("chatbot-bubble").addEventListener("click", toggleChat);
  document.getElementById("chatbot-close").addEventListener("click", closeChat);
  document.getElementById("chatbot-send").addEventListener("click", sendMessage);

  const clearBtn = document.getElementById("chatbot-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", handleClearHistory);
  }

  const suggestionsContainer = document.getElementById("chatbot-suggestions");
  if (suggestionsContainer) {
    suggestionsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-suggest]");
      if (btn && btn.dataset.suggest) {
        const input = document.getElementById("chatbot-input");
        if (input) {
          input.value = btn.dataset.suggest;
          sendMessage();
        }
      }
    });
  }

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

  // If authenticated, sync history from MongoDB backend with Skeleton Loading
  if (isAuthenticated()) {
    const skeleton = document.getElementById("chatbot-skeleton");
    if (skeleton) skeleton.classList.remove("hidden");
    try {
      const data = await fetchChatHistory();
      if (data && Array.isArray(data.history)) {
        conversationHistory = data.history;
        saveHistoryToStorage();
      }
    } catch (err) {
      console.warn("Failed to fetch chat history from DB:", err);
    } finally {
      if (skeleton) skeleton.classList.add("hidden");
      restoreMessages();
    }
  }

  window.addEventListener("language-changed", () => {
    const c = document.getElementById("chatbot-container");
    if (c) applyTranslation(c);
    restoreMessages();
  });

  window.addEventListener("beforeunload", () => saveHistoryToStorage());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveHistoryToStorage();
  });
}

async function handleClearHistory() {
  conversationHistory = [];
  try {
    localStorage.removeItem(HISTORY_KEY);
    if (isAuthenticated()) {
      await clearChatHistory();
    }
  } catch (err) {
    console.error("Error clearing chat history:", err);
  }
  restoreMessages();
}

function restoreMessages() {
  const container = document.getElementById("chatbot-messages");
  if (!container) return;

  const skeleton = document.getElementById("chatbot-skeleton");
  container.innerHTML = "";
  if (skeleton) container.appendChild(skeleton);

  const defaultGreeting = document.createElement("div");
  defaultGreeting.className = "message bot";
  defaultGreeting.innerHTML = `<div class="message-content" data-i18n="chatbot.greeting">${t("chatbot.greeting", {}, "Xin chào! Tôi là Trợ lý AI SpringWave. Bạn cần tìm kiếm sự kiện hay tư vấn thông tin gì hôm nay?")}</div>`;

  if (conversationHistory.length === 0) {
    container.appendChild(defaultGreeting);
    toggleSuggestions(true);
    return;
  }

  conversationHistory.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role === "assistant" ? "bot" : msg.role}`;
    div.innerHTML = `<div class="message-content">${msg.role === "assistant" ? formatMessageContent(msg.content) : escapeHtml(msg.content)}</div>`;
    container.appendChild(div);
  });
  bindMessageClicks();
  toggleSuggestions(false);
  container.scrollTop = container.scrollHeight;
}

function toggleSuggestions(show) {
  const sug = document.getElementById("chatbot-suggestions");
  if (sug) {
    sug.style.display = show ? "flex" : "none";
  }
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

  toggleSuggestions(false);
  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
  saveHistoryToStorage();

  if (!isAuthenticated()) {
    addMessage("assistant", t("chatbot.login_required"));
    saveHistoryToStorage();
    return;
  }

  const msgEl = addMessage("assistant", "");
  msgEl.classList.add("typing");
  msgEl.querySelector(".message-content").innerHTML =
    "<span></span><span></span><span></span>";

  try {
    const data = await sendChatMessage(text);
    msgEl.classList.remove("typing");
    msgEl.querySelector(".message-content").innerHTML = formatMessageContent(data.reply);
    
    if (data.history && Array.isArray(data.history)) {
      conversationHistory = data.history;
    } else {
      conversationHistory.push({ role: "assistant", content: data.reply });
    }
    saveHistoryToStorage();
  } catch (err) {
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
